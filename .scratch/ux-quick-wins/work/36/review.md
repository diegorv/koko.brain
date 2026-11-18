VERDICT: APPROVED

Reviewed `git diff main...HEAD` (3746bc698, 89127396b, d6b07bbfe, plus discovery 3d1977d5c) in the worktree.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/core/settings/PeriodicNotesSection.test.ts` (created by ticket 22; extend it): with system time 2026-11-18, folder `Daily`, format `YYYY-MM-DD` the section shows "Today: Daily/2026-11-18.md"; editing the format updates it; the line equals `buildPeriodicNotePath('', folder, format, dayjs())` without the leading slash; an empty format shows a timestamp name. — The ticket-22 file is extended with a new describe block: "shows today's note path under the Format and follows edits" (fake Date 2026-11-18, `Today: Daily/2026-11-18.md`, then typing `YYYY/MM-MMM/DD` gives `Today: Daily/2026/11-Nov/18.md`); "shows exactly the path a create opens, for every period" compares all five periods against `buildPeriodicNotePath('', folder, format, dayjs()).slice(1)`; "shows the timestamp name a create makes when the format is empty" matches the ISO pattern and the buildPeriodicNotePath result. The implementation (`PeriodicNotesSection.svelte` `todayPath`) uses `formatNow` from `#lib/utils/date.js`, the same dayjs instance and plugins that `periodic-notes.logic.ts` imports, and joins as `buildPeriodicNotePath:16-21` does. It does not import dayjs, and settings-copy.test.ts passes. The build report says each test failed first. I did not re-run against main.
- [met] A template path absent from a loaded tree shows "File not found"; present, empty, dot-prefixed, no vault or an empty tree shows nothing. Real `fsStore` and `vaultStore`, no mock. — The tests "marks a template path absent ... as not found" (missing, then present after typing), "shows no mark for an empty or dot-prefixed path" and "shows no mark with no vault open or an empty tree" use real `fsStore.setFileTree` and `vaultStore.open` with no `vi.mock`. `isTemplateMissing` (`settings.logic.ts:314-318`) follows the Issue's rule exactly, and settings.logic.test.ts covers each branch. `scan_vault` is a full recursive scan (`vault.rs:139-200`), so `findFileNode` over `fsStore.fileTree` does not miss files in collapsed folders.
- [met] Same checks for the 1:1 Template path in `src/tests/lib/core/settings/OneOnOneSection.test.ts`. — The new describe "OneOnOneSection - missing template mark" covers the stacked row, missing then present, empty, dot-prefixed, no vault, empty tree, and loaded again. `OneOnOneSection.svelte:81-95` gets the stacked row and the mark.
- [met] `settingsStore.periodicNotes` and `oneOnOne` are identical before and after rendering; `settings-copy.test.ts` and `layer-rules.test.ts` stay green. — The tests "leaves the periodic notes settings unchanged by rendering" and "leaves the 1:1 settings unchanged by rendering" compare JSON before and after rendering. No render path writes to a store: only `oninput` handlers call `update*`. settings-copy.test.ts and layer-rules.test.ts pass. `layer-baseline.json` and `BASELINE_SIZE` are unchanged, and the new import is core to core (`settings.logic` imports `core/filesystem/fs.logic`).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 with 0 errors and 0 warnings. The targeted vitest files below exit 0. The full suite is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 236 files, 0 errors, 0 warnings.
- `pnpm vitest run` on PeriodicNotesSection.test.ts, OneOnOneSection.test.ts, settings.logic.test.ts, settings-copy.test.ts, layer-rules.test.ts and settings-headings.test.ts: exit 0, 6 files, 155 tests passed.
- `pnpm vitest run` on SettingsPanel.test.ts (it imports both sections), SettingItem.test.ts, settings-text.test.ts and settings-controls.test.ts: exit 0, 4 files, 25 tests passed.
- My test verdict rests on these 10 files. No e2e spec refers to these sections. The worktree is clean.

## Findings

1. minor, `src/lib/core/settings/settings.logic.ts:317`: `findFileNode` compares paths exactly, but the default macOS volume (APFS) is case-insensitive. A template path such as `templates/daily.md`, when the folder on disk is `Templates/daily.md`, loads fine through `readTextFile` but shows "File not found". Scans also skip symlinks (`vault.rs` `is_symlink() => continue`), so a template that is a symlink, or sits in a symlinked folder, gets the same false mark. Both mark files that do exist, the same kind of problem as the dot-folder exclusion the Issue guards against. The Issue names `findFileNode` exactly, so this is no blocker. Fix (optional, follow-up): name these limits in the JSDoc, or match the final segment without regard to case. The leading-slash case in discovery.md is the same kind of problem.
2. nit, `src/lib/core/settings/sections/PeriodicNotesSection.svelte:10`: the local `type Period` repeats `PeriodType` from `settings.types.ts:4`. Fix: import `type { PeriodType }` and drop the local alias.
3. nit, `src/lib/core/settings/sections/PeriodicNotesSection.svelte:37-45`, `OneOnOneSection.svelte:92-94`: the muted "Today:" and "File not found" lines are not linked to their inputs (no `aria-describedby`), so a screen reader focused on the field does not announce them. Fix (optional): give each line an id and point the input's `aria-describedby` at it.

None of these blocks delivery. Scope: only the two sections, one pure helper and their tests changed. That matches the Issue, with no scope creep.

## Resolution

1. Fixed by documenting: the `isTemplateMissing` JSDoc names both false marks (exact-case compare on a case-insensitive volume, symlinks skipped by `scan_vault`). Matching was left exact, as the Issue specifies `findFileNode`.
2. Fixed: `PeriodicNotesSection.svelte` imports `PeriodType` from `settings.types` and drops the local alias.
3. Fixed: each "Today:" line has an id that its Format input names in `aria-describedby`; each "File not found" mark has an id that its Template path input names only while the mark shows (Periodic Notes and 1:1). New tests in `PeriodicNotesSection.test.ts` and `OneOnOneSection.test.ts` failed first.
