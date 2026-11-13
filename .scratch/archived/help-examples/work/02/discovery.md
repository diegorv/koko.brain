# 02 discovery: scope queryjs-features examples

Template: issue 01's `help/examples/SCOPING.md` QueryJS pattern and its guard
`src/tests/help/examples-scoping.test.ts`. Only QueryJS lives in this folder (no
collection, `.view`, auto-move or type definitions).

## Reads that change (all `kb.pages` calls in the folder)
- Notes: `daily-2026-02-13.md:31` (`kb.pages()`), `yearly-2026.md:30,66` (`'#type/journal/daily'`).
- `__system/queryjs/`: `_shared-open-tasks.js:18`, `_shared-period-radar.js:39`,
  `_shared-weekly-radar.js:41`, `meeting-list.js:13`, `note-shortlist.js:16`,
  `project-progress-bars.js:5`, `project-status-cards.js:5`, `recent-edits-timeline.js:5`,
  `tag-count.js:2`, `tag-heatmap.js:8`, `vault-overview-cards.js:5`, `vault-tag-cloud.js:6`,
  `weekly-meeting-list.js:12`, `yearly-{exercise,sleep}-{heatmap,vertical}.js:5`,
  `yearly-wellness-heatmap.js:5`.
- Guard: drop the 20 `02:` entries from `ALLOWLIST`.

## Plan
1. Test first: remove the `02:` allowlist entries, see the guard fail on this folder.
2. Rewrite each read as ``kb.pages(`"${here}"`)`` with `here = kb.current().file.folder`,
   moving a tag source to `.whereTag(...)` (same subtag semantics as `parseSource`,
   `data-array.ts:55`). Every caller note sits at the example root and `kb.current()` is the
   calling note inside `kb.view()` scripts, so `here` is the example folder. Reword "vault"
   copy in comments/empty messages of the vault-wide demos (tag cloud, overview cards).
3. `kb.view()` paths resolve from the vault root (SCOPING.md gap). Notes calling them
   (`dashboard.md`, `yearly-2026.md`, `weekly-2026-W07.md`, `daily-2026-02-13.md`) get a top
   line: open this folder as its own vault. Their `Resources/help/examples/queryjs-features/`
   prefix (a personal-vault path) becomes `__system/queryjs/` like `dashboard.md`, and the
   scripts' inner `_system/queryjs/_shared-*` calls become `__system/queryjs/` (the folder
   that exists here). Without it the examples break in every layout.
4. `pnpm check` + guard test + `src/tests/plugins/queryjs` tests.

## Prior art
- Issue 01 guard unit cases (folder source template, chained `.where`).

## Risks / defaults taken
- `templates/*.md` (issue 05) call `_system/queryjs/<chart>`; those paths resolve nowhere in
  the help layouts today, so changing the inner `_system` paths breaks nothing that works.
- Folder source is a substring match: a sibling `queryjs-features-old` also matches (accepted
  in SCOPING.md).
- `kb.current()` null (note not indexed yet) throws inside the script and renders the widget
  error, same as the SCOPING.md pattern; no fallback (a `??` fallback would read the vault).
- `kb.page("README.md")` / `kb.fileLink("Inbox/README.md")` in `note-shortlist.js` read one
  path, not the vault; left as is.
- No behavioral test executes the scripts; the guard is text heuristics (issue 01 design).
