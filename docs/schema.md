# Output schema (schemaVersion 1)

## Top level (default `.json` output)

```jsonc
{
  "schemaVersion": 1,
  "generator": "rtx-manual-to-json 0.1.0",
  "source": {
    "title": "...Rev.x.yy.zz, Rev.x.yy.zz...",  // raw bookmap title
    "revisions": ["Rev.x.yy.zz", "..."]
  },
  "toc": [ TocNode ],
  "pages": [ Page ]
}
```

`--jsonl` writes one `Page` per line with no wrapper. `--split` writes one `Page` per file plus `_toc.json` (`{ title, revisions, tree }`).

## TocNode

```jsonc
{ "title": "Widget setting", "number": "9.1", "path": "demo/demo_widget.html", "children": [TocNode] }
```

`children` is omitted on leaves. `number` is `null` for chapters, because the TOC does not number them.

## Page

Shared fields:

| field | type | notes |
|---|---|---|
| `id` | string | `DC.identifier`, e.g. `demo_widget` |
| `path` | string | relative to `html/`, e.g. `demo/demo_widget.html` |
| `kind` | `"command"` \| `"concept"` | from `DC.type` (`reference` becomes `command`) |
| `number` | string \| null | section number, e.g. `"9.1"`. For chapter pages it is inferred from their children |
| `title` | string | title without the number |
| `category` | string \| null | top-level directory |
| `parent` | `{ title, path }` \| null | parent topic |

### `kind: "command"`

| field | source heading | type |
|---|---|---|
| `commands` | `DC.subject` meta | string[] |
| `syntax` | `[書式]` | `SyntaxLine[]` |
| `parameters` | `[設定値及び初期値]` | `Parameter[]` |
| `description` | `[説明]` | `Block[]` |
| `notes` | `[ノート]` | `Block[]` |
| `examples` | `[設定例]` | `Block[]` |
| `outputExamples` | `[表示例]` | `Block[]` |
| `initialConfig` | `[初期設定]` | `Block[]` |
| `extendedLicense` | `[拡張ライセンス対応]` | `Block[]` |
| `models` | `[適用モデル]` | string[] |
| `extraSections` | any other heading | `{ heading, blocks: Block[] }[]` |

A field is omitted when its section is missing from the page.

### `kind: "concept"`

| field | type |
|---|---|
| `blocks` | `Block[]` body content |
| `children` | `{ number, title, path }[]`, child topics (chapter pages) |

## SyntaxLine

```jsonc
{
  "text": "widget set id [mode=mode]",
  "tokens": [
    { "t": "kwd", "v": "widget" },    // command keyword
    { "t": "var", "v": "id" },         // user-supplied value
    { "t": "lit", "v": "mode" },       // literal option word
    { "t": "sep", "v": "[" }           // punctuation: / [ ] = ... | etc.
  ]
}
```

Whitespace separators are dropped from `tokens`. `text` keeps the spacing.

## Parameter

```jsonc
{ "names": ["id"], "values": [Block], "default": [Block], "extra"?: [Block] }
```

`names` usually has one entry. Some parameters list aliases. A default of ` - ` (none) becomes `[]`.

## Block

```jsonc
{ "type": "p", "text": "..." }                                // paragraph; "\n" from <br> or source lines
{ "type": "pre", "text": "..." }                              // preformatted, whitespace kept
{ "type": "list", "ordered": false, "items": [[Block]] }
{ "type": "table", "header": ["..."] | null, "rows": [["..."]] }  // rowspan/colspan expanded
{ "type": "note", "kind": "note" | "caution", "blocks": [Block] }
{ "type": "image", "src": "...", "alt": "..." }
```

`blocksToText(blocks)` from `src/index.mjs` flattens blocks to plain text.
