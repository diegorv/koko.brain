Status: done
Phase: 1

# Lifecycle UI actions in Inspector panel

## What to build

Add UI controls for toggling lifecycle state on notes. End-to-end: button click -> frontmatter update -> save -> Rust index updated -> UI reflects new state.

Actions needed:
- "Mark as organized" / "Mark as not organized" toggle in the Inspector panel
- "Archive" / "Unarchive" action (Inspector panel or context menu)
- "Favorite" / "Unfavorite" toggle (already may exist for bookmarks - adapt or extend)

Each action writes the canonical frontmatter key (`_organized`, `_archived`, `_favorite`) with the new boolean value. The save triggers `update_note_in_index` which picks up the new flags (from issue 03).

## Acceptance criteria

- [ ] "Organized" toggle visible in Inspector for non-Type notes
- [ ] Clicking toggle writes `_organized: true/false` to frontmatter and saves
- [ ] "Archive" action available in Inspector or note context menu
- [ ] Archive action writes `_archived: true` to frontmatter and saves
- [ ] "Unarchive" available on archived notes
- [ ] Vault index reflects new flag values after save
- [ ] Visual indicator showing current lifecycle state (organized/archived)
- [ ] Tests for frontmatter mutation logic

## Blocked by

- 03-lifecycle-flags-in-rust-index
