# Issue 14: Settings-surface deletions

Status: ready-for-agent
Phase: P2
Source: PONY B1+#65, #63, #49, #47, #29-shrunk (C04), #17 — plan-2026-08-12.md §P2 — Safe deletion batch (Settings surface)
Blocked by: none

## What

Clear the dead settings surface before the settings-persistence refactor rewrites the same files.
**This issue must land BEFORE issues 30-33 (Track D)** — B1 alone drops arch 4.0's census from 10
modules to 9, and #63 frees the name arch 4.2 cites.

## How

One commit per item, in this order:

- **B1 + #65 — one commit** (bf55080 fallout): delete `TagsPanel.svelte`; the stale comments at
  `tags.service.ts:88` and `app-lifecycle/index-updater.service.ts:25`; `tagsVisible`
  (`settings.types.ts:62-63`, `settings.store.svelte.ts:59`); the three e2e seeds; and the
  CLAUDE.md Indexing §2 / `:264` edits.
- **#63** delete `SETTINGS_SECTIONS`.
- **#49** delete `isValidFolderName`.
- **#47** inline `shouldAutoCheckNow` — **a straight −23 delete, no prose move**. Also fix the stale
  throttle clauses at `:45-46` and `help/documentation/19-settings.md:257`. RELEASE-CHANNELS.md
  already carries the rationale; do not duplicate it.
- **#29-shrunk per conflict C04**: add `src/lib/utils/clamp.ts` + its test, reduce the seven clamp
  wrappers to one-line bodies (**the `contentWidth` `<= 0` sentinel stays in `.logic.ts`**), and apply
  the shared helper at the 16 nested `Math.max/min` sites across 9 non-settings files plus
  `clampRetentionDays`. **`settings.logic.test.ts:15-152` must stay green unchanged — that is the
  behaviour-neutrality proof.** Do not delete the wrappers: `normalizeSettings` is their second caller.
- **#17** replace with `Reflect.has` but **keep the symbol branch at `:63-65`**; reword the 5 stale
  test mentions.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit. Stage only the
files for the current item, verify with `git diff --cached --stat`, and commit each item separately
using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-18 (closing): all six items landed

| # | Item | Resolving SHA |
|---|------|---------------|
| 1 | B1 + #65 (TagsPanel, `tagsVisible`, stale comments, 3 e2e seeds, CLAUDE.md) | `4e304adf` |
| 2 | #63 (`SETTINGS_SECTIONS`) | `640b8ce7` |
| 3 | #49 (`isValidFolderName`) | `6cecc8f2` |
| 4 | #47 (inline `shouldAutoCheckNow`) | `2f6abb47` |
| 5 | #29-shrunk per C04 (`utils/clamp.ts`) | `6f85586b` |
| 6 | #17 (`Reflect.has`) | this commit |

Every item was adversarially reviewed by a Fable 5 sub-agent under the playbook's
"presumed flawed" stance. All six verdicts were `could_not_refute`.

- **B1 + #65** (`4e304adf`): full frontend gate green plus `bash scripts/e2e.sh` (181 passed),
  since the item touched three e2e seeds. Reviewer `could_not_refute`, 0 fix rounds.
- **#63** (`640b8ce7`): frontend gate green. Reviewer `could_not_refute`, 0 fix rounds.
- **#49** (`6cecc8f2`): `pnpm check` 190 files / 0 errors / 0 warnings, `pnpm vitest run`
  290 files / 6667 passed + 1 todo, `pnpm build` wrote site. Reviewer `could_not_refute`,
  0 fix rounds. Pure deletion, net -53 lines over 2 files; a repo-wide caller trace proved
  zero production callers before the delete.
- **#47** (`2f6abb47`): `pnpm check` 190 files / 0 errors, `pnpm vitest run` 290 files /
  6665 passed + 1 todo, `pnpm build` wrote site. Reviewer `could_not_refute` after
  **1 fix round**: the round-1 finding was that the user-visible toggle description at
  `UpdateSection.svelte:282` still read "Throttled to once per 24h."; it now reads
  "Fires once per vault open, with no throttle.", matching the corrected sentence in
  `help/documentation/19-settings.md:257`, so tooltip and docs no longer contradict.
