VERDICT: APPROVED

# 02 review: scope queryjs-features examples

Reviewed `git diff main...HEAD` (24d11b50..4f5ba9d2) on `issue/help-examples-02-queryjs-features`.

## Acceptance criteria

- [x] **No queryjs block in the folder reads notes outside it, or it is allowlisted with a reason: met.**
  - Every `kb.pages` call in the folder (19 in `__system/queryjs/*.js`, 3 in notes) now uses
    the SCOPING.md folder source ``kb.pages(`"${kb.current().file.folder}"`)``, with tag
    sources moved to `.whereTag()`. `whereTag` (`data-array.ts:55`) matches the tag and its
    subtags the same way `parseSource` does for `#tag` (`queryjs.logic.ts:179`).
  - No other vault-wide reads remain: `kb.page("README.md")` and `kb.fileLink("Inbox/README.md")`
    in `note-shortlist.js` read one path.
  - Reviewer probe 1 (temporary test, deleted): all 30 scripts in `__system/queryjs/`, run
    through a real `KBAPI` with each of 4 caller notes (`daily-2026-02-13`, `weekly-2026-W07`,
    `yearly-2026`, `dashboard`), in both layouts (nested at `/vault/Resources/help/examples/...`
    and the folder as its own vault), with `kb.pages` spied: 240/240 passed. Every `kb.pages`
    call received exactly `"<example folder>"` and no script rendered a `.cm-lp-qjs-error`.
    This covers the radar and yearly heatmap/vertical scripts the new test cannot see into.
  - Reviewer probe 2 (temporary test, deleted): all 18 inline `queryjs` blocks in the folder's
    notes, same spy, nested layout: 18/18 passed.
- [x] **Allowlist entries for this folder removed: met.** All 20 `02:` entries are gone from
  `src/tests/help/examples-scoping.test.ts`; no `queryjs-features/` key remains. The guard passes.

## Other checks

- **Tests the verdict rests on** (run by the reviewer):
  - `src/tests/help/queryjs-features-scoping.test.ts` and `src/tests/help/examples-scoping.test.ts`,
    plus `src/tests/lib/plugins/queryjs/` (kb-api, data-array, kb-ui, logic, service, session
    store, datetime): 9 files, 488 passed, 1 todo.
  - The new test run against main's scripts (`git archive main`, test copy pointed at it): 13/13
    failed, so each case catches the old behavior.
  - The two probes above.
  - `pnpm check`: 0 errors, 0 warnings.
- **Fixes beyond scoping are justified:** `vault-overview-cards.js` (`p.file.tasks` is a plain
  array, so `.where` threw) and `vault-tag-cloud.js` (`kb.ui.tagCloud` takes `string[] |
  Record<string, number>`, `kb-ui.ts:244`; a `Map` rendered nothing). Both examples were broken
  in every layout. The `kb.view()` path changes make the own-vault note in the four notes true.
  None of this is scope creep.
- **Own-vault note:** placed under the H1 of the four notes that call `kb.view()`, which is what
  the Issue asks ("say so at the top of the note").
- **Templates coupling (no action):** `help/examples/templates/*.md` call these scripts under
  `_system/queryjs/`. Issue 05 already requires template queries to scope to the created
  note's folder, so scoping by `kb.current().file.folder` matches the plan.
- **Commits:** Conventional Commits with Context/Problem/Solution/Behavior/Files and the
  trailer. Test file uses tabs, the fixture import matches its siblings, and the edited
  scripts keep their existing indentation.

## Findings

1. **Low:** `help/examples/queryjs-features/__system/queryjs/note-shortlist.js:12-16` (and the same
   pattern in `yearly-{sleep,exercise}-{heatmap,vertical}.js:2-5`, `yearly-wellness-heatmap.js:2-5`).
   The script null-guards `kb.current()` (`if (current)` / `kb.current()?.created`), then
   dereferences `kb.current().file.folder` without a guard a few lines later, so the guard
   no longer does anything. Behavior is correct per SCOPING.md: a null throws, the widget shows
   the error, and nothing falls back to the vault. Fix (optional): in `note-shortlist.js` use
   `current.file.folder` and drop the dead `if (current)`, or leave as is. Non-blocking.
2. **Low (test coverage):** `src/tests/help/queryjs-features-scoping.test.ts:83-131` checks
   behavior for 11 of 30 scripts and 1 of 18 inline blocks. The radar, period and yearly
   scripts and the two `yearly-2026.md` inline blocks rely only on the text guard. A
   `kb.pages` spy that asserts every call's source equals the example folder, over every
   script and every inline block (reviewer probe 1/2, about 25 lines), would cover all of them
   without reading chart output. Optional, non-blocking. If not added, list it in the closing
   commit's gaps as the build report already does.
3. **Info (closing commit):** carry the build report's gaps into the closing commit: nested
   `kb.view()` paths do not load (SCOPING.md gap, stated in the four notes); the folder source
   matches by substring (`queryjs-features-old`); `templates/*.md` still call `_system/queryjs/`
   (issue 05).

## Resolution

1. Fixed. `note-shortlist.js` reads `current.file.folder` and pushes `current.file.link` without the dead `if (current)`; the five yearly heatmap/vertical scripts read `kb.current().created` instead of `kb.current()?.created`. A null current note still throws, as SCOPING.md requires.
2. Fixed. `queryjs-features-scoping.test.ts` spies `kb.pages` on every script in `__system/queryjs/` except the two `_shared-*-radar` scripts (they need their caller's `input` and run through the chart scripts, which are covered) and on every inline `queryjs` block in the folder's notes; each call must receive exactly the example folder. Mutation check: replacing the source with `kb.pages()` in `yearly-sleep-vertical.js` and in `yearly-2026.md` failed 4 of the new cases.
3. Carried into the closing commit.
