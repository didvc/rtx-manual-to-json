// toc.html (DITA bookmap) → nested tree [{ title, number, path, children }]
import { parseHtml, find, sel, elements, inlineText } from "./html.mjs";
import { splitTitle } from "./extract.mjs";

export function parseToc(html) {
  const root = parseHtml(html);
  const map = find(root, sel("ul.map"));
  const walk = (ul) =>
    elements(ul)
      .filter((e) => e.tag === "li")
      .map((li) => {
        const a = elements(li).find((e) => e.tag === "a");
        const { number, name } = splitTitle(a ? inlineText(a) : "");
        const sub = elements(li).find((e) => e.tag === "ul");
        const node = { title: name, number, path: a?.attrs.href?.split("#")[0] ?? null };
        if (sub) node.children = walk(sub);
        return node;
      });
  const title = find(root, (n) => n.tag === "meta" && n.attrs.name === "DC.title")?.attrs.content ?? null;
  return { title, tree: map ? walk(map) : [] };
}
