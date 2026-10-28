import type { IncomingMessage, ServerResponse } from "node:http";
import { createHandler } from "../functions/handler.ts";

const handler = createHandler();

export default async function news(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || "localhost";
  const request = new Request(`https://${host}${req.url || "/"}`, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
  });
  const response = await handler(request);
  res.writeHead(response.status, {
    "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": response.headers.get("cache-control") || "public, max-age=60",
  });
  res.end(await response.text());
}
