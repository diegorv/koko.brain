# Issue 22 discovery: Neighbourhood lens

No `spec.md`; the source is `PRD.md` (Lenses: Neighbourhood, Note action bar, Q17). Builds on `work/04` (foldable
bar actions), `work/19` (grouped lens: headers, counts, "Nothing here") and `work/21` (`openSearch` pattern). Only
the differences are listed.

## Files that change
- `rail-shell/lens.logic.ts`: `NEIGHBOURHOOD_LENS_KIND` / `NEIGHBOURHOOD_RAIL_ITEM = 'neighbourhood'`,
  `neighbourhoodLens(path)`; `resolveNeighbourhoodLens` built into `resolveLens:276` (pure, over the entries
  snapshot): groups This note, Outgoing links, Backlinks, Belongs to, Related to, Has many, Other relationships.
  `restoreRailItem:140` gains `neighbourhoodPath` (the item only restores while a note is set).
  `newNoteRule:405` already returns null for the kind (no provider) -> no New here.
- NEW `rail-shell/neighbourhood.store.svelte.ts` (`notePath`, `setNotePath`, `reset`) and
  `rail-shell/neighbourhood.service.ts::openNeighbourhood(path)`: sets the note, `railItem: 'neighbourhood'`,
  `railPanelsVisible: true` (as `openSearch`).
- `core/layout/AppShell.svelte:116`: passes `neighbourhoodStore.notePath` to `restoreRailItem`.
- `core/app-lifecycle/app-lifecycle.service.ts:532`: `teardownVault` resets the store (no stale vault path).
- `note-action-bar.logic.ts`: `'neighbourhood'` first in `FOLDABLE_ACTIONS`, last in `FOLD_ORDER`;
  `foldActions(barWidth, withNeighbourhood = false)` leaves it out of both lists when false.
- `NoteActionBar.svelte`: rail shell only (`settingsStore.layout.shell === 'rail'`), inline before Raw
  (lucide `waypoints`), in More when folded.

## Data
`typeDefinitionsStore.entries` = `get_all_vault_entries_v2`, re-fetched on `vault-index-updated` (version bump,
`tauri-listeners.service.ts:141-149`); `RailNoteList` re-resolves on `entriesVersion`. Links resolve with
`buildResolutionCache` / `resolveWikilinkCached` over the snapshot paths (as `graph-view.logic.ts:24`). Backlinks:
entries whose `outgoingLinks` resolve to the note (frontmatter links included, as Rust's `get_backlinks_v2`).

## Plan (test-first)
1. `lens.logic.test.ts`: groups + order for links in every direction, none (all 0), missing note -> null, restore.
2. `note-action-bar.logic.test.ts`: fold order with Neighbourhood; classic leaves it out.
3. NEW `neighbourhood.store.test.ts`, `neighbourhood.service.test.ts`; teardown test asserts the reset.
4. `NoteActionBar.test.ts`: rail shows + click opens lens; classic hidden; folds into More and works there.
5. `RailNoteList.test.ts`: headers with counts, 0 + "Nothing here", no New here, refresh after `setEntries`.

## Defaults taken
- The lens is session-only (PRD Persistence lists no neighbourhood): after restart, or a vault switch, it falls
  back to Today. No rail item is highlighted while it shows.
- Groups list only notes in the snapshot (broken links, non-markdown targets left out), deduped, link order;
  backlinks newest change first. The note itself is left out of its own groups. Archived and system-folder notes
  are listed (the rule is "everything linked to it").
- Label: the note title; rule "<title> and everything linked to it". A note gone from the snapshot resolves null.

## Risks
- `notes.length` (header count) counts each note once across groups, as Today.
