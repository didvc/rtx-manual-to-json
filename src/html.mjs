// Minimal, dependency-free HTML/XHTML parser tuned for the DITA-generated
// Yamaha command reference. Produces a small DOM-ish tree:
//   element: { type: "el", tag, attrs, children, parent }
//   text:    { type: "text", value, parent }
// It is tolerant (unclosed tags auto-close up the stack) but is NOT a full
// HTML5 tree builder. The archive is well-formed XHTML, so this suffices.

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);
const RAW = new Set(["script", "style"]);

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

export function parseHtml(html) {
  const root = { type: "el", tag: "#root", attrs: {}, children: [], parent: null };
  let cur = root;
  let i = 0;
  const push = (node) => { node.parent = cur; cur.children.push(node); };

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { push({ type: "text", value: decodeEntities(html.slice(i)) }); break; }
    if (lt > i) push({ type: "text", value: decodeEntities(html.slice(i, lt)) });

    if (html.startsWith("<!--", lt)) { const e = html.indexOf("-->", lt + 4); i = e === -1 ? html.length : e + 3; continue; }
    if (html.startsWith("<![CDATA[", lt)) {
      const e = html.indexOf("]]>", lt + 9);
      push({ type: "text", value: html.slice(lt + 9, e === -1 ? html.length : e) });
      i = e === -1 ? html.length : e + 3; continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") { const e = html.indexOf(">", lt); i = e === -1 ? html.length : e + 1; continue; }

    const gt = html.indexOf(">", lt);
    if (gt === -1) { push({ type: "text", value: html.slice(lt) }); break; }
    const inner = html.slice(lt + 1, gt);
    i = gt + 1;

    if (inner[0] === "/") {
      const tag = inner.slice(1).trim().toLowerCase();
      // pop to the matching open tag, if any
      for (let n = cur; n && n !== root; n = n.parent) {
        if (n.tag === tag) { cur = n.parent; break; }
      }
      continue;
    }

    const m = /^([^\s\/>]+)([\s\S]*?)(\/?)\s*$/.exec(inner);
    if (!m) continue;
    const tag = m[1].toLowerCase();
    const el = { type: "el", tag, attrs: parseAttrs(m[2]), children: [] };
    push(el);
    if (m[3] === "/" || VOID.has(tag)) continue;
    if (RAW.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const end = close === -1 ? html.length : close;
      el.children.push({ type: "text", value: html.slice(i, end), parent: el });
      i = close === -1 ? end : html.indexOf(">", close) + 1;
      continue;
    }
    cur = el;
  }
  return root;
}

// ── tiny query helpers ────────────────────────────────────────────────────────

export const classes = (n) => (n.type === "el" && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
export const hasClass = (n, c) => classes(n).includes(c);
export const elements = (n) => n.children.filter((c) => c.type === "el");

/** Depth-first search; pred(node) → boolean. */
export function findAll(n, pred, out = []) {
  for (const c of n.children ?? []) {
    if (c.type !== "el") continue;
    if (pred(c)) out.push(c);
    findAll(c, pred, out);
  }
  return out;
}
export const find = (n, pred) => findAll(n, pred)[0] ?? null;

/** Simple matcher: "tag", ".class", "tag.class", "tag.a.b". */
export function sel(s) {
  const [tag, ...cls] = s.split(".");
  return (n) => (!tag || n.tag === tag) && cls.every((c) => hasClass(n, c));
}

/** Raw text content (no normalisation). <br> becomes "\n". */
export function rawText(n) {
  if (n.type === "text") return n.value;
  if (n.tag === "br") return "\n";
  return n.children.map(rawText).join("");
}

/** Text with whitespace normalised: lines trimmed, blank lines dropped. */
export function text(n) {
  return normalize(rawText(n));
}

export function normalize(s) {
  return s
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t\r\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Collapse all whitespace (including newlines) into single spaces. */
export const inlineText = (n) => rawText(n).replace(/\s+/g, " ").trim();
