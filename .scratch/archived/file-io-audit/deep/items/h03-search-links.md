# Deep-dive group h03-search-links

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## rename-move-delete-3: Renaming or moving a folder removes its notes from full-text and semantic search until the next vault open
- claimed severity: stale-state
- anchor: src/lib/core/filesystem/path-change.service.ts:168
- scenario: Drag folder Projects/ into Archive/, or rename it. Text and semantic search return none of its notes until the app restarts, or until each note is edited and saved (the save-side observer re-adds only that one path).
- evidence given: READ: path-change.service.ts:168-170 calls forgetNote, with vaultPath (85-87), for every old child path. note-change.service.ts:197-219 then calls remove_from_search_index and remove_semantic_file. rename_note (vault.rs:1001-1035) re-keys only the VaultIndex. watcher-handler.service.ts:33-44 drops batches with no dotted basenames, and its full-rebuild branch (68-75) does not rebuild search. buildSearchIndex is called only at vault open (app-lifecycle.service.ts:421). trash.service.ts:159-162 records that a directory rename reaches the watcher as one dropped directory event, which is why restore re-indexes folder children by hand. Rename and move have no matching step.

## rename-move-delete-4: The link rewrite misses path-qualified, extension-qualified, self and unsaved links, leaving them dangling
- claimed severity: stale-state
- anchor: src/lib/core/filesystem/link-updater.logic.ts:27
- scenario: Note A contains [[Work/Plan]]. Rename Work/Plan.md to Work/Roadmap.md. A keeps [[Work/Plan]], which now resolves to nothing, and no warning is shown. The same happens for [[Plan.md]], for self-links inside the renamed note, and for [[Plan]] typed into a buffer that is not saved yet.
- evidence given: READ: link-updater.logic.ts:27 rewrites only when the whole target equals the bare note name. Resolution falls back to the basename, so these links did point at the note: Rust index.rs:110-124 with by_path keyed by stem (305-307), TS wikilink-resolution.logic.ts:41-60. Self-links are filtered at link-updater.service.ts:28. The source set comes only from saved-index get_backlinks_v2 (link-updater.service.ts:27). Per-file write failures are only logged (56-60).

## fidelity-13: Minor rewrites: integer-like keys reordered/requoted; rename rewrites wikilinks inside code blocks
- claimed severity: minor
- anchor: src/lib/core/filesystem/link-updater.logic.ts:23
- scenario: Frontmatter 'title: x\n2024: a' comes back as '"2024": a\ntitle: x' after any rewrite. A note that documents [[Old]] inside a code fence and also links to Old gets the code example changed on rename.
- evidence given: properties.logic.ts:290 Object.entries over toJS (JS integer-key ordering, INFER); link-updater.logic.ts:23-39 regex replace with no fence awareness.
