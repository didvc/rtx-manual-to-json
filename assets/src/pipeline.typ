#import "style.typ": *
#show: setup

#text(size: 13pt, weight: "bold")[rtx-manual-to-json: pipeline]
#v(8pt)
#grid(
  columns: 7, column-gutter: 6pt, align: horizon,
  card(title: "Input", width: 150pt)[
    #raw("Cmdref_HTML_Archive/html/") \
    #text(size: 8.5pt, fill: mute)[1,370 DITA XHTML pages + toc.html]
  ],
  arrow(label: "parse"),
  card(title: "html.mjs", width: 105pt)[
    #text(size: 8.5pt)[small XHTML parser \ tree + query helpers \ no dependencies]
  ],
  arrow(label: "per page"),
  card(title: "extract.mjs", width: 205pt)[
    #set text(size: 8.5pt)
    #tag("[書式]") → syntax \
    #tag("[設定値及び初期値]") → parameters \
    #tag("[説明] [ノート] …") → blocks \
    #tag("[適用モデル]") → models
  ],
  arrow(label: "filter"),
  card(title: "Output", width: 205pt, fill: accent-soft, stroke: accent)[
    #set text(size: 8.5pt)
    #raw("rtx-commands.json") #h(1fr) one file \
    #raw("rtx-commands.jsonl") #h(1fr) per line \
    #raw("out/<cat>/<page>.json") #h(1fr) split \
    #raw("--model <MODEL>") #h(1fr) per model
  ],
)
#v(6pt)
#text(size: 8pt, fill: mute)[blocks.mjs turns body HTML into p / pre / list / table / note blocks. toc.mjs builds the chapter tree and firmware revision list.]
