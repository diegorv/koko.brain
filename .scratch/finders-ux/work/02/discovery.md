# 02 discovery: quick switcher Create while matching, folder paths, failure reason

No `spec.md` in `.scratch/finders-ux/`; the Issue and `work/01/discovery.md` (footer `hints` prop) are the context.

## Files that change

- New `src/lib/features/quick-switcher/quick-switcher.logic.ts`: `parseCreatePath(query)` splits the trimmed query on `/`; returns `{ folder, name }` (folder `''` for the vault root, `name` with `.md` appended unless present) or `{ error }` for an empty (or whitespace-only) segment or one starting with `.`. `createTargetLabel(folder)`: "in <folder>" / "in vault root".
- `src/lib/features/quick-switcher/QuickSwitcher.svelte`:
  - `:41-60` `createAndOpenNote`: parse; on error `toast.error(reason)` and return; target dir `vault` or `vault/folder`; `call('create_folder', { path: targetDir })` unless root (pattern `rail-shell/new-note.service.ts:36-38`), then `createFile(targetDir, name, applyExplicitOrganization('', ...))`, both inside the try. `:51-53` catch toasts `Failed to create file: <reason>`.
  - `:72-109`: matches group, then a Create group whenever the trimmed query is non-empty and no file at `<targetDir>/<name>` exists (case-insensitive, from `allFiles`); "No files found." only when neither renders. Row label `Create "<q>"` plus muted "in ..." (no target suffix for a refused query; running it toasts why).
  - `Command.Input onkeydown`: Shift+Enter, not composing, `keyCode !== 229`, Create row present: `preventDefault` + `stopPropagation`, run `createAndOpenNote` (bits-ui root `command.svelte.js:957-968` treats Shift+Enter as Enter).
  - `Command.Dialog hints`: `↵` Open, `⇧↵` Create, `Esc` Close.
- `help/documentation/06-search-and-navigation.md:15`: Create row, Shift+Enter, folder paths.

## Plan (test-first)

1. `QuickSwitcher.test.ts`: folder-path tests (create_folder before create_note, nested, existing folder reused, tree holds `Projects/Idea.md`), refused segments (empty, `.`, `..`, `.kokobrain/x`, `Projects/.hidden`: no invoke, toast), failure reason in toast (adjust the two `'Failed to create file.'` assertions), invert `:215-227` (Create last, Enter opens match, Shift+Enter creates), exact-name hides row, row labels, footer hint. Fail, then implement.
2. `quick-switcher.logic.test.ts` for `parseCreatePath` / `createTargetLabel`.
3. Help doc.

Prior art: the existing `QuickSwitcher.test.ts` harness (`typeQuery`, `pressEnter`, `createFromQuery`); footer assertions from `CommandPalette.test.ts`.

## Defaults taken

- Segments are not trimmed individually; a whitespace-only segment counts as empty.
- Refused queries still render the Create row (without a target); running it toasts the reason, as the Issue's criteria ask for a toast.
- Shift+Enter with no Create row falls through to bits-ui (opens the selected match), so `Ideas` with `Ideas.md` opens it and creates nothing.
- Footer hints: `↵` Open, `⇧↵` Create, `Esc` Close.

## Risks

- Always rendering a Create row changes the item set bits-ui selects from; the 042 transition tests guard that Enter still picks the first row.
- The exact-name check reads the tree, so a file on disk not yet in the tree still falls to `generateUniqueName` (rare, acceptable).
