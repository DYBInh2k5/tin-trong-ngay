const ENDPOINT = "/functions/v1/app/news";
const POLL_MS = 5 * 60 * 1000;
const NEW_WINDOW_MS = 90 * 1000;

const els = {
  today: document.getElementById("today"),
  stamp: document.getElementById("stamp"),
  footStamp: document.getElementById("foot-stamp"),
  filters: document.getElementById("filters"),
  search: document.getElementById("search"),
  refresh: document.getElementById("refresh"),
  refreshIcon: document.getElementById("refresh-icon"),
  countdown: document.getElementById("countdown"),
  banner: document.getElementById("banner"),
  newpill: document.getElementById("newpill"),
  feed: document.getElementById("feed"),
  skeletons: document.getElementById("skeletons"),
  sources: document.getElementById("sources"),
  sourceList: document.getElementById("source-list"),
};

const state = {
  items: [],
  sources: [],
  generatedAt: 0,
  dayKey: "",
  filter: "all",
  query: "",
  nextAt: 0,
  loading: false,
};

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const rel = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return mins + " phút trước";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + " giờ trước";
  return Math.round(hours / 24) + " ngày trước";
};

const groupOf = (item) => item.source.split(" - ")[0];

const link = (text, href) => {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;
  return a;
};

const cover = (item) => {
  if (!item.image) return null;
  const img = document.createElement("img");
  img.src = item.image;
  img.alt = "";
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.addEventListener(
    "error",
    () => {
      const box = img.closest(".thumb");
      const lead = box?.closest(".lead");
      if (lead) lead.classList.add("lead--text");
      box?.remove();
    },
    { once: true },
  );
  const box = document.createElement("div");
  box.className = "thumb";
  box.append(img);
  return box;
};

const meta = (item, withTime = true) => {
  const row = document.createElement("p");
  row.className = "meta";
  const parts = [item.source];
  if (withTime && item.ts) parts.push(timeFmt.format(item.ts) + " · " + rel(item.ts));
  for (const text of parts) {
    const span = document.createElement("span");
    span.textContent = text;
    row.append(span);
  }
  return row;
};

const card = (item, isNew) => {
  const article = document.createElement("article");
  article.className = "card" + (isNew ? " is-new" : "");
  const thumb = cover(item);
  if (thumb) article.append(thumb);
  const body = document.createElement("div");
  body.className = "card-body";
  body.append(titleOf(item));
  body.append(meta(item));
  if (item.summary) {
    const p = document.createElement("p");
    p.className = "summary";
    p.textContent = item.summary;
    body.append(p);
  }
  article.append(body);
  return article;
};

const titleOf = (item) => {
  const h = document.createElement("h3");
  h.append(link(item.title, item.link));
  return h;
};

const leadOf = (item, isNew) => {
  const wrap = document.createElement("article");
  wrap.className = "lead" + (isNew ? " is-new" : "");
  const thumb = cover(item);
  if (thumb) {
    thumb.classList.add("lead-thumb");
    wrap.append(thumb);
  } else {
    wrap.classList.add("lead--text");
  }
  const body = document.createElement("div");
  body.className = "lead-body";
  const badge = document.createElement("p");
  badge.className = "kicker";
  badge.textContent = "Tin nổi bật · " + item.source;
  const h = document.createElement("h2");
  h.append(link(item.title, item.link));
  body.append(badge, h, meta(item));
  if (item.summary) {
    const p = document.createElement("p");
    p.className = "lead-summary";
    p.textContent = item.summary;
    body.append(p);
  }
  wrap.append(body);
  return wrap;
};

const compact = (item) => {
  const row = document.createElement("article");
  row.className = "row-item";
  const h = document.createElement("h4");
  h.append(link(item.title, item.link));
  row.append(h, meta(item, false));
  return row;
};

const visible = () => {
  const query = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    if (state.filter !== "all" && groupOf(item).toLowerCase() !== state.filter) return false;
    if (!query) return true;
    return (item.title + " " + item.summary + " " + item.source).toLowerCase().includes(query);
  });
};

function render() {
  const items = visible();
  els.feed.textContent = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = state.items.length
      ? "Không có tin khớp bộ lọc hiện tại."
      : "Chưa có tin nào được tải về.";
    els.feed.append(empty);
    return;
  }
  const now = Date.now();
  const isNew = (item) => item.firstSeen && now - item.firstSeen < NEW_WINDOW_MS;

  const lead = items.find((item) => item.image) || items[0];
  els.feed.append(leadOf(lead, isNew(lead)));

  const rest = items.filter((item) => item !== lead);
  if (rest.length) {
    const side = document.createElement("div");
    side.className = "side";
    side.append(compact(rest[0]));
    if (rest[1]) side.append(compact(rest[1]));
    const list = document.createElement("div");
    list.className = "list";
    for (const item of rest.slice(2, 8)) list.append(compact(item));
    const band = document.createElement("div");
    band.className = "band";
    band.append(side, list);
    els.feed.append(band);

    const grid = document.createElement("div");
    grid.className = "grid";
    for (const item of rest.slice(8)) grid.append(card(item, isNew(item)));
    els.feed.append(grid);
  }
}

