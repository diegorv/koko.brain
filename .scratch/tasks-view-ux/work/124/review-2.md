VERDICT: APPROVED

Re-review, round 2, of the fix commit 9708c8662 (`git diff 497ae0549..HEAD`): `docs/architecture/modules/src/lib/features/tasks.md`, `src/lib/features/tasks/task-views.logic.ts`, `src/tests/lib/features/tasks/tasks-view-settings.test.ts`, plus the Resolution in `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | rejection stands | Not changed. The finding itself left the choice (ship Issue 247 next, or route Hide this note/type/folder to `setTaskExcludes`) to the owner, and the current behavior follows Issue 124's scope (a view's own exclude is session-only, no editor until 247). Deliver is not the place to pick either option. Still worth raising with the owner when this Issue is delivered. |
| 2 | nit | rejection stands | No change asked for; the per-field fallback is the default recorded in discovery.md and the tested inputs match the Issue. |
| 3 | nit | resolved | `tasks-view-settings.test.ts:353` now asserts `tasksStore.query.exclude` equals `emptyTaskExcludes()` (imported at :51). The list's own excludes start empty, so the assertion fails if the Sources panel writes `query.exclude` (any field, not only `templatesFolder`). Test passes. |
| 4 | nit | resolved | `tasks.md:11` lists `setTaskSources`, `loadSavedTasksView`, `selectTaskList`, `saveTaskView`, `renameTaskView`, `duplicateTaskView`, `deleteTaskView`, `setTaskExcludes`; each is an exported function in `tasks.service.ts`. `updateSectionTagFilter` no longer appears anywhere under `src/` or `docs/`. `sync-wiki-docs.test.ts` passes. |
| 5 | nit | resolved | `task-views.logic.ts:179-188`: `GROUP_KEY_SET: Record<Exclude<TaskGroupKey, { property: string }>, true>` lists all seven string keys of `TaskGroupKey` (`task-query.logic.ts:846`); a missing key or an extra key fails to compile. `GROUP_KEYS = Object.keys(...)` feeds `oneOf` at :244 with the same values as before, so load behavior is unchanged. |

## Acceptance criteria re-checked

- [met] Save, rename, duplicate and delete round-trip through `settings.json`: perform each, advance the persistence debounce, reload the written JSON into reset stores, compare. The migrating write has no `headingTags`, `sectionTag` or `query` key and keeps an unknown key. — The `GROUP_KEYS` change touches the `groupBy` parse used on reload; same accepted values, and the round-trip tests in `tasks-view-settings.test.ts` and `task-views.logic.test.ts` pass.
- [met] `setTaskExcludes` with the templates switch off: after the persistence debounce the written `tasksView` holds `globalExcludes.templatesFolder: false`, keeps an unknown key, and has no `sectionTag`; a fresh load restores it in `tasksStore.globalExcludes`. — `tasks-view-settings.test.ts:321-336` unchanged and passing; the panel-path test at :338-355 is now stronger (own excludes stay `emptyTaskExcludes()`).
- [met] `layer-rules.test.ts` stays green with no new baseline entry. — Passed in the targeted run; the fix diff does not touch `layer-baseline.json` or `BASELINE_SIZE`.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/architecture/`: exit 0, 31 files, 947 tests passed.
- Full suite not run: deliver runs it.
- No test weakened or deleted; no scope creep outside the three files named in the review's findings.

## Findings

No new findings. Finding 1 (major) stays an open owner decision, not a defect of this Issue's scope; see the table.
