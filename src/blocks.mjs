// Convert DITA XHTML body content into a flat list of JSON "blocks":
//   { type: "p",     text }
//   { type: "pre",   text }                      preformatted (config/output examples)
//   { type: "list",  ordered, items: Block[][] }
//   { type: "table", header: string[] | null, rows: string[][] }   spans expanded
//   { type: "note",  kind, blocks: Block[] }     note / caution
//   { type: "image", src, alt }
import { hasClass, elements, findAll, sel, rawText, normalize, inlineText } from "./html.mjs";

const INLINE = new Set(["span", "var", "strong", "b", "em", "i", "code", "a", "sup", "sub", "kbd", "samp", "tt", "u", "br", "cite", "q"]);

export function tableToJson(table) {
  const head = find1(table, "thead");
  const rowsOf = (n) => (n ? findAll(n, sel("tr")) : []);
  const headRows = rowsOf(head);
  const bodyRows = findAll(table, sel("tr")).filter((tr) => !headRows.includes(tr));
  const expand = (trs) => {
    const grid = [];
    trs.forEach((tr, r) => {
      grid[r] ??= [];
      let c = 0;
      for (const cell of elements(tr).filter((e) => e.tag === "td" || e.tag === "th")) {
        while (grid[r][c] !== undefined) c++;
        const rs = Math.max(1, +cell.attrs.rowspan || 1);
        const cs = Math.max(1, +cell.attrs.colspan || 1);
        const v = normalize(rawText(cell));
        for (let dr = 0; dr < rs && r + dr < trs.length; dr++) {
          grid[r + dr] ??= [];
          for (let dc = 0; dc < cs; dc++) grid[r + dr][c + dc] = v;
        }
        c += cs;
      }
    });
    return grid.map((row) => Array.from(row, (v) => v ?? ""));
  };
  const h = expand(headRows);
  return { type: "table", header: h.length ? h[h.length - 1] : null, rows: expand(bodyRows) };
}

function find1(n, tag) {
  return findAll(n, sel(tag))[0] ?? null;
}

/** Convert a sequence of nodes into blocks. Inline runs are merged into paragraphs. */
export function toBlocks(nodes) {
  const out = [];
  let buf = "";
  const flush = () => {
    const t = normalize(buf);
    if (t) out.push({ type: "p", text: t });
    buf = "";
  };

  for (const n of nodes) {
    if (n.type === "text") { buf += n.value; continue; }
    if (INLINE.has(n.tag)) {
      // inline element that hides block content (rare) → descend
      if (findAll(n, (e) => e.tag === "table" || e.tag === "pre").length) { flush(); out.push(...toBlocks(n.children)); }
      else buf += rawText(n);
      continue;
    }
    flush();
    if (n.tag === "h2" && hasClass(n, "sectiontitle")) continue;
    if (n.tag === "table") out.push(tableToJson(n));
    else if (n.tag === "pre") out.push({ type: "pre", text: rawText(n).replace(/^\n+|\s+$/g, "") });
    else if (n.tag === "ul" || n.tag === "ol") {
      out.push({ type: "list", ordered: n.tag === "ol", items: elements(n).filter((e) => e.tag === "li").map((li) => toBlocks(li.children)) });
    } else if (n.tag === "img") out.push({ type: "image", src: n.attrs.src ?? "", alt: n.attrs.alt ?? "" });
    else if (hasClass(n, "note")) {
      const kind = n.attrs.class.split(/\s+/).find((c) => c !== "note") ?? "note";
      const body = n.children.filter((c) => !(c.type === "el" && /title$/.test(c.attrs.class ?? "")));
      out.push({ type: "note", kind, blocks: toBlocks(body) });
    } else if (/title$/.test(n.attrs.class ?? "")) {
      out.push({ type: "p", text: inlineText(n) }); // stray notetitle/cautiontitle
    } else out.push(...toBlocks(n.children)); // p, div, etc.
  }
  flush();
  return out;
}

/** Flatten blocks to plain text (for search / embeddings). */
export function blocksToText(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "p": case "pre": return b.text;
        case "list": return b.items.map((it, i) => (b.ordered ? `${i + 1}. ` : "- ") + blocksToText(it)).join("\n");
        case "table": return [b.header, ...b.rows].filter(Boolean).map((r) => r.join(" | ")).join("\n");
        case "note": return blocksToText(b.blocks);
        default: return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
