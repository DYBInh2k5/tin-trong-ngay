// Server preview cục bộ: phục vụ dist/ và chạy Edge Function ngay trong tiến trình Node.
import { createHandler } from "../functions/handler.mjs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const port = Number(process.env.PORT || 4173);
const handler = createHandler();
const root = join(import.meta.dirname, "..", "dist");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/functions/")) {
    const body = await handler(new Request(`http://127.0.0.1${url.pathname}`, { method: req.method }));
    res.writeHead(body.status, { "content-type": body.headers.get("content-type") || "application/json" });
    res.end(await body.text());
    return;
  }
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "") || "index.html";
  const file = join(root, relative);
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`preview: http://127.0.0.1:${port}/`));
