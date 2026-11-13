# Issue 51 discovery: TRIADA scripts render a page link as "[object Object]"

## Cause

`kb.span(text: string, ...)` (`src/lib/plugins/queryjs/kb-api.ts:241`) goes through `el()`,
which sets `textContent = text`; a `KBLink` stringifies to `[object Object]`.

## Inline form?

None. Only `kb.header` (`kb-api.ts:229`), `kb.list` (`:246`) and `kb.table` cells route
through `renderValue` (`:405`), which turns a `KBLink` into a clickable `<a>`. `span`,
`paragraph` and `el` take strings only.

## Plan (script-only, no API change)

- `help/examples/triada/__system/queryjs/triada-inbox.js:28`: `kb.span(p.file.link)` ->
  `kb.header(5, p.file.link)` (the section header is h4, so each note is a sub-heading
  above its task list).
- `help/examples/triada/__system/queryjs/triada-parent-outcomes.js:28`:
  `kb.span(parent.file.link)` -> `kb.header(5, parent.file.link)`, keeping the
  `${parentLabel}: ` paragraph as the label.
- Update the six snapshots in `src/tests/help/__snapshots__/queryjs-contract.test.ts.snap`
  with `pnpm vitest run src/tests/help/queryjs-contract.test.ts -u`, then check that none
  contains `[object Object]` and each shows the note name.

## Prior art

`help/examples/queryjs-features/__system/queryjs/_shared-open-tasks.js:36`
(`kb.header(4, p.file.link)` above a `kb.taskList`). Same shape as the inbox loop.

## Defaults taken

- Header over `kb.list([link])`: a one-item bullet list reads worse than a heading, and
  the header form is already used for "note name above its tasks".
- Not widening `kb.span` to accept `KBLink` (Dataview's `dv.span` does): the Issue asks
  for an existing call that accepts `KBLink`, and an API change would need its own tests
  and docs.

## Risks

- Block-level heading instead of inline span: layout changes slightly (the label
  "Week: " now sits on its own line above the link). The original was already on a
  separate line, since `kb.paragraph` is a block element.
