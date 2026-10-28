const urls = process.argv.slice(2);
for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 QoderSitesNewsAggregator/1.0" }, signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const items = (text.match(/<(item|entry)\b/gi) || []).length;
    console.log(String(res.status).padEnd(4), "items=" + String(items).padEnd(6), url);
    if (!items) console.log("      head:", text.slice(0, 160).replace(/\s+/g, " "));
  } catch (e) {
    console.log("ERR ", String(e.name || e).padEnd(6), url);
  }
}
