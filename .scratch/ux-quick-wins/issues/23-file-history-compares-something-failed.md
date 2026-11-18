# 23: File History says what it compares and when something failed

**Origin:** design review 2026-11-17, proposals P77 (part), P153 (part), P16 (item 3) and P87 (SnapshotList part), prototype `.scratch/design-review/prototypes/feedback-components.html` (sections `P77`, `P153`, `P87`), research `.scratch/ux-quick-wins/research/verdict-feedback-a.md`, `verdict-feedback-b.md` and `breakdown.md` (old ticket 27).

**What to build:**

1. **Restore failure.** `handleRestore` (`src/lib/features/file-history/FileHistoryDialog.svelte:40-51`) catches a rejected `restoreSnapshot`, toasts "Could not restore this version. The editor may hold the restored text unsaved." and leaves the dialog open. The restore and save path itself is unchanged (`file-history.service.ts:82-105`).
2. **Load and diff errors.** The store gets `loadError` and `diffError`, cleared on success and by `reset()`. The list pane shows the load error with a Retry button only when no snapshots loaded (a `loadBackupTimestamps` failure after `setSnapshots` keeps the list). The diff pane shows the diff error with Retry in place of any diff, so a failed diff never leaves the previous snapshot's lines under the new selection (`selectedSnapshot` is already the new one at `file-history.service.ts:58`).
3. **Orientation.** The header reads "Compared with the note on disk" and the snapshot date and time; the raw 13-digit epoch goes (`FileHistoryDialog.svelte:83`). The right side of the diff is `readTextFile` at open (`file-history.service.ts:28-29`), not the editor buffer, so the text never says "current". `formatSnapshotLabel` returns "Latest saved version", "1 version before the latest", "N versions before the latest". A pure `diffSummary(lines)` in `file-history.logic.ts` feeds "+N" and "-M" chips; when both are 0 the pane shows "No differences from the note on disk" instead of chips (also when the diff is empty, which today reads "Select a snapshot to view changes"). `DiffViewer.svelte` gets a `thead`: "Version" over the old line numbers and "Note" over the new, with `title`s.
4. **Snapshot list.** The reveal control becomes a sibling `<button aria-label="Show backup file in Finder">` next to the row's select button, inside a wrapper that carries the hover and selected background. No `role="button"` inside a `<button>`, no `svelte-ignore node_invalid_placement_ssr`; Enter and Space work and the click does not select the row (`SnapshotList.svelte:38-62`).
5. **Docs.** `help/documentation/15-file-history.md:20,24` say "current content": reword to the note as last saved on disk.

Not in this ticket: a compact empty-history dialog; the restore guard (open-itens 023) and path-keyed history (open-itens 044), which stay open and will show this ticket's restore toast; any change to `saveCurrentFile`.

**Size:** M (six source files, one store, one logic file, four concerns). Split point: items 1 and 2 (failures: service, store, dialog catch, two error panes) first; items 3 and 4 (orientation, header, `thead`, list button) second.

**Blocked by:** 20

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh focus-ring.spec.ts` (its File History dialog case, `:10-35`)

- [ ] Failing test first, `src/tests/lib/features/file-history/FileHistoryDialog.test.ts`: `restoreSnapshot` rejects after the confirm; the dialog stays open, `toast.error` fires and there is no unhandled rejection.
- [ ] `get_file_history` rejects (`file-history.service.test.ts`, `file-history.store.test.ts`): `loadError` is set, the list shows the message and Retry, not "No history available"; Retry reloads. A `loadBackupTimestamps` failure after the snapshots loaded keeps the list.
- [ ] Snapshot A shown, then B selected and `compute_diff` rejects: `diffError` is set, A's lines are not rendered, Retry runs `selectSnapshot(B)`.
- [ ] `diffSummary` counts `insert` and `delete` and gives `{ added: 0, removed: 0 }` for `[]` and for all-`equal` lines; an all-equal or empty diff shows the no-differences notice and no chips; `formatSnapshotLabel(0)`, `(1)`, `(2)` read as above (`file-history.logic.test.ts:79-93` is updated, not removed).
- [ ] With a selected snapshot the header has "Compared with the note on disk", "+N", "-M" and no 13-digit number; the `thead` cells read "Version" and "Note".
- [ ] No `role="button"` inside a `button` in the dialog; the reveal button has a name, works on Enter and Space and does not change `selectedSnapshot`.
- [ ] `fileHistoryStore.reset()` clears both errors. The tests use the real `fileHistoryStore` and `file-history.logic.ts`; only Tauri `invoke`, `plugin-fs`, `plugin-dialog` and `svelte-sonner` are mocked.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P77.** File History restore and load failures give no feedback, and empty states make false claims. Catch the restore, load and diff failures and show them in place; stale diff lines must not sit under a new selection.
- **P153.** The File History diff lacks orientation. Say what is compared, show a summary of the change and label the two line-number columns. Validation: the right side is the note on disk, so the copy says so.
- **P16 item 3.** Errors go to the wrong channel or nowhere: the restore failure (this ticket); items 2 and 4 are in ticket 22; item 1 is done.
- **P87 (SnapshotList part).** Interactive controls are nested inside other interactive controls: the reveal control is a `span role="button"` inside the row button.

## Problem

A failed restore, history load or diff ends in a console line only, and the pane keeps saying "No history available" or shows the previous snapshot's diff under the new selection, so the person can restore a version whose diff was never shown. The header shows a 13-digit epoch and the label "Current", although the right side is the note as saved on disk, which differs from the editor when the tab is dirty. The reveal control is a button inside a button.

## Evidence

Checked at `085b23c5d`.

- `FileHistoryDialog.svelte:40-51`: `await restoreSnapshot(snapshot.id)` with no catch; `file-history.service.ts:101-104` logs and rethrows. `:83` prints `formatSnapshotDateTime` and the raw timestamp; `:84` prints `formatSnapshotLabel(selectedSnapshotIndex)`.
- `file-history.service.ts:47-50` (load catch only logs, also catches `loadBackupTimestamps` after `setSnapshots` at `:33-37`) and `:72-76` (diff catch only logs, `diffLines` keeps the previous diff).
- `file-history.logic.ts:46-50`: index 0 returns "Current". `DiffViewer.svelte:39-54`: `tbody` only, two unlabelled number columns.
- `SnapshotList.svelte:38-62`: `span role="button"` inside the row `<button>`, Enter only, behind `svelte-ignore node_invalid_placement_ssr` at `:48`. `SnapshotList` and `DiffViewer` have one consumer (`FileHistoryDialog.svelte:9-10`).
- `file-history.store.svelte.ts:50-60`: `reset()` lists the fields it clears.
- `e2e/specs/focus-ring.spec.ts:10-35` opens this dialog and asserts only the `File History: Welcome.md` heading and one focused element; the header text is not asserted there.

## Why blocked

- Ticket 20 changes the global keyboard focus ring (`button.svelte`, the dialog close button, the base outline in `src/app.css`) and rewrites probes in `e2e/specs/focus-ring.spec.ts`. This ticket adds Retry and reveal buttons that take that ring and uses the same spec's File History case as its regression check, so it runs after 20 to run against the final ring. No source file is edited by both.

## Sequence with

Open-itens 023 (restore guard) edits `restoreSnapshot` in `file-history.service.ts`, this ticket edits `openFileHistory` and `selectSnapshot` in the same file: rebase only. Shell-sidebars-ux 15 and 23 call `openFileHistory` and `restoreSnapshot` from the note list and tab menu but edit neither.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown.
