// Logic tổng hợp RSS, dùng chung cho Deno (index.ts), Vercel (api/news.mjs) và test cục bộ.
export const SOURCES = [
  { id: "vnexpress", name: "VnExpress", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
  { id: "vnexpress-the-thao", name: "VnExpress - Thể thao", url: "https://vnexpress.net/rss/the-thao.rss" },
  { id: "vnexpress-giai-tri", name: "VnExpress - Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss" },
  { id: "vnexpress-so-hoa", name: "VnExpress - Số hóa", url: "https://vnexpress.net/rss/so-hoa.rss" },
  { id: "vnexpress-giao-duc", name: "VnExpress - Giáo dục", url: "https://vnexpress.net/rss/giao-duc.rss" },
  { id: "vnexpress-suc-khoe", name: "VnExpress - Sức khỏe", url: "https://vnexpress.net/rss/suc-khoe.rss" },
  { id: "tuoitre", name: "Tuổi Trẻ", url: "https://tuoitre.vn/rss/home.rss" },
  { id: "tuoitre-the-gioi", name: "Tuổi Trẻ - Thế giới", url: "https://tuoitre.vn/rss/the-gioi.rss" },
  { id: "tuoitre-phap-luat", name: "Tuổi Trẻ - Pháp luật", url: "https://tuoitre.vn/rss/phap-luat.rss" },
  { id: "tuoitre-the-thao", name: "Tuổi Trẻ - Thể thao", url: "https://tuoitre.vn/rss/the-thao.rss" },
  { id: "thanhnien", name: "Thanh Niên", url: "https://thanhnien.vn/rss/home.rss" },
  { id: "thanhnien-the-gioi", name: "Thanh Niên - Thế giới", url: "https://thanhnien.vn/rss/the-gioi.rss" },
  { id: "thanhnien-gioi-tre", name: "Thanh Niên - Giới trẻ", url: "https://thanhnien.vn/rss/gioi-tre.rss" },
  { id: "nld", name: "Người Lao Động", url: "https://nld.com.vn/rss/home.rss" },
  { id: "dantri", name: "Dân Trí", url: "https://dantri.com.vn/rss/home.rss" },
];

export const CACHE_SECONDS = 900;
export const PER_SOURCE_LIMIT = 25;
export const TOTAL_LIMIT = 180;
export const FETCH_TIMEOUT_MS = 5000;

export const decodeEntities = (text) =>
  String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Gỡ CDATA trước rồi mới cắt tag: <![CDATA[nội dung]]> cũng là một đoạn "<...>" nếu cắt ngược.
export const plainText = (value) =>
  decodeEntities(
    String(value || "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, " "),
  ).replace(/\s+/g, " ").trim();

export const field = (block, name) => {
  const open = new RegExp("<" + name + "\\b[^>]*>", "i");
  const start = open.exec(block);
  if (!start) return "";
  const body = block.slice(start.index + start[0].length);
  const end = new RegExp("</" + name + "\\s*>", "i").exec(body);
  return end ? body.slice(0, end.index) : "";
};

export const attribute = (markup, name) => {
  const m = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*"([^"]*)"', "i").exec(markup || "");
  return m ? m[1] : "";
};

// Chỉ nhận URL ra được ảnh: nếu không, phần mô tả sẽ trả về chính link bài viết.
const looksLikeImage = (url) =>
  /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url) || /\/(resize|thumb_w|thumb|w\d{3,4})\//i.test(url);

const firstUrl = (value) => {
  const m = /https?:\/\/[^\s"'<>()\]]+/.exec(decodeEntities(value || ""));
  return m ? m[0].replace(/[.,;]$/, "") : "";
};

const imageUrl = (value) => {
  const urls = (decodeEntities(value || "").match(/https?:\/\/[^\s"'<>()\]]+/g) || [])
    .map((url) => url.replace(/[.,;]$/, ""));
  return urls.find(looksLikeImage) || "";
};

// Mỗi tòa soạn một kiểu: VnExpress "dd/MM/yyyy HH:mm", Tuổi Trẻ "MM/dd/yyyy h:mm:ss a",
// Dân Trí dùng RFC 1123. Giờ VN = UTC+7.
export function parseDate(raw) {
  const value = plainText(raw);
  const ampm = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i.exec(value);
  const slash = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value);
  if (slash) {
    const first = +slash[1];
    const day = first > 12 ? first : +slash[2];
    const month = first > 12 ? +slash[2] : first;
    let hour = 0;
    let minute = 0;
    if (ampm) {
      hour = +ampm[1] % 12 + (/PM/i.test(ampm[3]) ? 12 : 0);
      minute = +ampm[2];
    }
    return Date.UTC(+slash[3], month - 1, day, hour, minute) - 7 * 3600 * 1000;
  }
  const iso = /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5]);
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const clip = (text, max) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).replace(/[,;:\-–.]$/, "") + "…";
};

