# Discovery: Issue 09 (click-reveal coverage gaps)

No `spec.md` for this feature; `report.md` section 5 is the source. Tests only, no app code. Issues 01-08 are done, so the band bugs of report 2.1 are fixed and the band tests pass today: new band-style tests expect the fixed behavior (cursor on the neighbouring line, `''` for a blank one).

## Harness changes (e2e only)
- `e2e/fixtures/live-preview.ts:38` `openMarkdownFile`: optional `extraFiles` (vault-relative path -> content), seeded with the note before the vault opens. `e2e/fixtures/click-reveal.ts:17` `openAndSettle` forwards it.
- `e2e/fixtures/click-reveal.ts`: `clickTextInLine` (moved from `wikilink.spec.ts:13`, now shared) and `selection(page)` (main selection text, read through `.cm-content`'s `cmTile.root.view` as `properties-cross-note.spec.ts:45` does).
- `e2e/mocks/tauri-opener.ts:9` `openUrl` records its URLs on `window.__e2e.opener.urls` (typed in `e2e/types/global.d.ts`), so Cmd/Ctrl+click asserts the opener was called.
- Existing image: `page.route('**/test-vault/<name>.png')` serves a stub PNG (prior art `e2e/specs/embed-widgets.spec.ts:19`); `convertFileSrc` mock returns the path as-is.

## Where each zone goes
- Existing image / note embed: `wikilink-image-embed.spec.ts`, `wikilink-note-embed.spec.ts` (second describe, seeded files).
- `date()` + unknown `INPUT[foo():x]`: `meta-bind-text-input.spec.ts` (unknown type renders raw: `pickWidget` returns null, `meta-bind-input-plugin.ts:103-125`).
- Inline marks, hard break: new `inline-formatting.spec.ts`. Autolink, bare URL, Cmd/Ctrl+click opener: `markdown-link.spec.ts`.
- `^blk` and `[^1]: def`: `footnotes.spec.ts` (`^blk` is `display:none` off its line, `block-reference-handler.ts:20`, so "clicked directly" = click it once its line is active).
- Callout title, collapsed (`[!note]-`), nested: `callout-text.spec.ts`.
- Table header cell, formatted cell, checkbox cell: `table.spec.ts`.
- Wikilink alias, Cmd/Ctrl+click wikilink: `wikilink.spec.ts`.
- Widget on first / last doc line: new `doc-edge-widgets.spec.ts`. Drag-select: new `drag-select.spec.ts`.
- Collection calendar / linear-calendar / empty / error, QueryJS output text: `collection-block.spec.ts`, `queryjs-block.spec.ts`. Audio 4px padding: `audio-player.spec.ts`.

## Low findings
- `collection-block.spec.ts:28`: seed `Other-Note.md` through `extraFiles` and use it instead of the unseeded `Daily-Note`.
- `meta-bind-text-input.spec.ts:44` and `meta-bind-inline-select.spec.ts:70`: wait past the 2 s body save debounce before comparing the file (also compare the editor doc at once).
- Titles: `selectOption` tests say "selectOption (no mouse press)"; "mouse click opens the dropdown" tests say what they check (focus / no reveal), since a native dropdown cannot be observed.

## Defaults taken
- Expected outcomes follow the owner rule: blank space never reveals, a widget body keeps today's behavior, controls act without revealing, text clicks follow the line rule (reveal the line's syntax, cursor on it).
- Audio padding: the padding is the widget body, so the expected cursor is "End line." (where a click on the player leaves it). A mismatch is a known bug (`test.fail()`).
- A new test that exposes a bug gets `test.fail()` + `// Known bug:` and a Notes entry with root cause file:line.

## Risks
- Pixel-level zones (4 px padding, doc-edge bands) can flake; each asserts the hit element first. Gate: the folder twice with `--retries=0`.
