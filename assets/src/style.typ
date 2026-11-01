#let ink = rgb("#1f2328")
#let mute = rgb("#59636e")
#let line = rgb("#d1d9e0")
#let soft = rgb("#f6f8fa")
#let accent = rgb("#0969da")
#let accent-soft = rgb("#ddf4ff")
#let setup(body) = {
  set page(width: auto, height: auto, margin: 18pt, fill: white)
  set text(font: ("DejaVu Sans", "Noto Sans CJK JP"), size: 10pt, fill: ink)
  show raw: set text(font: ("DejaVu Sans Mono", "Noto Sans Mono CJK JP"), size: 8.5pt)
  body
}
#let card(title: none, fill: soft, stroke: line, width: auto, body) = box(
  width: width, fill: fill, stroke: 0.8pt + stroke, radius: 6pt, inset: 9pt,
)[
  #if title != none [#text(weight: "bold", title) #v(3pt, weak: true)]
  #body
]
#let arrow(label: none) = align(center + horizon, stack(dir: ttb, spacing: 3pt,
  if label != none { text(size: 7.5pt, fill: mute, label) },
  text(size: 16pt, fill: mute, sym.arrow.r),
))
#let tag(s) = box(fill: accent-soft, radius: 3pt, inset: (x: 4pt, y: 2pt), text(size: 8pt, fill: accent, raw(s)))