- **#29-shrunk / C04** (`6f85586b`): `pnpm check` 190 files / 0 errors / 0 warnings,
  `pnpm vitest run` 291 files / 6672 passed + 1 todo, `pnpm build` wrote site.
  Reviewer `could_not_refute`, 0 fix rounds. `settings.logic.test.ts:15-152` stayed
  byte-for-byte unchanged and green, which is the behaviour-neutrality proof C04 asked for.
- **#17** (this commit): `pnpm check` 190 files / 0 errors / 0 warnings, `pnpm vitest run`
  291 files / 6673 passed + 1 todo, `pnpm build` wrote site to "build".
  Reviewer `could_not_refute`, 0 fix rounds.

### Recorded notes

1. **#49 was implemented twice.** Its first implementation passed adversarial review with
   `could_not_refute`, but the commit agent hit a transient API server error and the changes
   were discarded. This run redid the item identically.
2. **Deferred minor findings from the B1 + #65 review**, recorded here as follow-up candidates
   rather than folded into that commit:
   - `settings.types.ts:54`: the JSDoc for `rightSidebarVisible` still lists "Tags" as a
     right-sidebar panel.
   - The help docs still describe the Tags panel as a right-sidebar panel, with a screenshot:
     `help/documentation/07-sidebar-panels.md:116-142`, `06-search-and-navigation.md:136`,
     `19-settings.md:231`, `04-markdown.md:689`.
3. **Observation from #49.** `isValidFolderName` was a zero-caller path-traversal validator,
   and `settings.types.ts` carries several user-entered vault-relative folder fields with no
   validation at all. Deleting it is scope-correct per PONY #49 (dead code is dead code), but a
   follow-up issue could re-decide whether those inputs deserve a guard, and if so, where it
   belongs.

### Discoveries worth a follow-up

- **#47, stale throttle prose beyond the named locations.** Two internal comments still
  describe the removed 24h throttle and were left untouched because they sit outside the
  item's named scope: `src/lib/core/settings/sections/UpdateSection.svelte:164-166` ("the
  auto-check throttle") and `src/routes/(app)/+layout.svelte:77-81` ("Internally throttled
  to once per 24h"). Neither affects behaviour; both are one-line edits.
- **#29, three sites deliberately not converted to `clamp()`.** They use the opposite
  nesting, `Math.min(Math.max(x, lo), hi)`, and their bounds can invert at runtime, so
  converting them would change behaviour rather than preserve it: `KanbanView.svelte:246`
  and `:253` (`maxItem = items.length - 1` is -1 for an empty lane, where `clamp` would
  yield 0) and `kb-ui.ts:165` (`maxVal` stays -Infinity when `options.max` is omitted and
  the heatmap has no items). Worth a separate look at whether those three want a guard.
- **#17, the `then` clause is load-bearing and now has its own test.** `then` was the single
  entry in the old 42-entry `KNOWN_PROPS` that is not a real class member, so `Reflect.has`
  alone would have let `arr.then` fall through to the property-mapping branch and made a
  `DataArray` look thenable to `await` / `Promise.resolve`. The explicit `prop === 'then'`
  clause preserves the old behaviour, and a new test at `data-array.test.ts:705-709` pins it
  by asserting `Promise.resolve(arr)` resolves to the array itself. Note that had the audit
  applied a bare `Reflect.has` swap, no existing test would have caught the regression.
- **Historical `KNOWN_PROPS` mentions left in place.** `git grep KNOWN_PROPS` still hits the
  `.scratch/ponytail-audit-2026-08-12/` records. Same for `isValidFolderName` and
  `shouldAutoCheckNow`, which also survive in `.scratch/` journals and
  `tasks/done/test-gap-closure-phase1.md`. All are dated historical records, so leaving them
  untouched is correct.
