import { createHandler } from "../functions/handler.mjs";

const handler = createHandler();

export default async function news(req, res) {
  const host = req.headers.host || "localhost";
  const request = new Request(`https://${host}${req.url || "/"}`, {
    method: req.method,
    headers: new Headers(req.headers),
  });
  const response = await handler(request);
  res.writeHead(response.status, {
    "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": response.headers.get("cache-control") || "public, max-age=60",
  });
  res.end(await response.text());
}
