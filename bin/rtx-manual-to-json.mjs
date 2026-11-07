#!/usr/bin/env node
// rtx-manual-to-json: Yamaha RTX command reference HTML archive → JSON
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { convertPages, readToc, VERSION, SCHEMA_VERSION } from "../src/index.mjs";

const HELP = `rtx-manual-to-json ${VERSION}

Usage: rtx-manual-to-json [options]

Options:
  -i, --input <dir>      Extracted archive html/ directory
                         (default: ./Cmdref_HTML_Archive/html)
  -o, --output <path>    Output file, or directory with --split
                         (default: ./rtx-commands.json, .jsonl with --jsonl, ./out with --split)
      --jsonl            Write one JSON record per line (no toc/meta wrapper)
      --split            Write one .json file per page, mirroring the archive tree
      --pretty           Indent JSON output
      --include <regex>  Only pages whose relative path matches
      --exclude <regex>  Skip pages whose relative path matches
      --model <name>     Only commands whose [適用モデル] lists this model
                         (repeatable: --model A --model B)
      --commands-only    Skip concept/chapter pages
      --stats            Print size statistics
  -h, --help             Show this help
  -v, --version          Show version
`;

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      jsonl: { type: "boolean" },
      split: { type: "boolean" },
      pretty: { type: "boolean" },
      include: { type: "string" },
      exclude: { type: "string" },
      model: { type: "string", multiple: true },
      "commands-only": { type: "boolean" },
      stats: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  }));
} catch (e) {
  console.error(`${e.message}\n\n${HELP}`);
  process.exit(2);
}

if (opts.help) { console.log(HELP); process.exit(0); }
if (opts.version) { console.log(VERSION); process.exit(0); }
if (opts.jsonl && opts.split) { console.error("Error: --jsonl and --split are mutually exclusive."); process.exit(2); }
if (opts.include && opts.exclude) { console.error("Error: --include and --exclude are mutually exclusive."); process.exit(2); }

const input = path.resolve(opts.input ?? "Cmdref_HTML_Archive/html");
if (!fs.existsSync(path.join(input, "toc.html"))) {
  console.error(`Input does not look like the archive html/ root (no toc.html): ${input}`);
  process.exit(1);
}
const output = path.resolve(opts.output ?? (opts.split ? "out" : opts.jsonl ? "rtx-commands.jsonl" : "rtx-commands.json"));

const includeRe = opts.include ? new RegExp(opts.include) : null;
const excludeRe = opts.exclude ? new RegExp(opts.exclude) : null;
const filter = (rel) => (!includeRe || includeRe.test(rel)) && (!excludeRe || !excludeRe.test(rel));

const models = opts.model?.length ? new Set(opts.model.map((m) => m.toUpperCase())) : null;

const indent = opts.pretty ? 2 : 0;
const stringify = (v) => JSON.stringify(v, null, indent);

let errors = 0;
const onError = (rel, err) => { errors++; console.error(`ERROR: ${rel}: ${err.message}`); };

const records = [];
let inputBytes = 0;
for (const rec of convertPages(input, { filter, onError })) {
  if (opts["commands-only"] && rec.kind !== "command") continue;
  if (models && rec.kind === "command" && !rec.models?.some((m) => models.has(m.toUpperCase()))) continue;
  if (opts.stats) inputBytes += fs.statSync(path.join(input, rec.path)).size;
  records.push(rec);
}

let outputBytes = 0;
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  outputBytes += Buffer.byteLength(data);
};

if (opts.split) {
  for (const rec of records) write(path.join(output, rec.path.replace(/\.html$/, ".json")), stringify(rec) + "\n");
  const toc = readToc(input);
  if (toc) write(path.join(output, "_toc.json"), stringify(toc) + "\n");
} else if (opts.jsonl) {
  write(output, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
} else {
  const toc = readToc(input);
  const doc = {
    schemaVersion: SCHEMA_VERSION,
    generator: `rtx-manual-to-json ${VERSION}`,
    source: { title: toc?.title ?? null, revisions: toc?.revisions ?? [] },
    ...(models && { models: [...models] }),
    toc: toc?.tree ?? [],
    pages: records,
  };
  write(output, stringify(doc) + "\n");
}

const nCmd = records.filter((r) => r.kind === "command").length;
console.error(`Done: ${records.length} pages (${nCmd} commands, ${records.length - nCmd} other), ${errors} errors → ${output}`);
if (opts.stats) {
  const fmt = (n) => n.toLocaleString("en-US");
  const pct = inputBytes ? (((inputBytes - outputBytes) / inputBytes) * 100).toFixed(1) : "0.0";
  console.error(`  input  : ${fmt(inputBytes)} bytes\n  output : ${fmt(outputBytes)} bytes\n  reduce : ${pct}%`);
}
process.exit(errors ? 1 : 0);
