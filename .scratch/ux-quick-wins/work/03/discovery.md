# 03 discovery: QueryJS tables (Prev/Next, scroll, nowrap, focus rings)

No `spec.md` in `.scratch/ux-quick-wins/`. Rules read: `docs/agents/live-preview-rules.md` (rule 11: interactive widget controls stop `mousedown`).

## Files that change

- `src/lib/plugins/queryjs/kb-ui.ts:411-554` `KBUI.table`: Prev/Next get `addEventListener('mousedown', e => e.stopPropagation())` (pattern at `queryjs-block-widget.ts:217`, `:329`). The `<table>` goes inside a `div.cm-lp-table-scroll`; unpaginated: scroll div appended to the container, `<table>` returned; paginated: `wrapper > [scroll > table, nav]`, wrapper returned.
- `src/lib/plugins/queryjs/kb-api.ts:316-346` `kb.table`: same scroll div, still returns the `<table>`.
- `src/lib/plugins/queryjs/kb-api.ts:489-523` `renderValue`: KBDateTime and Date branches add class `cm-lp-qjs-nowrap`; new `typeof value === 'number'` branch (between Date and the array branch) sets text + the class. Array branch untouched (open-itens 060).
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:917-1005`: add `.cm-lp-qjs-run:focus-visible` and `.cm-lp-qjs-table-nav-btn:focus-visible` (box-shadow copied from `:734-736`, plus `outline: none` so the UA ring does not double it, as `.cm-lp-meta-bind-btn` does in its base rule), `.cm-lp-table-scroll { overflow-x: auto }`, `.cm-lp-qjs-nowrap { white-space: nowrap }`. No rule keys on `cm-lp-collection-table`.

## Tests

- New `src/tests/lib/plugins/queryjs/queryjs-table-pager-click.test.ts`: real CodeMirror, setup copied from `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:1-115` and `src/tests/lib/features/collection/collection-block-click.test.ts` (`mountMarkdownView` + `livePreviewExtensions`, `realClick` with mousedown/mouseup/click). `setResult` now takes `(filePath, jsContent, el)`. Next then Prev: widget drawn, indicator `Page 2 of 3` then `Page 1 of 3`, cursor stays at `end`.
- `kb-ui.test.ts:619` and `:753` adjusted as the Issue says; new tests: unpaginated table parent is `.cm-lp-table-scroll` first child of container; paginated wrapper is first child, nav outside the scroll div; moved table leaves an empty scroll div and nothing throws.
- `kb-api.test.ts`: `kb.table` parent is the scroll div; KBDateTime, Date, number cells carry `cm-lp-qjs-nowrap`, string cell does not.
- `styles.test.ts`: both `:focus-visible` rules use `--ring` (copy the meta-bind test at `:207-211`); `.cm-lp-table-scroll` has `overflow-x: auto`; nowrap rule. Radius ladder untouched.

## Defaults taken

- Nowrap class name `cm-lp-qjs-nowrap` (qjs-keyed, per the Issue's Evidence note).
- `KBUI.defaultRenderValue` (`kb-ui.ts:99-101`) is not changed: it has no type branches (plain `String`), and production always passes KBAPI's `renderValue` (`kb-api.ts:152`); only tests construct `KBUI` without it.
- Ticket 14 has not landed: this Issue defines `.cm-lp-table-scroll`.
- Contract types (`contract/kb-api.v1.ts`) unchanged; item 5 compatibility is pinned by a test, no docs or opt-out.

## Risks

- Scripts that read `container.firstElementChild` as the table change behaviour (accepted, item 5).
- `outline: none` on `:focus-visible` is the one line beyond the copied box-shadow.
