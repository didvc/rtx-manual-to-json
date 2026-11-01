#import "style.typ": *
#show: setup

#text(size: 13pt, weight: "bold")[One command page → one JSON record]
#h(8pt) #text(size: 9pt, fill: mute)[synthetic example (test fixture)]
#v(8pt)

#let left(head, body) = card(width: 235pt, fill: white)[
  #text(size: 8.5pt, weight: "bold", fill: mute, head) #v(2pt, weak: true)
  #text(size: 9pt, body)
]
#let right(body) = card(width: 345pt)[#raw(body, lang: "json")]

#grid(
  columns: 3, column-gutter: 8pt, row-gutter: 7pt, align: horizon,
  text(weight: "bold")[HTML page], [], text(weight: "bold")[JSON],
  left("9.1 Widget setting")[コマンド: widget set · 親トピック: Demo],
  arrow(),
  right("\"number\": \"9.1\", \"title\": \"Widget setting\",\n\"commands\": [\"widget set\"],\n\"parent\": { \"title\": \"Demo\", ... }"),

  left("[書式]")[#raw("widget set id [mode=mode]")],
  arrow(),
  right("\"syntax\": [{ \"text\": \"widget set id [mode=mode]\",\n  \"tokens\": [ {\"t\":\"kwd\",\"v\":\"widget\"},\n    {\"t\":\"var\",\"v\":\"id\"},\n    {\"t\":\"sep\",\"v\":\"[\"}, ... ] }]"),

  left("[設定値及び初期値]")[*id* \ [設定値] : Widget number (1..10) \ [初期値] : -],
  arrow(),
  right("\"parameters\": [{ \"names\": [\"id\"],\n  \"values\": [{ \"type\": \"p\",\n    \"text\": \"Widget number (1..10)\" }],\n  \"default\": [] }]"),

  left("[説明]")[Sets the widget.],
  arrow(),
  right("\"description\": [{ \"type\": \"p\",\n  \"text\": \"Sets the widget.\" }]"),

  left("[適用モデル]")[MODEL-A, MODEL-B],
  arrow(),
  right("\"models\": [\"MODEL-A\", \"MODEL-B\"]"),
)
#v(6pt)
#text(size: 8pt, fill: mute)[Tables become `{header, rows}` with merged cells expanded. Unknown section headings go to `extraSections` instead of being dropped.]
