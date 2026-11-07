// One HTML page → one JSON record.
import { parseHtml, find, findAll, sel, elements, hasClass, inlineText, normalize, rawText } from "./html.mjs";
import { toBlocks } from "./blocks.mjs";

/** Known section headings → stable JSON keys. Unknown headings land in `extraSections`. */
export const SECTION_KEYS = {
  "[書式]": "syntax",
  "[設定値及び初期値]": "parameters",
  "[説明]": "description",
  "[ノート]": "notes",
  "[設定例]": "examples",
  "[表示例]": "outputExamples",
  "[初期設定]": "initialConfig",
  "[拡張ライセンス対応]": "extendedLicense",
  "[適用モデル]": "models",
};

const meta = (root, name) => find(root, (n) => n.tag === "meta" && n.attrs.name === name)?.attrs.content ?? null;

/** Split "9.1 Widget setting" → { number: "9.1", name: "Widget setting" } */
export function splitTitle(t) {
  const m = /^(\d+(?:\.\d+)*)\s+(.*)$/.exec(t);
  return m ? { number: m[1], name: m[2] } : { number: null, name: t };
}

/** [書式] line → { text, tokens:[{t:"kwd"|"var"|"lit"|"sep", v}] } */
function parseSyntaxLine(li) {
  const tokens = [];
  const add = (t, v) => {
    const last = tokens[tokens.length - 1];
    if (t === "sep" && last?.t === "sep") last.v += v;
    else tokens.push({ t, v });
  };
  const walk = (n) => {
    if (n.type === "text") { if (n.value.trim()) add("lit", n.value.trim()); else if (n.value) add("sep", " "); return; }
    if (hasClass(n, "kwd")) return add("kwd", inlineText(n));
    if (hasClass(n, "var")) return add("var", inlineText(n));
    if (hasClass(n, "delim")) return add("sep", rawText(n).replace(/\s+/g, " "));
    if (hasClass(n, "synph") && n.children.every((c) => c.type === "text")) return add("lit", inlineText(n));
    n.children.forEach(walk);
  };
  li.children.forEach(walk);
  const text = tokens.map((x) => x.v).join("").replace(/\s+/g, " ").trim();
  // whitespace-only separators are implied by token boundaries; drop them from tokens
  return { text, tokens: tokens.filter((x) => !(x.t === "sep" && !x.v.trim())).map((x) => (x.t === "sep" ? { t: "sep", v: x.v.trim() } : x)) };
}

/** [設定値及び初期値] → [{ names, values: Block[], default: Block[], extra }] */
function parseParameters(section) {
  const params = [];
  for (const ul of elements(section).filter(sel("ul.ul"))) {
    for (const li of elements(ul).filter((e) => e.tag === "li")) {
      const names = elements(li).filter((e) => hasClass(e, "varname") || hasClass(e, "cmdname")).map(inlineText);
      const p = { names, values: [], default: [] };
      if (!names.length) {
        // Literal keyword parameter written as plain text, e.g. "bandwidth-measuring : 回線帯域検出"
        const label = normalize(li.children.filter((c) => !(c.type === "el" && c.tag === "ul")).map(rawText).join(""));
        const m = /^(.+?)\s+:\s+(.*)$/s.exec(label);
        if (m) { names.push(m[1].trim()); p.values.push({ type: "p", text: m[2].trim() }); }
        else if (label) names.push(label);
      }
      const inner = elements(li).find(sel("ul.ul"));
      for (const sub of inner ? elements(inner).filter((e) => e.tag === "li") : []) {
        const blocks = toBlocks(sub.children);
        const first = blocks[0];
        const m = first?.type === "p" ? /^\[(設定値|初期値)\]\s*:\s*/.exec(first.text) : null;
        if (!m) { (p.extra ??= []).push(...blocks); continue; }
        const rest = first.text.slice(m[0].length).trim();
        const body = [...(rest && rest !== "-" ? [{ type: "p", text: rest }] : []), ...blocks.slice(1)];
        (m[1] === "設定値" ? p.values : p.default).push(...body);
      }
      params.push(p);
    }
  }
  return params;
}

function parseModels(section) {
  const t = normalize(rawText({ ...section, children: section.children.filter((c) => c.tag !== "h2") }));
  return t.split(/[,、\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * @param {string} html
 * @param {string} relPath path relative to the archive html/ root, e.g. "demo/demo_widget.html"
 */
export function extractPage(html, relPath) {
  const root = parseHtml(html);
  const titleEl = find(root, sel("h1.topictitle1"));
  const title = titleEl ? inlineText(titleEl) : meta(root, "DC.title") ?? "";
  const { number, name } = splitTitle(title);
  const type = meta(root, "DC.type"); // "reference" | "concept"
  const parentA = find(root, sel("div.parentlink")) && find(find(root, sel("div.parentlink")), sel("a"));

  const rec = {
    id: meta(root, "DC.identifier") ?? relPath.replace(/\.html$/, "").split("/").pop(),
    path: relPath,
    kind: type === "reference" ? "command" : type ?? "unknown",
    number,
    title: name,
    category: relPath.includes("/") ? relPath.split("/")[0] : null,
    parent: parentA ? { title: inlineText(parentA), path: resolveRel(relPath, parentA.attrs.href) } : null,
  };

  if (rec.kind === "command") {
    const subject = meta(root, "DC.subject");
    rec.commands = subject ? subject.split(/\s*,\s*/).filter(Boolean) : [];
    for (const section of findAll(root, sel("div.section"))) {
      const h2 = find(section, sel("h2.sectiontitle"));
      const heading = h2 ? inlineText(h2) : "";
      const key = SECTION_KEYS[heading];
      if (key === "syntax") rec.syntax = findAll(section, sel("li.sli")).map(parseSyntaxLine);
      else if (key === "parameters") rec.parameters = parseParameters(section);
      else if (key === "models") rec.models = parseModels(section);
      else if (key) rec[key] = toBlocks(section.children);
      else (rec.extraSections ??= []).push({ heading, blocks: toBlocks(section.children) });
    }
  } else {
    const body = find(root, (n) => n.tag === "div" && hasClass(n, "body"));
    rec.blocks = body ? toBlocks(body.children) : [];
    const children = findAll(root, sel(".ulchildlink")).map((li) => find(li, sel("a"))).filter(Boolean);
    if (children.length) {
      rec.children = children.map((a) => {
        const { number, name } = splitTitle(inlineText(a));
        return { number, title: name, path: resolveRel(relPath, a.attrs.href) };
      });
      // Chapter pages carry no number in their own title; infer "32" from children "32.1", "32.2", ...
      if (!rec.number && relPath.endsWith("_chapter.html")) rec.number = rec.children[0].number?.split(".")[0] ?? null;
    }
  }
  return rec;
}

/** Resolve an href relative to a page path within the archive; strips #fragment. */
export function resolveRel(from, href) {
  if (!href) return null;
  const parts = from.split("/").slice(0, -1);
  for (const seg of href.split("#")[0].split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}
