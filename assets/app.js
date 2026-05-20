/* =========================================================
   弱水 — client-side blog runtime
   - Loads markdown essays (YAML frontmatter, marked.js)
   - KaTeX math rendering ($...$, $$...$$)
   - Auto language detection (Chinese vs English typography)
   - Per-post image folder convention: posts/<slug>/foo.png
   ========================================================= */

const POSTS_DIR = "posts/";
const MANIFEST_URL = POSTS_DIR + "manifest.json";

const state = {
  posts: null,     // full array of {slug, title, date, tags, excerpt, body}
  activeTag: null,
};

/* ---------- Frontmatter parsing ---------- */
// Minimal YAML-ish parser for: title, date, tags, excerpt, lang.
function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) {
    return { title: "Untitled", date: "", tags: [], excerpt: "", body: raw };
  }
  const meta = { title: "Untitled", date: "", tags: [], excerpt: "" };
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (!key) continue;

    if (key === "tags") {
      if (val.startsWith("[") && val.endsWith("]")) val = val.slice(1, -1);
      meta.tags = val
        .split(/[,，]/)
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      meta[key] = val.replace(/^['"]|['"]$/g, "");
    }
  }
  meta.body = m[2];
  return meta;
}

/* ---------- Language detection ---------- */
// Returns "en" or "zh" based on character ratios in the post body.
function detectLang(text) {
  if (!text) return "zh";
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  // Any meaningful Chinese density => zh
  if (cjk >= 30 && cjk * 3 >= latin) return "zh";
  return latin > cjk * 4 ? "en" : "zh";
}

/* ---------- Math extraction (KaTeX-safe) ---------- */
// Pull math delimiters out of markdown before marked sees them, so that
// `_`, `*`, `\top`, etc. inside math don't trigger markdown parsing.
// Supports four delimiter styles:
//   $$ ... $$    display
//   $ ... $      inline
//   \[ ... \]    display
//   \( ... \)    inline
// Skips code fences (```...```) and inline code (`...`) so e.g.
// `$foo` inside a code span stays literal.
function extractMath(md) {
  const blocks = [];
  let out = "";
  let i = 0;
  const n = md.length;

  const pushPlaceholder = (latex, display) => {
    blocks.push({ display, latex });
    return `@@MATH${blocks.length - 1}@@`;
  };

  while (i < n) {
    // ---- Code fences: ``` ... ``` ----
    if (md.startsWith("```", i)) {
      const end = md.indexOf("```", i + 3);
      const stop = end === -1 ? n : end + 3;
      out += md.slice(i, stop);
      i = stop;
      continue;
    }
    // ---- Inline code: `...` (same line only) ----
    if (md[i] === "`") {
      const newline = md.indexOf("\n", i + 1);
      const end = md.indexOf("`", i + 1);
      if (end !== -1 && (newline === -1 || end < newline)) {
        out += md.slice(i, end + 1);
        i = end + 1;
        continue;
      }
      // Stray backtick — emit literally
      out += md[i];
      i++;
      continue;
    }
    // ---- Display math: \[ ... \] ----
    if (md[i] === "\\" && md[i + 1] === "[") {
      const end = md.indexOf("\\]", i + 2);
      if (end !== -1) {
        out += pushPlaceholder(md.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    // ---- Inline math: \( ... \) ----
    if (md[i] === "\\" && md[i + 1] === "(") {
      const end = md.indexOf("\\)", i + 2);
      if (end !== -1) {
        out += pushPlaceholder(md.slice(i + 2, end), false);
        i = end + 2;
        continue;
      }
    }
    // ---- Escaped dollar: \$ -> literal $ ----
    if (md[i] === "\\" && md[i + 1] === "$") {
      out += "$";
      i += 2;
      continue;
    }
    // ---- Display math: $$ ... $$ ----
    if (md.startsWith("$$", i)) {
      const end = md.indexOf("$$", i + 2);
      if (end !== -1) {
        out += pushPlaceholder(md.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    // ---- Inline math: $ ... $ (single line, non-empty, no leading/trailing space) ----
    if (md[i] === "$") {
      const newline = md.indexOf("\n", i + 1);
      const end = md.indexOf("$", i + 1);
      if (end !== -1 && (newline === -1 || end < newline)) {
        const latex = md.slice(i + 1, end);
        // Reject probable currency: $100, $ price, etc.
        if (latex.length > 0 && !/^\s|\s$/.test(latex) && !/^\d+(\.\d+)?$/.test(latex)) {
          out += pushPlaceholder(latex, false);
          i = end + 1;
          continue;
        }
      }
    }
    out += md[i];
    i++;
  }
  return { stripped: out, blocks };
}

function renderMathPlaceholders(html, blocks) {
  if (!blocks.length) return html;

  const renderOne = (n) => {
    const b = blocks[+n];
    if (!b) return "";
    if (!window.katex) {
      // KaTeX not loaded — degrade gracefully to a code span
      return `<code>${escapeHtml((b.display ? "$$" : "$") + b.latex + (b.display ? "$$" : "$"))}</code>`;
    }
    try {
      return katex.renderToString(b.latex, {
        displayMode: b.display,
        throwOnError: false,
        strict: "ignore",
        output: "htmlAndMathml",
      });
    } catch (e) {
      return `<code class="math-error">${escapeHtml(b.latex)}</code>`;
    }
  };

  // 1) For display math wrapped on its own line, marked produced <p>@@MATHn@@</p>.
  //    Unwrap so we don't put a block-level <span class="katex-display"> inside <p>.
  html = html.replace(/<p>\s*@@MATH(\d+)@@\s*<\/p>/g, (m, n) => {
    const b = blocks[+n];
    if (!b) return m;
    return b.display ? renderOne(n) : `<p>${renderOne(n)}</p>`;
  });

  // 2) Inline / remaining placeholders.
  html = html.replace(/@@MATH(\d+)@@/g, (_, n) => renderOne(n));

  return html;
}

/* ---------- Data loading ---------- */
async function loadPosts() {
  if (state.posts) return state.posts;

  let manifest;
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("manifest fetch failed: " + res.status);
    manifest = await res.json();
  } catch (err) {
    console.error("无法加载文章清单:", err);
    return [];
  }

  const posts = await Promise.all(
    manifest.map(async (slug) => {
      try {
        const r = await fetch(POSTS_DIR + slug + ".md", { cache: "no-cache" });
        if (!r.ok) throw new Error("missing " + slug);
        const text = await r.text();
        const meta = parseFrontmatter(text);
        if (!meta.lang) meta.lang = detectLang(meta.body);
        return { slug, ...meta };
      } catch (e) {
        console.warn("跳过文章:", slug, e);
        return null;
      }
    })
  );

  state.posts = posts
    .filter(Boolean)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return state.posts;
}

/* ---------- Helpers ---------- */
function formatDate(s, lang) {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s;
  if (lang === "en") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m[2], 10) - 1]} ${parseInt(m[3], 10)}, ${m[1]}`;
  }
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Titles allow `<br>` for layout breaks. Everything else is HTML-escaped.
function titleAsHtml(s) {
  return escapeHtml(String(s)).replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}
// Plain-text version of a title for use in <title> tag, post-meta, etc.
function titleAsText(s) {
  return String(s).replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
}

function autoExcerpt(post) {
  if (post.excerpt) return post.excerpt;
  const body = post.body || "";
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith("---") && !p.startsWith("!["));
  if (!para) return "";
  const stripped = para
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$\n]+\$/g, "")
    .replace(/[#>*_`\[\]\(\)!\-]/g, "")
    .trim();
  const max = post.lang === "en" ? 140 : 90;
  return stripped.length > max ? stripped.slice(0, max) + "…" : stripped;
}

