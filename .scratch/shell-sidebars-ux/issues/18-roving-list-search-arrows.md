# 18: Shared roving-list util and arrow keys in Search results

**Origin:** design review 2026-11-17, proposal P24 (search half, counted in new 19), prototype `.scratch/design-review/prototypes/note-list-rail.html` (section `p24`), research `.scratch/shell-sidebars-ux/research/verdict-nl-actions-keyboard.md` (ticket E) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 27).

**What to build:**

1. **Arrow keys in Search.** In the Search panel, ArrowDown in the input moves focus to the first result; ArrowUp, ArrowDown, Home and End move among results; ArrowUp on the first result returns to the input. Exactly one result is a Tab stop (`tabindex="0"`, the others `-1`) and it follows focus. Enter on a focused result opens it as a click does (the result is a native button).
2. **Escape.** The first Escape in a non-empty query clears it and keeps focus in the input; Escape on an empty query leaves the input and keeps Search shown, as today. The rail list search closes in one press (`RailListSearch.svelte:79-81`), so this is a Search-panel rule, not a shared one. It replaces the help sentence that promises "`Escape` only leaves the input".
3. **Shared util.** New pure `src/lib/utils/roving-list.ts` holds the generic parts of `src/lib/features/tasks/tasks-keys.logic.ts:46-112`: focus resolution for ArrowUp/ArrowDown/Home/End (clamped, null on a held modifier, on `count === 0` or on a key that is not on a row), `nextCurrentRow` and `tabStopRow`. `tasks-keys.logic.ts` keeps every export and signature and delegates to the util (tasks-view-ux 113, 241 and 255 rely on its behaviour and tests). The Tasks-only parts (Space, Enter, the menu keys) stay there.
4. **Where.** `SearchPanel.svelte`: the results are plain `{#each}` rows at `:216-236` inside a `ScrollArea`, not virtualized; each row is `[data-search-result] > button` (`SearchResult.svelte:135-139`). Row keys are `ftsResult.path`, `legacyResult.filePath`, `semanticResult.key` and `hybridResult.path`, one per mode. `SearchResult.svelte` only takes the `tabindex` it is given. Input keydown is `handleKeydown` at `SearchPanel.svelte:41-44` (wired at `:253`).
5. Help: `help/documentation/06-search-and-navigation.md:90` (the Escape sentence).

Not in this ticket: Cmd+Enter in lists (it would do what Enter does; the replace-or-new-tab rule is ticket 31), a key-hint bar and `listbox`/`option` roles (the rows are buttons), and the Files and Types trees and collection rows (a later wave reusing `utils/roving-list.ts`).

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/search.spec.ts`

- [x] Failing test first, new `src/tests/lib/utils/roving-list.test.ts`: clamping at both ends, Home and End, null on modifiers and on `count === 0`, `nextCurrentRow` and `tabStopRow` cases. `src/tests/lib/features/tasks/tasks-keys.logic.test.ts` and `TasksView.keyboard.test.ts` pass with no edit.
- [x] Failing test first, `src/tests/lib/features/search/SearchPanel.test.ts` (real `searchStore`, the search service mocked as today): with three results, ArrowDown in the input focuses the first; ArrowDown, End and Home move focus; exactly one result button has `tabindex="0"` and it follows focus; ArrowUp on the first returns to the input; Enter on a focused result opens it.
- [x] Failing test first: Escape with text in the input clears the query and keeps focus in the input; Escape with an empty query leaves the input and keeps Search shown (the case at `SearchPanel.test.ts:153-163` stays as written).
- [x] `e2e/specs/search.spec.ts:39-51` is rewritten for two Escapes (the first clears, the second leaves the input) with its rail-item tail kept; `06-search-and-navigation.md:90` reads the new rule.
- [x] `src/tests/lib/architecture/pure-logic.test.ts` stays green (`utils/roving-list.ts` imports nothing framework-bound).
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P24.** Lists have no keyboard model except Tasks, and every row is its own Tab stop. Extract a roving-list action from `tasks-keys.logic.ts` and apply it to the note list and search results first: one Tab stop, Up/Down/Home/End, Enter, Cmd+Enter for a new tab, F2 to rename. In search, ArrowDown moves from the input into the results, and the first Escape clears the query. The Files and Types trees and collection rows come second. (Review validation: revise, Kanban already has a keyboard model.) This ticket builds the util and the Search results; ticket 19 builds the note list.

## Problem

Search results are native buttons that each take a Tab stop, so a list of 50 hits is 50 Tab presses, and there is no way to go from the input into the results with the keyboard except Tab. Escape in the input only blurs it, which leaves the old query in place and differs from the rail list search, where the first Escape clears.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/search/SearchPanel.svelte:41-44`: Escape blurs the input and does nothing else. `:216-236`: the result list, four `{#each}` blocks by mode, no key handling and no `tabindex`.
- `src/lib/features/search/SearchResult.svelte:135-139`: a `[data-search-result]` wrapper holding one `<button>` with no `tabindex`.
- `src/lib/features/tasks/tasks-keys.logic.ts:46-112`: `resolveTaskKey`, `nextCurrentRow` and `tabStopRow`, the model to extract.
- `src/tests/lib/features/search/SearchPanel.test.ts:153-163`: the current Escape test. `e2e/specs/search.spec.ts:39-51`: "Escape leaves the input and keeps the results".
- `help/documentation/06-search-and-navigation.md:90`: "`Escape` only leaves the input".
- `src/lib/features/rail-shell/RailListSearch.svelte:79-81`: the list search's Escape handler closes the search in one press; Search does not copy it.

## Sequence with

- 34 (`pane-band`): edits the header band class at `SearchPanel.svelte:157` and moves the assertion at `SearchPanel.test.ts:105`. 34 is blocked by this ticket, so it rebases onto it.
- 13, 08 and 20: edit other lines of `help/documentation/06-search-and-navigation.md` (creator labels, the Go to heading row, the palette focus rule).
- 19 consumes `utils/roving-list.ts` and is blocked by this ticket.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket split. Defaults (not individually answered): 18.1 (old 27.1), the first Escape clears the query and the second leaves the input, which rewrites the help sentence and the E2E case above.
- 2026-11-18, delivered from `issue/18-roving-list-search-arrows`: roving-list keyboard model extracted to `src/lib/utils/roving-list.ts` (shared with Tasks), arrow keys/Home/End and one Tab stop in Search results, Escape clears the query first then leaves the input; help doc and E2E updated. Review round 1 APPROVED (findings fixed: Semantic Tab-stop test, held-Enter test; Show in Calendar Tab stop deferred to Issue 19), round 2 APPROVED with no findings. Tests: `pnpm check` 0 errors; full `pnpm vitest run` at 1230d2413: 650/650 files, 17238 passed, 54 skipped, 1 todo.