export function parseFeed(xml, source) {
  const items = [];
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const block of blocks) {
    const enclosure = /<enclosure\b[^>]*>/i.exec(block);
    const media = /<media:(?:content|thumbnail)\b[^>]*>/i.exec(block);
    const mediaUrl = attribute(enclosure && enclosure[0], "url") || attribute(media && media[0], "url");
    const link =
      plainText(field(block, "link")) ||
      (/\.(jpe?g|png|webp)/i.test(mediaUrl) ? "" : mediaUrl) ||
      firstUrl(field(block, "guid")) ||
      firstUrl(block);
    const title = plainText(field(block, "title"));
    if (!title || !link || !/^https?:\/\//i.test(link)) continue;
    const description = field(block, "description") || field(block, "summary") || field(block, "content");
    items.push({
      title,
      link,
      source: source.name,
      sourceId: source.id,
      image: (looksLikeImage(mediaUrl) ? mediaUrl : "") || imageUrl(description) || imageUrl(block),
      summary: clip(plainText(description), 230),
      ts: parseDate(field(block, "pubDate") || field(block, "published") || field(block, "updated") || field(block, "dc:date")),
    });
    if (items.length >= PER_SOURCE_LIMIT) break;
  }
  return items;
}

export async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "QoderSitesNewsAggregator/1.0", accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!response.ok) return { source, ok: false, items: [], note: `HTTP ${response.status}` };
    return { source, ok: true, items: parseFeed(await response.text(), source), note: "" };
  } catch (error) {
    return { source, ok: false, items: [], note: String((error && error.name) || error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function buildPayload() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const seen = new Set();
  const merged = [];
  for (const result of results) {
    for (const item of result.items) {
      const urlKey = item.link.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
      const titleKey = "t:" + item.title.toLowerCase();
      if (seen.has(urlKey) || seen.has(titleKey)) continue;
      seen.add(urlKey);
      seen.add(titleKey);
      merged.push(item);
    }
  }
  const now = Date.now();
  merged.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const recent = merged.filter((item) => !item.ts || now - item.ts < 48 * 3600 * 1000).slice(0, TOTAL_LIMIT);
  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    cacheSeconds: CACHE_SECONDS,
    sources: results.map((r) => ({ id: r.source.id, name: r.source.name, ok: r.ok, count: r.items.length, note: r.note })),
    items: recent.length ? recent : merged.slice(0, TOTAL_LIMIT),
  };
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${Math.min(CACHE_SECONDS, 60)}`,
    },
  });

export function createHandler() {
  let cache = { at: 0, payload: null, pending: null };

  const refresh = () => {
    if (cache.pending) return cache.pending;
    cache.pending = buildPayload()
      .then((payload) => {
        cache = { at: Date.now(), payload, pending: null };
        return payload;
      })
      .catch(() => {
        cache = { ...cache, pending: null };
        return null;
      });
    return cache.pending;
  };

  const news = async () => {
    if (cache.payload && Date.now() - cache.at < CACHE_SECONDS * 1000) {
      return json({ ...cache.payload, cached: true });
    }
    if (cache.pending && cache.payload) {
      return json({ ...cache.payload, refreshing: true, cached: true });
    }
    const payload = await refresh();
    if (payload) return json(payload);
    if (cache.payload) {
      return json({ ...cache.payload, stale: true, note: "Nguồn tin tạm thời không truy cập được; đây là bản cập nhật gần nhất." });
    }
    return json({ ok: false, error: "feeds_unavailable", items: [], sources: [] }, 502);
  };

  return async function handler(request) {
    const path = new URL(request.url).pathname;
    if (path === "/__health" || path.endsWith("/__health")) return new Response("ok");
    // Gateway thay segment tên function bằng tên upstream, chỉ suffix được giữ nguyên.
    if (path.endsWith("/news")) return news();
    return json({ ok: false, error: "not_found" }, 404);
  };
}