/* ---------- Table scroll wrapping ---------- */
// Wide markdown tables overflow the prose column awkwardly. Wrap every
// rendered <table> in a horizontally-scrollable container so it can spill
// past the prose width if needed, while the page itself doesn't scroll.
function wrapTables(rootEl) {
  rootEl.querySelectorAll("table").forEach((t) => {
    if (t.parentElement && t.parentElement.classList.contains("table-scroll")) return;
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });
}

/* ---------- Interactive widget mounting ---------- */
// Posts can include <div data-widget="<name>"></div> placeholders. After the
// post HTML is in the DOM, ask each registered widget to scan and mount.
function mountWidgets(rootEl) {
  if (!window.RuoshuiWidgets) return;
  for (const fn of Object.values(window.RuoshuiWidgets)) {
    if (typeof fn === "function") {
      try { fn(rootEl); } catch (err) { console.error("widget mount failed:", err); }
    }
  }
}

/* ---------- Image path resolution ---------- */
// In a post, image paths can be written three ways:
//   (a) "foo.png"                    -> posts/<slug>/foo.png   (per-post folder)
//   (b) "assets/.../foo.png"         -> assets/.../foo.png     (shared assets)
//   (c) "/site-rooted/foo.png"       -> /site-rooted/foo.png   (untouched)
//   (d) "https://..."                -> external URL           (untouched)
//   (e) "../something"               -> caller's explicit path (untouched)
//   (f) "posts/<other>/foo.png"      -> already namespaced     (untouched)
function rewriteImageSources(rootEl, slug) {
  rootEl.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    if (/^(https?:)?\/\//.test(src)) return;       // (d) absolute URL
    if (src.startsWith("/")) return;                // (c) site-root path
    if (src.startsWith("posts/")) return;           // (f) already namespaced
    if (src.startsWith("assets/")) return;          // (b) shared assets folder
    if (src.startsWith("../")) return;              // (e) explicit relative
    img.src = `${POSTS_DIR}${slug}/${src}`;         // (a) per-post default
    img.loading = "lazy";
    img.decoding = "async";
  });
}

