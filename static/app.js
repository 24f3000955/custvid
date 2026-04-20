/* ── State ──────────────────────────────────────────── */
let queue   = [];   // [{title, url}, ...]
let current = 0;    // index of currently-playing video

/* ── DOM refs ───────────────────────────────────────── */
const player     = document.getElementById("player");
const emptyState = document.getElementById("empty-state");
const videoTitle = document.getElementById("video-title");
const slotCount  = document.getElementById("slot-count");
const queueList  = document.getElementById("queue-list");
const btnPrev    = document.getElementById("btn-prev");
const btnNext    = document.getElementById("btn-next");
const btnDone    = document.getElementById("btn-done");
const btnAdd     = document.getElementById("btn-add");
const addUrl     = document.getElementById("add-url");
const addTitle   = document.getElementById("add-title");

/* ── Helpers ─────────────────────────────────────────── */
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    // Standard: youtube.com/watch?v=ID
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      // Shorts: youtube.com/shorts/ID
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/?&]+)/);
      if (shortsMatch) return shortsMatch[1];
      // Embed: youtube.com/embed/ID
      const embedMatch = u.pathname.match(/^\/embed\/([^/?&]+)/);
      if (embedMatch) return embedMatch[1];
    }
    // Shortened: youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
  } catch (_) {}
  // Last resort: bare ID (11 chars)
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

function embedUrl(videoId) {
  // ?rel=0 suppresses related-video suggestions
  // ?modestbranding=1 minimises YouTube branding
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
}

/* ── Render ──────────────────────────────────────────── */
function render() {
  const isEmpty = queue.length === 0;

  // Counter
  slotCount.textContent = isEmpty
    ? "empty"
    : `${current + 1} / ${queue.length}`;

  // Player
  if (isEmpty) {
    player.style.display = "none";
    player.src = "";
    emptyState.style.display = "flex";
    videoTitle.textContent = "—";
  } else {
    emptyState.style.display = "none";
    player.style.display = "block";
    const vid = queue[current];
    const id  = extractVideoId(vid.url);
    player.src = id ? embedUrl(id) : "";
    videoTitle.textContent = vid.title || vid.url;
  }

  // Nav buttons
  btnPrev.disabled = isEmpty || current === 0;
  btnNext.disabled = isEmpty || current === queue.length - 1;
  btnDone.disabled = isEmpty;

  // Queue list
  queueList.innerHTML = "";
  queue.forEach((v, i) => {
    const li = document.createElement("li");
    li.className = "queue-item" + (i === current ? " active" : "");

    const idx = document.createElement("span");
    idx.className = "qi-index";
    idx.textContent = String(i + 1).padStart(2, "0");

    const title = document.createElement("span");
    title.className = "qi-title";
    title.textContent = v.title || v.url;

    const rm = document.createElement("button");
    rm.className = "qi-remove";
    rm.title = "Remove";
    rm.textContent = "✕";
    rm.addEventListener("click", (e) => {
      e.stopPropagation();
      removeVideo(i);
    });

    li.appendChild(idx);
    li.appendChild(title);
    li.appendChild(rm);

    if (i !== current) {
      li.addEventListener("click", () => { current = i; render(); });
    }

    queueList.appendChild(li);
  });

  // Scroll active item into view
  const activeEl = queueList.querySelector(".active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
}

/* ── API calls ───────────────────────────────────────── */
async function fetchQueue() {
  const res = await fetch("/api/queue");
  queue = await res.json();
  current = Math.min(current, Math.max(0, queue.length - 1));
  render();
}

async function addVideo() {
  const url   = addUrl.value.trim();
  const title = addTitle.value.trim();
  if (!url) { addUrl.focus(); return; }

  const res = await fetch("/api/queue/add", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ url, title }),
  });
  if (res.ok) {
    addUrl.value   = "";
    addTitle.value = "";
    await fetchQueue();
    // Jump to newly added video if queue was empty
    if (queue.length === 1) current = 0;
    render();
  }
}

async function removeVideo(index) {
  await fetch(`/api/queue/remove/${index}`, { method: "DELETE" });
  if (current >= index && current > 0) current--;
  await fetchQueue();
}

/* ── Controls ─────────────────────────────────────────── */
btnPrev.addEventListener("click", () => {
  if (current > 0) { current--; render(); }
});
btnNext.addEventListener("click", () => {
  if (current < queue.length - 1) { current++; render(); }
});
btnDone.addEventListener("click", () => removeVideo(current));
btnAdd.addEventListener("click",  addVideo);

addUrl.addEventListener("keydown",   (e) => { if (e.key === "Enter") addVideo(); });
addTitle.addEventListener("keydown", (e) => { if (e.key === "Enter") addVideo(); });

/* ── Keyboard shortcuts ───────────────────────────────── */
document.addEventListener("keydown", (e) => {
  // Skip when typing in inputs
  if (e.target.tagName === "INPUT") return;
  if (e.key === "ArrowLeft"  && !btnPrev.disabled) btnPrev.click();
  if (e.key === "ArrowRight" && !btnNext.disabled) btnNext.click();
  if ((e.key === "d" || e.key === "Delete") && !btnDone.disabled) btnDone.click();
});

/* ── Init ────────────────────────────────────────────── */
fetchQueue();