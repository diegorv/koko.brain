# Issue 21 discovery: settings number fields write only valid values

No `spec.md` in `.scratch/ux-quick-wins/` (README.md only); the Issue file is the spec.

## Files that change

- `src/lib/core/settings/sections/EditorSection.svelte:98-104,119-125,140-146,163-169`: four `oninput`/`onchange` pairs. Two local helpers in the `<script>` (`:26-28` area): `typedNumber(e)` returns `null` for an empty or non-finite field, else the number; `writeInRange(e, clampFn, write)` writes only when `clampFn(n) === n` (the existing clamp is the range check, so `0` passes for content width and `5` does not); `commitClamped(e, clampFn, write, stored)` writes `clampFn(n)` when `n` is not null, then sets `e.currentTarget.value = String(stored())`.
- `src/lib/core/settings/sections/FileHistorySection.svelte:38-41`: `oninput` removed; `onchange` parses, writes `clampRetentionDays(n)` when not null, restores the field from the store.
- `src/lib/features/auto-organize/AutoOrganizeSection.svelte:134-138`: `oninput` writes `Math.round(seconds * 1000)` only when `clampDebounce(ms) === ms`; new `onchange` clamps, writes, restores the field to `debounceMs / 1000`. Rest of the file untouched (ticket 31).
- No edit to `settings.logic.ts` or `SettingsPanel.svelte`.

## Tests (test-first, real `settingsStore`)

- `src/tests/lib/core/settings/EditorSection.test.ts:84-130`: rewrite to the new contract (no raw write while typing out of range); add font size `''`/`'1'` no write, `'14'` stores, commit `'999'` stores 32 and shows `32`, commit `''` keeps and restores; content width `'5'` no write then commit 400, `0` and `800` store; line height and paragraph spacing with their bounds. Heading tests `:132-155` unchanged.
- New `src/tests/lib/core/settings/FileHistorySection.test.ts`: copy the mount/`type`/`commit` helpers of `EditorSection.test.ts:19-69`. No Tauri call in the tree, so no mock.
- `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`: add `settingsStore.reset()` to `beforeEach`/`afterEach` and a debounce `describe`/`it`.

## Risks

- `Input` (`components/ui/input/input.svelte`) binds `value`; after a commit whose clamped value equals the stored one, Svelte skips the DOM write, so the restore must write `e.currentTarget.value` directly (Issue item 1). Same pattern already in `EventCalendarSection.svelte:168`.
- jsdom sanitizes a non-numeric string on a number input to `''`; the empty path covers both.
- Two-digit live preview for font size: typing `2` writes nothing (Issue item 4, intended).

## Defaults taken

- An out-of-range but numeric commit on the debounce (`'0'`) clamps to 500, as the Issue says "same rule" as the editor fields.
- Helpers stay local to each section (Issue item 5); no shared util.
