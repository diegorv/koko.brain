# Issue 15 discovery: one note-actions group, Inbox check

No `spec.md` in the feature folder; the Issue is the source. Lines at `b76247a54`.

## Files that change

- `src/lib/features/properties/lifecycle.service.ts:48-58`: add `setOrganizedForPath`, `setArchivedForPath` beside `toggleFavoriteForPath` (same shape).
- new `src/lib/features/properties/note-actions.logic.ts`: `noteActions(kind, { organized, archived })` -> `{ id, label, danger }[]` (ids `archive`, `organize`, `history`, `trash`).
- `src/lib/features/note-list/note-row.types.ts`: `organized`, `archived` required; `rail-shell.types.ts:42-43` drops `archived` from `LensNote`.
- `src/lib/features/rail-shell/lens.logic.ts:281-295` (`toLensNote` copies `entry.organized`), `:996-1014` (`fileToLensNote` literal `organized: true`).
- `src/lib/core/filesystem/delete-note.service.ts:12-29`: `vaultStore.requestPromptIndexRefresh()` after the confirm, before `deleteItem`.
- `src/lib/features/note-list/NoteRowMenu.svelte:162-170` (delete calls `deleteNoteWithConfirm`), `:277-285` (Rename, then the group mapped id -> icon).
- `src/lib/features/note-action-bar/NoteActionBar.svelte:207-219`: the group replaces Archive/Delete; Mark organized and History carry `formatShortcut` hints.
- `src/lib/features/note-list/NoteRow.svelte`: optional `onOrganize`; a `relative group` wrapper holds `[data-note-row]` and the check as siblings.
- `src/lib/features/rail-shell/RailNoteList.svelte:970-984`: `onOrganize` for the Inbox lens and markdown rows only.
- `src/lib/app/commands.ts:338-351`: `note:toggle-archived`, `note:move-to-trash`.
- `src/lib/features/rail-shell/list-empty.logic.ts:79-80` hints; help `02`, `03`, `20`, `25`; `e2e/specs/rail-shell.spec.ts:312,324`.

## Plan (one commit per step)

1. by-path writers + `lifecycle.service.organized-path.test.ts` (copy of `lifecycle.service.favorite-path.test.ts`).
2. `note-actions.logic.ts` + test.
3. types + `lens.logic.test.ts`; fixtures/literals that build `NoteRowNote` gain the two fields.
4. delete-note refresh + row delete through it (`delete-note.service.test.ts`, `NoteRowMenu.test.ts:430-438` file name).
5. row menu group (`NoteRowMenu.test.ts`, new `NoteRowMenu.lifecycle.test.ts` copied from `NoteRowMenu.favorite.test.ts`).
6. More menu group (`NoteActionBar.test.ts:298-350,519-533`).
7. Inbox check (`NoteRow.test.ts`, `RailNoteList.inbox-check.test.ts` with the virtua shim of `RailNoteList.test.ts:9-33`).
8. palette commands (`commands.test.ts`, count pin `:151` 46 -> 48).
9. hints, help, e2e.

## Defaults taken

- `kind` is a string; anything but `'markdown'` gets Move to Trash only. The row menu passes `isMarkdownFile(path) ? 'markdown' : 'other'` (`NoteRowNote` has no kind; importing rail-shell's `FileKind` into properties would close a cycle, `rail-shell -> properties` exists).
- More keeps acting through `toggleActiveNoteArchived` / `toggleActiveNoteOrganized` (the active tab's content, as Cmd+E); shortcut hints are literal combos (`{ key: 'e', meta: true }`, `{ key: 'h', meta: true, shift: true }`), since a feature cannot import `#lib/app/global-keybindings` (app-inbound rule).
- History calls `openFileHistory` from `features/file-history`: new acyclic pairs `note-list -> file-history`, `note-action-bar -> file-history` (file-history imports no feature); `feature-cycle.test.ts` rewrites `featurePairs` for them.
- More keeps its rule of no separator after a lone Copy deeplink.
- Check: lucide `CircleCheck`, `aria-label` and `title` "Mark organized"; errors other than the toasted frontmatter ones propagate, as the row Favorite does.

## Risks

- `NoteRowMenu.test.ts` and `RailNoteList.test.ts` mock `lifecycle.service`: their mock factories need the new exports.
- More items with a `DropdownMenuShortcut` change `textContent`; the test helpers read the label span.
- E2E not run in build (targeted checks only).