function renderFilters() {
  const groups = new Map();
  for (const item of state.items) {
    const key = groupOf(item).toLowerCase();
    if (!groups.has(key)) groups.set(key, groupOf(item));
  }
  const sorted = [...groups.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  els.filters.textContent = "";
  const chip = (value, label, count) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (state.filter === value ? " is-active" : "");
    button.setAttribute("aria-pressed", state.filter === value ? "true" : "false");
    button.textContent = count === undefined ? label : `${label} (${count})`;
    button.addEventListener("click", () => {
      state.filter = value;
      renderFilters();
      render();
    });
    return button;
  };
  els.filters.append(chip("all", "Tất cả", state.items.length));
  for (const [key, label] of sorted) {
    els.filters.append(chip(key, label, state.items.filter((i) => groupOf(i).toLowerCase() === key).length));
  }
}

function renderSources(sources) {
  const failed = sources.filter((s) => !s.ok || !s.count);
  els.sources.hidden = !failed.length;
  els.sourceList.textContent = "";
  for (const source of failed) {
    const li = document.createElement("li");
    li.textContent = `${source.name}: ${source.ok ? "không đọc được tin" : "lỗi " + source.note}`;
    els.sourceList.append(li);
  }
}

function banner(text, kind) {
  if (!text) {
    els.banner.hidden = true;
    return;
  }
  els.banner.textContent = text;
  els.banner.className = "banner " + (kind || "info");
  els.banner.hidden = false;
}

function stamp() {
  const at = state.generatedAt ? new Date(state.generatedAt) : null;
  const text = at ? `Cập nhật lúc ${timeFmt.format(at)} · ${rel(state.generatedAt)}` : "Chưa có dữ liệu";
  els.stamp.textContent = text;
  els.footStamp.textContent = at ? `Bảng tin tạo lúc ${dayFmt.format(at)} ${timeFmt.format(at)}` : "";
}

async function load({ silent = false, attempt = 1 } = {}) {
  if (state.loading) return;
  state.loading = true;
  els.refresh.classList.toggle("is-busy", !silent);
  try {
    const response = await fetch(ENDPOINT, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!data || !Array.isArray(data.items)) throw new Error("dữ liệu không hợp lệ");
    applyData(data);
    banner(data.stale ? data.note : "", data.stale ? "warn" : "");
  } catch (error) {
    if (attempt < 2) {
      state.loading = false;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return load({ silent, attempt: attempt + 1 });
    }
    banner(
      silent
        ? "Chưa lấy được bảng tin mới, sẽ thử lại sau vài phút. (" + error.message + ")"
        : "Máy chủ tin vừa trả lỗi (" + error.message + "). Bấm nút tải lại để lấy bảng tin mới nhất.",
      "error",
    );
  } finally {
    state.loading = false;
    state.nextAt = Date.now() + POLL_MS;
    els.refresh.classList.remove("is-busy");
    if (!state.items.length) els.skeletons.remove();
  }
}

function applyData(data) {
  const previous = new Set(state.items.map((i) => i.link));
  const now = Date.now();
  const items = data.items.map((item) => ({ ...item, firstSeen: previous.has(item.link) ? 0 : now }));
  state.items = items;
  state.sources = data.sources || [];
  state.generatedAt = data.generatedAt ? Date.parse(data.generatedAt) : now;

  const added = items.filter((item) => item.firstSeen && previous.size).length;
  renderFilters();
  render();
  renderSources(state.sources);
  stamp();
  if (added) showNewPill(added);
}

function showNewPill(count) {
  els.newpill.hidden = false;
  els.newpill.textContent = "";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${count} tin mới vừa về · xem ngay`;
  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    els.newpill.hidden = true;
  });
  els.newpill.append(button);
  setTimeout(() => {
    els.newpill.hidden = true;
    render();
  }, NEW_WINDOW_MS);
}

function tick() {
  const remaining = Math.max(0, state.nextAt - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  els.countdown.textContent = state.items.length ? `${mins}:${String(secs).padStart(2, "0")}` : "";
  if (remaining === 0 && !state.loading) {
    load({ silent: true }).then(() => stamp());
  }
  const day = new Date().toDateString();
  if (state.dayKey && state.dayKey !== day) {
    state.dayKey = day;
    load({ silent: true });
  }
  state.dayKey = state.dayKey || day;
}

els.today.textContent = dayFmt.format(new Date());
els.search.addEventListener("input", () => {
  state.query = els.search.value;
  render();
});
els.refresh.addEventListener("click", () => load().then(() => stamp()));

for (let i = 0; i < 6; i++) {
  const div = document.createElement("div");
  div.className = "sk";
  els.skeletons.append(div);
}
load().then(() => stamp());
setInterval(tick, 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() > state.nextAt) load({ silent: true });
});