/* ---------- Rendering: list ---------- */
async function renderList() {
  const listEl = document.getElementById("post-list");
  const tagBar = document.getElementById("tag-filter");
  const status = document.getElementById("list-status");

  status.hidden = false;
  status.textContent = "加载中…";

  const posts = await loadPosts();

  if (!posts.length) {
    status.textContent = "尚无文章。请在 posts/ 目录添加 .md 文件。";
    listEl.innerHTML = "";
    tagBar.innerHTML = "";
    return;
  }

  // Tag chips
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || []))).sort();
  tagBar.innerHTML = "";

  const makeChip = (label, isActive, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag-chip" + (isActive ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  };

  tagBar.appendChild(
    makeChip("全部", state.activeTag === null, () => {
      state.activeTag = null;
      renderList();
    })
  );
  for (const t of allTags) {
    tagBar.appendChild(
      makeChip(t, state.activeTag === t, () => {
        state.activeTag = state.activeTag === t ? null : t;
        renderList();
      })
    );
  }

  const filtered = state.activeTag
    ? posts.filter((p) => (p.tags || []).includes(state.activeTag))
    : posts;

  if (!filtered.length) {
    status.textContent = `没有标签为「${state.activeTag}」的文章。`;
    listEl.innerHTML = "";
    return;
  }

  status.hidden = true;
  listEl.innerHTML = filtered
    .map((p) => {
      const tags = (p.tags || [])
        .map((t) => `<span class="post-tag">${escapeHtml(t)}</span>`)
        .join("");
      const excerpt = autoExcerpt(p);
      return `
        <li class="post-item">
          <a class="post-link" data-lang="${p.lang}" href="#/post/${encodeURIComponent(p.slug)}">
            <div class="post-meta-row">
              <time datetime="${escapeHtml(p.date)}">${escapeHtml(formatDate(p.date, p.lang))}</time>
              ${tags}
            </div>
            <h2 class="post-item-title">${escapeHtml(titleAsText(p.title))}</h2>
            ${excerpt ? `<p class="post-excerpt">${escapeHtml(excerpt)}</p>` : ""}
          </a>
        </li>`;
    })
    .join("");
}

/* ---------- Rendering: post ---------- */
async function renderPost(slug) {
  const view = document.getElementById("view-post");
  const titleEl = document.getElementById("post-title");
  const dateEl = document.getElementById("post-date");
  const tagsEl = document.getElementById("post-tags");
  const contentEl = document.getElementById("post-content");

  titleEl.textContent = "加载中…";
  dateEl.textContent = "";
  tagsEl.innerHTML = "";
  contentEl.innerHTML = "";

  const posts = await loadPosts();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    titleEl.textContent = "未找到文章";
    contentEl.innerHTML = `<p>找不到 slug 为 <code>${escapeHtml(slug)}</code> 的文章。</p>`;
    document.title = "未找到 · 弱水";
    return;
  }

  const lang = post.lang || "zh";
  view.dataset.lang = lang;
  view.dataset.slug = slug;
  contentEl.classList.toggle("lang-en", lang === "en");
  contentEl.classList.toggle("lang-zh", lang !== "en");

  titleEl.innerHTML = titleAsHtml(post.title);
  dateEl.textContent = formatDate(post.date, lang);
  dateEl.setAttribute("datetime", post.date || "");
  tagsEl.innerHTML = (post.tags || [])
    .map((t) => `<span class="post-tag">${escapeHtml(t)}</span>`)
    .join("");

  // Pre-extract math, run marked, restore math via KaTeX
  marked.setOptions({ gfm: true, breaks: false });
  const { stripped, blocks } = extractMath(post.body || "");
  let html = marked.parse(stripped);
  html = renderMathPlaceholders(html, blocks);
  console.log(
    `[弱水] post=${slug}  math=${blocks.length}  katex=${!!window.katex}  marked=${!!window.marked}`
  );

  contentEl.innerHTML = html;
  rewriteImageSources(contentEl, slug);
  wrapTables(contentEl);
  mountWidgets(contentEl);

  document.title = `${titleAsText(post.title)} · 弱水`;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/* ---------- Routing ---------- */
function showView(name) {
  document.getElementById("view-list").hidden = name !== "list";
  document.getElementById("view-post").hidden = name !== "post";
}

function route() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/post/")) {
    const slug = decodeURIComponent(hash.slice("#/post/".length));
    showView("post");
    renderPost(slug);
  } else {
    showView("list");
    document.title = "弱水";
    renderList();
  }
}

/* ---------- Theme ---------- */
function getInitialTheme() {
  try {
    const stored = localStorage.getItem("ruoshui-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {}
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("ruoshui-theme", theme); } catch (_) {}
}

function setupTheme() {
  applyTheme(getInitialTheme());
  document.documentElement.classList.remove("theme-loading");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

/* ---------- Boot ---------- */
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  route();
});

(function preApplyTheme() {
  document.documentElement.classList.add("theme-loading");
  try {
    const stored = localStorage.getItem("ruoshui-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.dataset.theme = stored;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.dataset.theme = "dark";
    }
  } catch (_) {}
})();
