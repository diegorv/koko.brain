# 38: Native confirmation dialogs name the action instead of Yes and No

**What to build:** Eight `ask()` calls from `@tauri-apps/plugin-dialog` pass no `okLabel`/`cancelLabel`, so the native dialog shows "Yes" and "No" for a destructive question. Pass both labels at each site. Cancel is always `Cancel`: passing only `okLabel` leaves the cancel button as "No" (`node_modules/@tauri-apps/plugin-dialog/dist-js/index.js:184-185`). Labels are Title Case, matching the dialog titles and the one labelled call, `src/lib/core/settings/sections/UpdateSection.svelte:207-208` (`'Install Stable'` / `'Cancel'`):

| Site | Prompt | `okLabel` |
|---|---|---|
| `src/lib/core/settings/sections/TrashSection.svelte:34` | Delete Permanently (irreversible) | `Delete Permanently` |
| `src/lib/core/settings/sections/TrashSection.svelte:49` | Empty Trash (irreversible) | `Empty Trash` |
| `src/lib/core/editor/editor.service.ts:277` | Unsaved Changes on tab close | `Discard Changes` |
| `src/lib/core/vault/exit.service.ts:35` `confirmDiscardFailedSaves` | Unsaved Changes on Close/Switch after a failed save | `` `${verb} Anyway` `` (`Close Anyway` from `exit.service.ts:16`, `Switch Anyway` from `vault.service.ts:23`) |
| `src/lib/core/filesystem/delete-note.service.ts:14` | Move to Trash (reversible) | `Move to Trash` |
| `src/lib/features/note-list/NoteRowMenu.svelte:142` | Move to Trash (reversible) | `Move to Trash` |
| `src/lib/features/rail-shell/FilesNavigator.svelte:193` | Move to Trash, folder (reversible) | `Move to Trash` |
| `src/lib/features/file-history/FileHistoryDialog.svelte:44` | Restore Version (replaces current content) | `Restore Version` |

Messages, titles and `kind` stay as they are. **Assumes the owner decision recorded in the cluster:** Move to Trash keeps a confirm, now with verb labels; replacing it with an Undo toast is a separate change.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: the existing exact-options assertions are extended (not loosened) to expect `okLabel` and `cancelLabel: 'Cancel'`, and run red before the source change: `src/tests/lib/core/filesystem/delete-note.service.test.ts` (about line 35), `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts` (about line 325), `src/tests/lib/features/note-list/NoteRowMenu.test.ts` (about line 336), `src/tests/lib/features/rail-shell/TypesNavigator.test.ts` (about line 664), `src/tests/lib/core/vault/vault-switch-failed-save.test.ts` (about line 82, `Switch Anyway`), `src/tests/lib/core/vault/vault.service.switch-save.test.ts` (about line 176, `Switch Anyway`)
- [x] `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts` (about line 361) replaces `expect.anything()` with the exact options object including both labels
- [x] `src/tests/lib/core/vault/exit.service.test.ts` (about line 107) asserts `okLabel: 'Close Anyway'` and `cancelLabel: 'Cancel'`
- [x] `src/tests/lib/core/editor/editor.service.test.ts` `closeTab` block gains a case: closing a dirty, unpinned, non-virtual tab calls `ask` with `'This file has unsaved changes. Discard changes?'` and `{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Discard Changes', cancelLabel: 'Cancel' }`, and a declined prompt (`ask` resolves false) keeps the tab open (real `editorStore`)
- [x] New `src/tests/lib/core/settings/TrashSection.test.ts` (jsdom; real `trashStore`, and a real `vaultStore` with a path set, since both handlers return early without one; `@tauri-apps/plugin-dialog` and the trash service (`loadTrash`, `deletePermanently`, `emptyTrash`) mocked): Delete Permanently and Empty Trash call `ask` with their exact message and both labels; a declined prompt calls neither `deletePermanently` nor `emptyTrash`
- [x] New `src/tests/lib/features/file-history/FileHistoryDialog.test.ts` (jsdom; real `fileHistoryStore` with a selected snapshot; `@tauri-apps/plugin-dialog` and `./file-history.service` mocked): "Restore This Version" calls `ask` with its exact message and `okLabel: 'Restore Version'`, `cancelLabel: 'Cancel'`; a declined prompt does not call `restoreSnapshot`
- [x] All 8 sites in the table pass both labels; `UpdateSection.svelte` is unchanged; `src/tests/lib/core/settings/UpdateSection.restart.test.ts` and `src/tests/lib/app/tauri-listeners.service.test.ts` stay green
- [x] No test is deleted or weakened; every changed assertion now checks more, not less

## Notes

- **Source:** review summary item 12 and section 2 "Confirm policy"; `work/overlays.md` P2, P13 and R7. The review summary lists 7 sites; `exit.service.ts:35` is the eighth (it serves both Close and Switch).
- **Owner decision assumed:** reversible Move to Trash keeps a verb-label confirm (review: "Start with verb labels everywhere and decide on undo separately"). If the owner later picks no confirm plus an Undo toast (as calendar events do, `event-calendar.service.ts:1462-1474`), that is a new ticket that removes three prompts.
- **Tests mock the plugin:** `docs/TESTING.md` and ADR-0007 list the dialog plugin among mocked Tauri boundaries, so the tests prove the options passed, not the rendered buttons. The owner can check one prompt in `pnpm tauri dev`.
- **Gotcha:** `ask()` returns `result === okLabel`, so `okLabel` and `cancelLabel` must differ; they do in every row.
- **Out of scope:** merging the three copies of the Move to Trash prompt (`delete-note.service.ts`, `NoteRowMenu.svelte`, `FilesNavigator.svelte`); toast copy and the Toaster theme.
- **Size:** M (8 two-line source edits across 7 files; most of the work is tests).

## Comments

- 2026-11-05 (issue/38-confirm-verb-labels): native ask() confirms now name the action (verb labels, Title Case). Review round 1 APPROVED with one test nit, fixed after review (exact exit prompt message). Delivery finished by the main session after the deliver run timed out under load; the main session also added the missing .js extensions to the new FileHistoryDialog.test.ts imports (36cbce083), which lib-specifier-convention.test.ts rejected. Full suite 499 files, 11818 passed, build OK.
