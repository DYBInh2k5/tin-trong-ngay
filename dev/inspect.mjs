const url = process.argv[2];
const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 QoderSitesNewsAggregator/1.0" }, signal: AbortSignal.timeout(9000) });
const text = await res.text();
const blocks = text.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
console.log("blocks:", blocks.length);
if (blocks.length) console.log(blocks[0].slice(0, 900));
