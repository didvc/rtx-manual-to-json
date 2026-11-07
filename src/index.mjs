// Library entry: convert an extracted Cmdref_HTML_Archive html/ directory to JSON records.
import fs from "node:fs";
import path from "node:path";
import { extractPage } from "./extract.mjs";
import { parseToc } from "./toc.mjs";

export { extractPage } from "./extract.mjs";
export { parseToc } from "./toc.mjs";
export { blocksToText } from "./blocks.mjs";
export { parseHtml } from "./html.mjs";

export const VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;

/** Navigation-only files with no reference content. */
const SKIP = new Set(["index.html", "toc.html", "defaultpage.html", "cmdref_index.html"]);

/** List page paths (relative, "/"-separated, sorted) under the html/ root. */
export function listPages(inputDir) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".html") && !SKIP.has(e.name)) out.push(path.relative(inputDir, full).split(path.sep).join("/"));
    }
  };
  walk(inputDir);
  return out.sort();
}

/** Pull "Rev.x.yy.zz" firmware revisions out of the bookmap title. */
export const parseRevisions = (title) => [...new Set(title?.match(/Rev\.\d+(?:\.\d+)*/g) ?? [])];

/**
 * Convert the archive. Yields records one at a time so callers can stream.
 * @param {string} inputDir
 * @param {{ filter?: (relPath: string) => boolean, onError?: (relPath: string, err: Error) => void }} [opts]
 */
export function* convertPages(inputDir, { filter = () => true, onError } = {}) {
  for (const rel of listPages(inputDir).filter(filter)) {
    try {
      yield extractPage(fs.readFileSync(path.join(inputDir, rel), "utf8"), rel);
    } catch (err) {
      if (onError) onError(rel, err);
      else throw err;
    }
  }
}

/** Read toc.html (if present) → { title, revisions, tree }. */
export function readToc(inputDir) {
  const p = path.join(inputDir, "toc.html");
  if (!fs.existsSync(p)) return null;
  const toc = parseToc(fs.readFileSync(p, "utf8"));
  return { title: toc.title, revisions: parseRevisions(toc.title), tree: toc.tree };
}
