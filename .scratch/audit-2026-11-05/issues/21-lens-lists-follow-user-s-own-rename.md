# 21: Lens lists follow the user's own rename, move, delete, duplicate and create at once, not after the 2 to 10 s index throttle

**What to build:** Every lens except the folder lens lists typeDefinitionsStore.entries (src/lib/features/rail-shell/lens.logic.ts:443-445, RailNoteList.svelte:126-135 and :177-190). That snapshot is replaced only by the vault-index-updated listener, which waits REFRESH_DELAY_MS 2 s and at most one refresh per REFRESH_MIN_INTERVAL_MS 10 s (src/lib/app/tauri-listeners.service.ts:106-109, :276-290), unless vaultStore.requestPromptIndexRefresh() was called first (:297-303). The lifecycle, type and view writers call it (src/lib/features/properties/lifecycle.service.ts:34,50,68; type-definitions.service.ts:275), but applyPathChange (src/lib/core/filesystem/path-change.service.ts:145-236), createFile and duplicateItem (src/lib/core/filesystem/fs.service.ts:198-224, :345-365) and createNoteHere (src/lib/features/rail-shell/new-note.service.ts:24-40) do not. Autosaves keep lastRefreshAt recent, so right after typing the wait approaches 10 s: a renamed row keeps its old title, a trashed note's row stays clickable and opening it fails with 'Failed to open file.', a new or duplicated note is missing. The 2026-11-03 rail-shell review already listed the create case as F42, unfixed. Fix direction: request a prompt refresh from these user-initiated file operations (applyPathChange after a successful diskOp covers rename, move and delete from every entry point; createFile and duplicateItem cover the rest).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/filesystem/fs.service.test.ts: with the vault open and Tauri invoke mocked, await renameItem('/vault/a.md', 'b.md'), then vaultStore.takePromptIndexRefresh() returns true. It fails today. Use the real vaultStore.
- [ ] The same holds after deleteItem, moveItem, duplicateItem and createFile, and after a failed diskOp no prompt refresh is requested.
- [ ] In src/tests/lib/app/tauri-listeners.service.test.ts: after a refresh that sets lastRefreshAt, a rename followed by a vault-index-updated event patches the sidebar entries without advancing fake timers.
- [ ] Background bursts (watcher batches, embedder updates) still go through the throttle.
- [ ] Frontend gate: pnpm check and pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. Daily lenses show stale rows for seconds after the user's own file operations.
- **Trigger:** In the Today, Inbox, Favorites, a Type or a view lens, rename a note with F2, move it to the Trash from the row menu or the editor, duplicate it, or create a note with Cmd+N or + New here, shortly after typing in any note.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/rail-shell/lens.logic.ts:443-445 lensListsEntries true for every kind except the folder lens -> src/lib/features/rail-shell/RailNoteList.svelte:126-135 lensContext().entries = typeDefinitionsStore.entries; :177-190 resolveLens on it -> src/lib/app/tauri-listeners.service.ts:106-109 REFRESH_DELAY_MS 2000, REFRESH_MIN_INTERVAL_MS 10_000; :276-290 scheduleRefresh; :297-303 the only bypass is vaultStore.takePromptIndexRefresh() (src/lib/core/vault/vault.store.svelte.ts:113-122) -> rg requestPromptIndexRefresh src/lib: list-prefs, lifecycle, type-definitions, collection only; none in core/filesystem or new-note.service.ts -> path-change.service.ts:172 removes a deleted node from the file tree at once (folder lens correct), but nothing updates entries -> Rust create_note/rename_note/remove_note_from_index emit vault-index-updated (src-tauri/src/commands/vault.rs:1003, :1198, :1047), which land in the throttle. .scratch/rail-shell-ux/review-2026-11-03.md:128 F42 (create case).
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-04` (from file-io-ux-2). Size S.

## Comments
