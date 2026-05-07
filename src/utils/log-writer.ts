const SERVER_URL = "http://localhost:3456/log";

export async function writeDebugLog(
  filename: string,
  lines: string[],
): Promise<void> {
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, lines }),
    });
  } catch {
    console.warn("Dev server not running — log not saved");
  }
}
