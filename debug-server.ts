import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const PORT = parseInt(process.env["PORT"] ?? "3456", 10);
const DEBUG_DIR = join(import.meta.dirname, "tests", "debug");

type LogBody = {
  filename: string;
  lines: string[];
};

Bun.serve({
  port: PORT,
  hostname: "localhost",

  async fetch(request) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/log") {
      return new Response("Not found", { status: 404, headers });
    }

    try {
      const body: LogBody = await request.json();
      const sanitizedName: string = body.filename.replace(
        /[^a-zA-Z0-9._\-\/]/g,
        "_",
      );
      const filePath: string = join(DEBUG_DIR, `${sanitizedName}.log`);

      const date = new Date();
      console.log(
        `Writing log to ${filePath} the ${date.toLocaleString("en")}`,
      );

      await mkdir(dirname(filePath), { recursive: true });

      const fileContent = date + "\n".repeat(2) + body.lines.join("\n") + "\n";
      await Bun.write(filePath, fileContent);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Debug log server running on http://localhost:${PORT}`);
console.log(`Accepting POST /log → tests/debug/<name>.log`);
