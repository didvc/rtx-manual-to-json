#import "style.typ": *
#show: setup

// Commands listing each model in [適用モデル] (archive Rev.8.02.53 – Rev.15.04.04; 1,215 commands)
#let data = (
  ("RTX1210", 1035, "Rev.14.01"), ("RTX1220", 1010, "Rev.15.04"), ("RTX830", 1002, "Rev.15.02"),
  ("RTX1200", 948, "Rev.10.01"), ("RTX810", 896, "Rev.11.01"), ("RTX5000", 857, "Rev.14.00"),
  ("RTX3500", 857, "Rev.14.00"), ("RTX3000", 717, "Rev.9.00"), ("SRT100", 662, "Rev.10.00"),
  ("RTX1100", 647, ""), ("RTX1500", 630, ""), ("RT107e", 559, "Rev.8.03"), ("RT250i", 405, ""),
)
#let total = 1215
#let full = 300pt
#let peak = 1035
#let hl = ()

#text(size: 13pt, weight: "bold")[Commands per model]
#h(8pt) #text(size: 9pt, fill: mute)[of #total command pages; `--model` keeps these]
#v(8pt)
#grid(
  columns: (auto, auto, auto, auto), column-gutter: 8pt, row-gutter: 5pt, align: (right + horizon, left + horizon, left + horizon, left + horizon),
  ..data.map(((m, n, rev)) => {
    let on = m in hl
    (
      text(weight: if on { "bold" } else { "regular" }, m),
      box(width: full, stack(dir: ltr,
        box(width: full * n / peak, height: 11pt, radius: (left: 2pt, right: 2pt), fill: if on { accent } else { line }),
      )),
      text(size: 8.5pt, fill: if on { accent } else { mute }, str(n)),
      text(size: 8pt, fill: mute, rev),
    )
  }).flatten()
)
#v(6pt)
#text(size: 8pt, fill: mute)[Firmware column: the revision line the archive documents for that model (blank: not stated per model).]
