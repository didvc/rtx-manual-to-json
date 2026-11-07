import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPage, convertPages, readToc, blocksToText, parseHtml } from "../src/index.mjs";

const HTML = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "html");
const read = (rel) => fs.readFileSync(path.join(HTML, rel), "utf8");
const widget = () => extractPage(read("demo/demo_widget.html"), "demo/demo_widget.html");

test("page metadata", () => {
  const r = widget();
  assert.equal(r.id, "demo_widget");
  assert.equal(r.kind, "command");
  assert.equal(r.number, "9.1");
  assert.equal(r.title, "Widget setting");
  assert.equal(r.category, "demo");
  assert.deepEqual(r.commands, ["widget set"]);
  assert.deepEqual(r.parent, { title: "Demo", path: "demo/demo_chapter.html" });
});

test("syntax lines and tokens", () => {
  const [a, b] = widget().syntax;
  assert.equal(a.text, "widget set id [mode=mode]");
  assert.deepEqual(a.tokens, [
    { t: "kwd", v: "widget" }, { t: "kwd", v: "set" }, { t: "var", v: "id" },
    { t: "sep", v: "[" }, { t: "lit", v: "mode" }, { t: "sep", v: "=" }, { t: "var", v: "mode" }, { t: "sep", v: "]" },
  ]);
  assert.equal(b.text, "no widget set");
});

test("parameters: text, table with rowspan, plain-text name", () => {
  const [id, mode, auto] = widget().parameters;
  assert.deepEqual(id, { names: ["id"], values: [{ type: "p", text: "Widget number (1..10)" }], default: [] });
  assert.deepEqual(mode.values, [{ type: "table", header: ["Value", "Meaning"], rows: [["fast", "A & B"], ["fast", "C < D"]] }]);
  assert.deepEqual(mode.default, [{ type: "p", text: "fast" }]);
  assert.deepEqual(auto.names, ["auto"]);
  assert.deepEqual(auto.values, [{ type: "p", text: "Automatic mode" }]);
});

test("description, examples, models, unknown sections", () => {
  const r = widget();
  assert.deepEqual(r.description, [
    { type: "p", text: "Sets the widget. See widget show." },
    { type: "p", text: "line one\nline two" },
  ]);
  assert.deepEqual(r.examples, [{ type: "pre", text: "# widget set 1\n# widget set 2 mode=fast" }]);
  assert.deepEqual(r.models, ["MODEL-A", "MODEL-B"]);
  assert.deepEqual(r.extraSections, [{ heading: "[未知の節]", blocks: [{ type: "p", text: "Something new" }] }]);
  assert.equal(blocksToText(r.description), "Sets the widget. See widget show.\n\nline one\nline two");
});

test("chapter page infers number and lists children", () => {
  const r = extractPage(read("demo/demo_chapter.html"), "demo/demo_chapter.html");
  assert.equal(r.kind, "concept");
  assert.equal(r.number, "9");
  assert.deepEqual(r.children, [{ number: "9.1", title: "Widget setting", path: "demo/demo_widget.html" }]);
});

test("toc and revisions", () => {
  const toc = readToc(HTML);
  assert.deepEqual(toc.revisions, ["Rev.1.00.01", "Rev.2.00.02", "Rev.3.00.03"]);
  assert.equal(toc.tree[0].children[0].path, "demo/demo_widget.html");
});

test("convertPages walks the tree and skips toc.html", () => {
  assert.deepEqual([...convertPages(HTML)].map((r) => r.path), ["demo/demo_chapter.html", "demo/demo_widget.html"]);
});

test("html parser tolerates unclosed tags and entities", () => {
  const root = parseHtml("<div><p>a &amp; b<p>c &#x41;</div>");
  assert.equal(root.children[0].tag, "div");
  assert.equal(JSON.stringify(root, (k, v) => (k === "parent" ? undefined : v)).includes("a & b"), true);
});
