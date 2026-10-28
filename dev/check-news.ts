import { createHandler } from "../functions/handler.ts";

const handler = createHandler();
const base = "http://127.0.0.1:8000";

const request = async (path) => {
  const response = await handler(new Request(base + path));
  return { status: response.status, body: await response.json().catch(() => null) };
};

const first = await request("/functions/v1/app/news");
const second = await request("/functions/v1/app/news");
const unknown = await request("/functions/v1/app/nope");

console.log("status:", first.status, "cached(second):", second.body && second.body.cached, "unknown:", unknown.status);
console.log("items:", first.body.items.length);
console.log("sources:");
for (const source of first.body.sources) {
  console.log(`  ${source.ok ? "OK " : "ERR"} ${source.name.padEnd(24)} ${String(source.count).padStart(3)} ${source.note}`);
}
console.log("sample:");
for (const item of first.body.items.slice(0, 8)) {
  console.log(`  [${item.source}] ${new Date(item.ts).toISOString()} ${item.image ? "img " : "    "}${item.title}`);
  console.log(`         ${item.link}`);
}
const missingDate = first.body.items.filter((i) => !i.ts).length;
const bySource = {};
for (const item of first.body.items) bySource[item.sourceId] = (bySource[item.sourceId] || 0) + 1;
console.log("missing date:", missingDate, "| merged per source:", JSON.stringify(bySource));
