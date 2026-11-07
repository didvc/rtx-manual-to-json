# rtx-manual-to-json

Converts the Yamaha RTX router command reference HTML archive (`Cmdref_HTML_Archive.zip`) into structured JSON. Each command keeps its syntax as tokens, its parameters with their defaults, and the list of models it applies to.

Plain Node.js ESM. No dependencies, no build step.

![Pipeline: archive HTML → parser → per-page extraction → JSON outputs](assets/pipeline.png)

## Requirements

- Node.js 20+
- The archive. Download `Cmdref_HTML_Archive.zip` from https://www.rtpro.yamaha.co.jp/RT/manual/rt-common/ and extract it so `Cmdref_HTML_Archive/html/toc.html` exists.

## Usage

```bash
git clone https://github.com/didvc/rtx-manual-to-json
cd rtx-manual-to-json

node bin/rtx-manual-to-json.mjs                       # → rtx-commands.json
node bin/rtx-manual-to-json.mjs --jsonl               # → rtx-commands.jsonl (one page per line)
node bin/rtx-manual-to-json.mjs --split -o out        # → out/<category>/<page>.json + out/_toc.json
node bin/rtx-manual-to-json.mjs --include '^ip/' --pretty -o ip.json
node bin/rtx-manual-to-json.mjs -i path/to/html --commands-only --stats
node bin/rtx-manual-to-json.mjs --model RTX1220 -o rtx1220.json   # one model only
```

| flag | description | default |
|---|---|---|
| `-i, --input <dir>` | archive `html/` directory | `./Cmdref_HTML_Archive/html` |
| `-o, --output <path>` | output file (directory with `--split`) | `rtx-commands.json` / `.jsonl` / `out` |
| `--jsonl` | one JSON record per line | off |
| `--split` | one file per page | off |
| `--pretty` | indent output | off |
| `--include <regex>` / `--exclude <regex>` | filter by relative path, e.g. `<category>/<page>.html` | none |
| `--model <name>` | keep only commands that list this model in `[適用モデル]`; repeatable | all |
| `--commands-only` | skip concept and chapter pages | off |
| `--stats` | print input/output size | off |

The command exits with status 1 if any page fails to parse.

### Per-model output

Every command page lists the models it applies to under `[適用モデル]`. `--model` keeps only the commands for the models you name. The archive documents each model at one firmware line, shown in the chart below.

![Commands per model in the archive](assets/models.png)

The filter keeps or drops whole commands. Firmware notes inside a command's text, such as "… は Rev.xx.yy.zz 以降", stay as they are.

## Output

One command page becomes one record. The example below is synthetic (it matches the test fixture), not taken from the reference:

![HTML sections mapped to JSON fields](assets/mapping.png)

In full:

```json
{
  "id": "demo_widget",
  "path": "demo/demo_widget.html",
  "kind": "command",
  "number": "9.1",
  "title": "Widget setting",
  "category": "demo",
  "parent": { "title": "Demo", "path": "demo/demo_chapter.html" },
  "commands": ["widget set"],
  "syntax": [
    {
      "text": "widget set id [mode=mode]",
      "tokens": [
        { "t": "kwd", "v": "widget" }, { "t": "kwd", "v": "set" }, { "t": "var", "v": "id" },
        { "t": "sep", "v": "[" }, { "t": "lit", "v": "mode" }, { "t": "sep", "v": "=" },
        { "t": "var", "v": "mode" }, { "t": "sep", "v": "]" }
      ]
    }
  ],
  "parameters": [
    { "names": ["id"], "values": [{ "type": "p", "text": "Widget number (1..10)" }], "default": [] }
  ],
  "description": [{ "type": "p", "text": "Sets the widget." }],
  "models": ["MODEL-A", "MODEL-B"]
}
```

The full schema is in [docs/schema.md](docs/schema.md).

## Library use

```js
import { convertPages, readToc, extractPage, blocksToText } from "./src/index.mjs";

for (const page of convertPages("Cmdref_HTML_Archive/html", { filter: (p) => p.startsWith("ip/") })) {
  if (page.kind === "command") console.log(page.commands[0], page.models.length);
}
```

## Layout

```
bin/rtx-manual-to-json.mjs   CLI
src/index.mjs                public API: convertPages, readToc, listPages
src/extract.mjs              one page → one record
src/blocks.mjs               body HTML → Block[] (paragraphs, lists, tables, pre, notes)
src/toc.mjs                  toc.html → tree
src/html.mjs                 small XHTML parser and query helpers
test/                        node:test suite with synthetic fixtures
assets/                      README images; Typst sources in assets/src/
```

To rebuild the images (tested with Typst 0.15; needs Noto Sans CJK JP):

```bash
cd assets/src && for f in pipeline mapping models; do typst compile --root .. --ppi 200 $f.typ ../$f.png; done
```

## Tests

```bash
node --test test/*.test.mjs
```

## Legal

"Yamaha" and "RTX" are registered trademarks of Yamaha Corporation.

rtx-manual-to-json is an independent community project. It is not a Yamaha product, and Yamaha Corporation has no affiliation with it and has not endorsed or sponsored it. To avoid confusion, please do not contact Yamaha Corporation about this tool.

The command reference is © Yamaha Corporation. All Rights Reserved. This repository holds converter code, synthetic test fixtures and diagrams. It contains no data parsed from the reference and distributes none. You bring your own data: download the HTML archive yourself from the official source, https://www.rtpro.yamaha.co.jp/RT/manual/rt-common/.

By using this tool, you agree to follow Yamaha Corporation's terms of use for its documentation, as published on the RTpro site.

## Disclaimer

This tool is provided "as is", without warranty of any kind. The parser is not guaranteed to be free of errors, and its output may not represent every command, parameter or constraint in the source correctly. A parsing bug can drop, truncate or misformat content.

The output is derived entirely from Yamaha's HTML. Errors, typos and outdated information in the source, such as firmware changes the reference does not yet reflect, pass into the output unchanged. This project is not responsible for inaccuracies in the upstream documents.

The commands in the reference configure network infrastructure. Do not apply a command or configuration taken from this output to a production network until you have checked it against the official Yamaha documentation and tested it outside production. Feeding the output to an LLM, a RAG system or an agentic pipeline adds hallucination risk on top of this.

The developer is not liable for any damages arising from the use of this tool or its output, including but not limited to network downtime, data loss and security breaches.

## License

Apache 2.0. See [LICENSE](LICENSE).

## Contact

Open an issue, or email `film-rigor-shingle[at]duck.com`.
