# Canvas examples

Open `product-brainstorm.canvas` in Kokobrain to see all five canvas node
types in a single board:

| Node | Where in the example |
|------|----------------------|
| `text` | "Driving question", "Hypothesis", "Experiment", "Risk" cards |
| `file` | The "interview-notes" card (renders the markdown inline) |
| `link` | The "JSON Canvas 1.0 spec" card (opens the URL) |
| `image` | The dashboard mockup on the right |
| `group` | The blue "Research" container around the three left-column cards |

The edges demonstrate:

- Preset colors (`color: "1"`, `"4"`, `"6"`) and a custom hex (`#d62828`).
- Labels (`supports`, `tested by`, `watch out for`).
- Sided connections (`fromSide`, `toSide`) for clean routing.
- A no-arrow edge (`fromEnd: "none"`, `toEnd: "none"`) between the spec
  link and the mockup.

The `image` node references `dashboard-mockup.png` — drop any PNG/JPG at
that path to see the image render. If the file is missing, the node still
loads (just empty) so the rest of the canvas is browsable.

## Inside a large vault

A canvas reads only the files its nodes name, so this board never lists or
reads your other notes. File and image paths in a `.canvas` are
vault-relative (JSON Canvas stores them that way):
`help/examples/canvas-features/interview-notes.md` only resolves when this
folder sits at `help/examples/canvas-features/` from the vault root, as in
the help vault. Copied anywhere else, the "interview-notes" card shows
"Could not load file" and the image node stays empty; the text, link and
group nodes and the edges still render. Edit the `file` paths in the
`.canvas` to point at the copy.

See [Canvas](../../documentation/11-canvas.md) for the full feature guide
and [JSON Canvas 1.0](https://jsoncanvas.org) for the file format spec.
