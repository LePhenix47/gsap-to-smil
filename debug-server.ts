import { appendFile, mkdir, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

const PORT = parseInt(process.env["PORT"] ?? "3456", 10);
const PROJECT_ROOT = import.meta.dirname;
const DEBUG_DIR = join(PROJECT_ROOT, "tests", "debug");

type LogBody = {
  filename: string;
  lines: string[];
};

type ConsoleBody = {
  page: string;
  level: string;
  args: string[];
};

type ConsoleResetBody = {
  page: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Resolves browser pathname → filesystem .console.log path next to the HTML file.
// Handles both HTTP paths (/tests/foo.html) and Windows file:// paths (/C:/path/foo.html).
const resolveConsoleLogPath = (pathname: string): string => {
  const normalized = pathname.replace(/\\/g, "/");

  const windowsMatch = normalized.match(/^(\/[A-Za-z]:\/.*?)(?:\.html)?$/);
  if (windowsMatch) {
    return normalize(windowsMatch[1].slice(1) + ".console.log");
  }

  const relativePath = normalized
    .replace(/\.html$/, "")
    .replace(/\.\./g, "")
    .replace(/^\//, "");

  return join(PROJECT_ROOT, relativePath + ".console.log");
};

const jsonResponse = (
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });

Bun.serve({
  port: PORT,
  hostname: "localhost",

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS });
    }

    if (url.pathname === "/log") {
      try {
        const body: LogBody = await request.json();
        const sanitizedName: string = body.filename.replace(
          /[^a-zA-Z0-9._\-\/]/g,
          "_",
        );
        const filePath: string = join(DEBUG_DIR, `${sanitizedName}.log`);

        const date = new Date();
        console.log(`Writing log to ${filePath} the ${date.toLocaleString("en")}`);

        await mkdir(dirname(filePath), { recursive: true });

        const fileContent = date + "\n".repeat(2) + body.lines.join("\n") + "\n";
        await Bun.write(filePath, fileContent);

        return jsonResponse({ ok: true }, 200);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse({ error: message }, 400);
      }
    }

    if (url.pathname === "/console/reset") {
      try {
        const body: ConsoleResetBody = await request.json();
        const logPath: string = resolveConsoleLogPath(body.page);
        await rm(logPath, { force: true });
        console.log(`Reset console log: ${logPath}`);
        return jsonResponse({ ok: true }, 200);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse({ error: message }, 400);
      }
    }

    if (url.pathname === "/console") {
      try {
        const body: ConsoleBody = await request.json();
        const logPath: string = resolveConsoleLogPath(body.page);
        const timestamp: string = new Date().toISOString();
        const line: string = `[${body.level.toUpperCase()}] ${timestamp}: ${body.args.join(" ")}\n`;

        await mkdir(dirname(logPath), { recursive: true });
        await appendFile(logPath, line);

        return jsonResponse({ ok: true }, 200);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonResponse({ error: message }, 400);
      }
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Debug server running on http://localhost:${PORT}`);
console.log(`  POST /log            → tests/debug/<name>.log (overwrite)`);
console.log(`  POST /console/reset  → delete <page>.console.log`);
console.log(`  POST /console        → append line to <page>.console.log`);
