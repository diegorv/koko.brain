VERDICT: APPROVED

Review of `git diff main...HEAD` (4 commits: 134297b34, 19d24803c, f436ed8eb, a3fd0e8c4) on `issue/21-settings-number-fields-write-only-valid`.

## Acceptance criteria

- [met] Failing test first (real `settingsStore`, in `src/tests/lib/core/settings/EditorSection.test.ts`): from the stored font size, typing `''` or `'1'` leaves the store unchanged; typing `'14'` stores 14; committing `'999'` stores 32 and shows `32`; committing `''` keeps the store and restores the field. Content width: typing `'5'` leaves the store, committing it stores 400; `0` and `800` store. Line height and paragraph spacing follow the same pattern with their bounds. — `EditorSection.test.ts:86-209` covers every listed case (font size `''`/`'1'`/`'999'` no write, `'14'` stores; commit `999` -> 32 with `input.value` `'32'`; empty commit keeps 19 and shows `'19'`; content width `'5'` leaves 800, commit -> 400, `0` and `800` store; line height `''`/`9`/`0.5` and paragraph spacing `''`/`9`/`-1` no write, in-range writes, commit clamps and empty commit restores). Probe: with main's three `.svelte` files restored in the worktree, 9 EditorSection tests fail; with the branch's, all pass.
- [met] Failing test first, new `src/tests/lib/core/settings/FileHistorySection.test.ts`: retention days from 7: typing `''`, `'1'` or `'30'` leaves 7; committing `'30'` stores 30; committing `'400'` stores 365 and shows `365`; committing `''` keeps 30. — New file `FileHistorySection.test.ts:47-77` asserts each case on the real store. Probe against main's `FileHistorySection.svelte`: "writes nothing while typing" and "keeps the stored value ... on an empty commit" fail; the branch passes.
- [met] Failing test first, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`: debounce from 3000: typing `''` or `'0'` leaves 3000; `'2'` stores 2000; `'45'` leaves 2000 and committing it stores 30000. — `AutoOrganizeSection.test.ts:57-71` asserts exactly that sequence (plus `input.value` `'30'`), and `:73-79` covers the empty commit. Both fail against main's component, pass on the branch.
- [met] `EditorSection.test.ts:84-130` (the "raw while typing is deliberate" assertions: 999, 1, 9, 50 and 9 stored before the commit) are rewritten to the new contract on purpose; say in the commit that the review approved the change. The commit-clamp assertions and the heading typography tests (`:132-155`) stay unchanged. — The raw-while-typing `toBe(999/1/9/50/9)` lines are gone; commit 19d24803c says "the review approved this change in Issue 21" (this review does approve it). Commit-clamp assertions (32, 8, 3, 400, 0, 2) are kept. The heading tests are byte-identical: `diff` of main's `:132-` against the branch's `:211-` is empty.
- [met] No test mocks `settingsStore` or `settings.logic.ts`; only the Tauri font-list call stays mocked, as in `EditorSection.test.ts:8-10`. — `grep vi.mock` over the three test files finds only `EditorSection.test.ts:7` (`@tauri-apps/api/core`); FileHistory and AutoOrganize tests import the real `settingsStore` and call `settingsStore.reset()` in before/after hooks.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 (236 files, 0 errors, 0 warnings). Targeted vitest run exits 0, 42/42 passing across the five test files listed below. The full suite is deliver's to run.

## Findings

1. nit, `src/tests/lib/core/settings/EditorSection.test.ts:191-198`: "clamps content width on commit" changes the typed value from `'50'` to `'5'` and asserts the store stays at its default 0 while typing. The clamp assertion (400) is the same, so the criterion holds, but the "leaves the store" check here cannot tell a no-write from a write of 0; the 800-start test at `:177-188` is the one that proves it. Fix (optional): none needed; leave as is or start this test from 800 too.
2. nit, `src/lib/core/settings/sections/FileHistorySection.svelte:38-48` and `src/lib/features/auto-organize/AutoOrganizeSection.svelte:134-151`: the empty/finite parse is written inline three times across the sections (plus `typedNumber` in EditorSection). This duplication is what Issue item 5 asks for (range checks local to each section), so no change is requested.

No blocker, major or minor findings.

## Verified independently

- Correctness of the handlers: `NaN` and `Infinity` never write (EditorSection `typedNumber` filters non-finite; debounce `oninput` fails `clampDebounce(ms) === ms` for NaN/Infinity, `onchange` checks `Number.isFinite`; retention checks `Number.isFinite`). `clampContentWidth(0) === 0` lets the "no limit" sentinel through while `5` is rejected. Debounce in-range check runs on `Math.round(seconds * 1000)`, the same value it writes.
- Field restore: `Input` (`src/lib/components/ui/input/input.svelte`) uses `bind:value` on a `$bindable` prop, so when the store value is unchanged after a commit (empty commit, or a clamp to the already-stored value) the DOM is not rewritten; the handlers write `e.currentTarget.value` by hand, and the empty-commit tests fail without it.
- Retention days has no `oninput` handler at all; nothing writes it while typing, which protects `cleanup_history` (`src/lib/app/lifecycle/app-lifecycle.service.ts`).
- Scope: only `EditorSection.svelte`, `FileHistorySection.svelte`, the debounce block of `AutoOrganizeSection.svelte`, their tests and the discovery file change. `settings.logic.ts`, `SettingsPanel.svelte`, `HeadingTypographyEditor.svelte`, `OneOnOneSection.svelte`, `EventCalendarSection.svelte`, `layer-baseline.json` and `layer-rules.test.ts` are untouched. `min`, `max`, `step` and copy are unchanged. New code uses tabs and the new helpers carry JSDoc.
- Commits are `fix:` with tests in the same commit, in the CLAUDE.md format (Context, Problem, Solution, Behavior, Files); no `Test-Exempt` needed.

## Test verdict rests on

- `pnpm check` (exit 0).
- `pnpm vitest run src/tests/lib/core/settings/EditorSection.test.ts src/tests/lib/core/settings/FileHistorySection.test.ts src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts src/tests/lib/core/settings/settings-controls.test.ts src/tests/lib/core/settings/settings-copy.test.ts` (exit 0, 42 passed).
- Red probe: the first three files run against main's three `.svelte` files (restored afterwards with `git checkout HEAD -- src/lib`): 13 failed, 12 passed, exit 1.

Not checked: the full suite (deliver), `pnpm build` (no dependency change), and behaviour in the running Tauri app (WebKit's number-input sanitising of partial values such as `1.` was not exercised; jsdom reports those as `''`, which the empty path handles).

## Resolution

1. Fixed: "clamps content width on commit" in `src/tests/lib/core/settings/EditorSection.test.ts` now starts from a stored 800, so typing `5` asserting the store stays at 800 distinguishes a skipped write from a write.
2. No change: the reviewer requested none; inline parsing per section is what Issue item 5 asks for.
