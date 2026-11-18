# Discovery: Issue 02, calmer status bar and a stable save slot

No `spec.md` exists for shell-sidebars-ux; the Issue is the spec. Same work-folder layout as `work/01`.

## Files that change

- `src/app.css:211-212`: `--status-bar-height: 2rem` -> `1.5rem`. `SettingsPanel.svelte:116` (`bottom-(--status-bar-height)`) follows on its own.
- `src/lib/core/status-bar/SaveStatus.svelte:14-23`: one `<span data-save-status data-state=...>` (inline-flex) holding an `inline-grid` cell; both labels (icon + text) sit in the same grid area (`[grid-area:1/1]`), the inactive one `invisible` + `aria-hidden="true"`. Drop `animate-pulse`; keep filled `Circle` (Modified, muted) vs `CircleCheck` (Saved). `status === null` still renders nothing.
- New `src/tests/lib/core/status-bar/SaveStatus.test.ts` (jsdom, real `editorStore`).
- `e2e/specs/settings.spec.ts:33`: `toBeCloseTo(32, 0)` -> `toBeCloseTo(24, 0)`.
- `e2e/specs/word-count.spec.ts`: new case for bar height and slot stability.
- `help/documentation/mods/08-custom-ui.md:372`: status bar row notes the 24 px bar, a taller chip overflows.

## Plan

1. Failing `SaveStatus.test.ts` (Modified without `.animate-pulse`, only the active label exposed, Saved, no tab, virtual tab), then the component. Commit.
2. Token to 1.5rem + settings.spec value 32 -> 24 + the word-count E2E case. Commit.
3. Mods help note. Commit.

## Prior art

- `src/tests/lib/features/search/SearchStatus.test.ts`: `mount`/`flushSync`/`unmount` pattern, `setupLocalStorage` before imports.
- `editorStore.addTab`, `updateContent`, `markSavedByPath`, `reset` (`editor.store.svelte.ts:52-165`); virtual path prefix `__virtual__/` (`editor.logic.ts:18`).
- E2E: `word-count.spec.ts` (`openFile`, type into `.cm-content`).

## Risks

- jsdom has no layout, so the unit test checks structure (both labels in the slot, inactive `aria-hidden` + `invisible`); width stability is proven only by the E2E.
- The bar divider (`StatusBar.svelte:24-33`) applies `::before` to the outer span; the grid is a child of it, so the divider stays outside the grid cell.
- E2E cannot run Todoist sync (no spec drives it, `e2e/mocks/tauri-core.ts:188`). The E2E prepends a plain chip to the right group the way a mod does (`08-custom-ui.md:372`), so the slot has a preceding item and gets the divider.
- E2E run itself is deliver's / the gate's job; build runs typecheck + unit tests only. I will try the two E2E specs once if the script is cheap.

## Defaults taken

- `data-state="saved|modified"` on the slot as a stable hook for the E2E (Issue only names `data-save-status`).
- `03-editor.md:141-151` stays true without edits (it names labels, not height or animation).
