# 14 discovery: inline collection block readable table, built-in names, other-views hint

No `spec.md` in `.scratch/ux-quick-wins/`. Rules read: `docs/agents/live-preview-rules.md` (rule 2: cache data, never DOM; the view names join the cached data). Repeats the naming pattern of `work/09` (`columnLabel` already feeds `QueryColumn.displayName` via `resolveColumns`, so the header text is already `Name`); this Issue adds the `th` title, the cell formatting and the widget-only parts.

## Files that change (`W = src/lib/features/collection/collection-block-widget.ts`)

- `W:26-34` `CollectionCacheEntry` gains `viewNames: string[]`; set on the miss path `:125` from `definition.views.map((v) => v.name)`; cache key stays the yaml.
- `W:135-140` `renderView(container, view, result, viewNames)`: header keeps `${name} (${count})` as text, then with `viewNames.length > 1` appends `span.cm-lp-collection-views-hint` `1 of N views`, `title` `Other views: B, C` (names after the first).
- `W:169` table append becomes `div.cm-lp-table-scroll > table`. Month grid `:203` and linear calendar `:303` untouched.
- `W:432-471` `buildCollectionTable`: `th.title = col.key` when it differs from the label (as 09's table view); cells use `formatColumnCell(col.key, value)`; date (`Date`, or string `^\d{4}-\d{2}-\d{2}`) and number cells get class `cm-lp-qjs-nowrap` (03's class, reused per "do not duplicate"); other non-null, non-HTML cells hold `span.cm-lp-collection-text` with `title` = the shown text. HTML and null branches unchanged.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:991-1002`: `.cm-lp-table-scroll` adds `overflow-wrap: normal; word-break: normal`; new `.cm-lp-table-scroll th { white-space: nowrap }`; comment on `.cm-lp-qjs-nowrap` names both users. Near `:610-666`: `.cm-lp-collection-text` (`display: block; max-width: 20em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), `.cm-lp-collection-views-hint` (muted `--lp-collection-null`, weight 400, `font-size: 0.9em`, margin-left). No rule keyed on `.cm-lp-collection-table` alone.
- `e2e/specs/collection-block.spec.ts:36,41,49,54,58,66` drop `.md` from the expected rows and the row locator.

## Tests

- `src/tests/lib/features/collection/collection-block-widget.test.ts`: table parent is `.cm-lp-table-scroll`; calendar / linear-calendar tables are direct children of the block; `Date` cell and `2026-06-10` string cell carry the nowrap class, number cell too, text cell does not; 120-char text span has `title`; `th` reads `Name` with `title="file.name"`; `:188,:238,:254` become `w`, `x`/`y`, `a`/`b`; two-view YAML renders `1 of 2 views` with the second name in `title`, first render and cache hit; one-view YAML no hint, header `All (2)`. `:78` (plain value has no span) becomes: an HTML-looking string renders as literal text in the span, no parsed element (keeps the textContent intent).
- `styles.test.ts`: scroll rule has the wrap overrides, `th` nowrap; text span rule; hint size in the font-size list; every rule whose selector names `.cm-lp-collection-table` is in the pre-existing set; radius ladder list unchanged.

## Defaults taken

- Nowrap class reused from 03 (`cm-lp-qjs-nowrap`) instead of a second identical rule.
- The wrap overrides and `th` nowrap go on `.cm-lp-table-scroll`, so QueryJS tables get them too (P09 asked for both tables).
- Text max-width `20em` (09 used `max-w-80` = 20rem in the view).
- Hint title format `Other views: <names joined by ", ">`.
- Booleans, arrays and link/image/icon display values count as text cells.

## Risks

- jsdom has no layout: scroll, nowrap and ellipsis are asserted by class and rule, not geometry; the widget height re-measure in a real editor is not covered.
- E2E specs run in deliver, not here.
