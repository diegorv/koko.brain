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
