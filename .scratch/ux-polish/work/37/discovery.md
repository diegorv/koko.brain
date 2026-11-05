# Issue 37 discovery

No `spec.md` exists for ux-polish; the Issue and `work/states.md` R2 are the source. Same E2E file and computed-style approach as `work/36`.

Recipes: BTN = `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`; ROW = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset`.

## Files that change (class strings only, appended)

- `src/lib/features/rail-shell/Rail.svelte:78-82` `buttonClass()`: ROW (rail and pinned items).
- `src/lib/app/SettingsPanel.svelte:126` close button: BTN; `:141` section nav buttons: ROW.
- `src/lib/features/note-list/NoteRow.svelte:63` `data-note-row` button: ROW.
- `src/lib/features/rail-shell/FilesNavigator.svelte:283-289` `rowClass()`: ROW.
- `src/lib/features/rail-shell/TypesNavigator.svelte:208, 238` header buttons: BTN; `:265, 403` rows: ROW.
- `src/lib/features/rail-shell/RailNoteList.svelte:470, 482` header action and "New here": BTN.
- `src/lib/app/EditorView.svelte:93, 106, 119, 132` source-mode toggles: BTN.
- `src/lib/core/settings/sections/EditorSection.svelte:53` "Browse" trigger: drop `focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none`, add BTN (`ring-offset-background` stays; with no offset width it draws nothing).
- `e2e/specs/focus-ring.spec.ts`: new cases.

## Plan

1. E2E first, run, see the new cases fail:
   - helper `tabUntil(page, selector)`: press Tab (bounded) until `document.activeElement` matches; real Tab gives `:focus-visible`.
   - rail item: click the rail's drag-region div, Tab to `[data-rail-item]`.
   - Files row: open Files, click `[data-files-navigator-title]`, Tab to `[data-files-navigator-root]`.
   - note-list row: click `[data-note-list-label]`, Tab to `[data-note-row]`.
   - Settings: click heading, Tab to close (BTN), Tab to first nav button (ROW).
   - each asserts `:focus-visible`, then `boxShadow !== 'none'`.
   - mouse: click `[data-rail-item="files"]`, assert focused, not `:focus-visible`, `boxShadow === 'none'`.
2. Apply the class strings, rerun focus-ring + the Gate specs.

## Conflict with the Issue 36 test (resolved by retargeting)

`a raw button without its own focus style uses the theme ring color` uses the Settings close button. This Issue gives that button `focus-visible:outline-none`, so the test would fail. Retarget it to the Files navigator folder toggle (`[data-files-navigator-toggle]`), a raw button this Issue does not touch; assertions unchanged. Done in the test commit so it passes before and after.

## Risks / defaults

- Folder rows: `rowClass()` is applied to the root `<button>` and to the folder row `<div>`; the div is not focusable, its inner folder/toggle buttons are. So the ring shows on the vault root row; folder rows keep the Issue 36 fallback outline. Default: keep to the listed site (rowClass) and flag the inner buttons as follow-up.
- A drop target that is also `:focus-visible` loses its dashed outline (`focus-visible:outline-none` wins on specificity). Only reachable with keyboard focus left on a row during a mouse drag; the Issue asks for this exact recipe.
- ring utilities draw with `box-shadow`; no other state on these sites sets a shadow, so `none` is the unfocused value.
- jsdom evaluates no CSS: the E2E is the test; unit tests only need to stay green.
- WKWebView rendering not checked (Chromium only).
