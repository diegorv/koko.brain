# 043: Lens lists follow the user's own rename, trash, duplicate and create at once, not after the 2 to 10 s index throttle

**Origin:** `audit-2026-11-05` Issue 21, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Every lens except the folder lens lists typeDefinitionsStore.entries (src/lib/features/rail-shell/lens.logic.ts lensListsEntries, :456; RailNoteList.svelte:130). That snapshot is replaced only by the vault-index-updated listener, which waits REFRESH_DELAY_MS 2 s and at most one refresh per REFRESH_MIN_INTERVAL_MS 10 s (src/lib/app/tauri-listeners.service.ts:106-109, scheduleRefresh :276-290), unless vaultStore.requestPromptIndexRefresh() was called first (consumed at :298). The lifecycle, collection, list-prefs and type/view writers call it (e.g. lifecycle.service.ts:34, type-definitions.service.ts:275); the user's own file operations do not. Autosaves keep lastRefreshAt recent, so right after typing the wait approaches 10 s: a renamed row keeps its old title, a trashed note's row stays clickable and opening it fails with 'Failed to open file.', a new or duplicated note is missing. The 2026-11-03 rail-shell review already listed the create case as F42, unfixed.

Fix: call `vaultStore.requestPromptIndexRefresh()` from the user's own entry points only, before the operation, as createView does (type-definitions.service.ts:272-276: asked before the write, since the Rust command emits the event):
- the note-list row menu (src/lib/features/note-list/NoteRowMenu.svelte): commitRename (:123-136, which the row's F2 key also ends in, NoteRow.svelte:73), handleDelete (:155-163, after the confirm) and handleDuplicate (:77-79);
- Cmd+N: createNoteComposer (src/lib/plugins/quick-capture/note-composer.service.ts:20), before openOrCreateNote;
- "+ New here": createNoteHere (src/lib/features/rail-shell/new-note.service.ts:24-40), before either branch.

Do not request it inside applyPathChange, createFile, duplicateItem or any other core filesystem function: auto-organize (auto-organize.service.ts:338 moveItem, :473 renameItem) and vault mods (mod-vault.service.ts:93, :100) reach those too, and their bursts must stay throttled.

**Blocked by:** none
**Status:** ready-for-agent

**Answered:** 2026-11-12, owner: approved as an addition to the queue; the prompt refresh fires only from the owner's own entry points (row menu, F2, Cmd+N, New here), not inside applyPathChange; blocked by 028.

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`, plus the targeted e2e check `bash scripts/e2e.sh e2e/specs/file-explorer.spec.ts e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts` (the docs/TESTING.md row for features/rail-shell). Relay-lite runs no e2e, so the build step runs it and reports the result.

- [ ] Failing test first, in src/tests/lib/features/note-list/NoteRowMenu.test.ts (real vaultStore, fs.service mocked): after Rename is committed with a new name, `vaultStore.takePromptIndexRefresh()` returns true. It fails today.
- [ ] The same holds after Move to Trash is confirmed and after Duplicate in that file, and after `createNoteComposer()` (src/tests/lib/plugins/quick-capture/note-composer.service.test.ts) and `createNoteHere(rule)` for a plain and a typed rule (src/tests/lib/features/rail-shell/new-note.service.test.ts). A cancelled Move to Trash and an unchanged or empty rename request nothing.
- [ ] Guard that pins the placement (passes today), in src/tests/lib/core/filesystem/fs.service.test.ts with the real vaultStore: renameItem, moveItem, deleteItem, duplicateItem and createFile called directly, as auto-organize and mods call them, leave `takePromptIndexRefresh()` false.
- [ ] Frontend gate: pnpm check and pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. Daily lenses show stale rows for seconds after the user's own file operations.
- **Trigger:** In the Today, Inbox, Favorites, a Type or a view lens, rename a note from the row menu or with F2, move it to the Trash from the row menu, duplicate it, or create a note with Cmd+N or + New here, shortly after typing in any note.
- **Read first:** docs/agents/indexing-watcher-rules.md (the entries snapshot is a cache, rule 12). The listener itself does not change.
- **Out of scope:** other ways to reach the same operations (Files navigator create and drag-move, the editor's Move to Trash, the quick switcher's create, the New File command, kanban, canvas and collection creates). They keep the throttle. Add them to this list of entry points later only if the owner asks.
- **Known limits, accepted (no extra code):**
  - The request is consumed by the next vault-index-updated, whatever sent it. If an earlier event of the same operation arrives first, for example the pre-delete save of a dirty tab at that path (saveDirtyTabsUnder -> update_note_in_index, which emits, src-tauri/src/commands/vault.rs:373), or an autosave of another note lands in between, that event refreshes at once and the operation's own event waits for the throttle, as today.
  - A failed operation, or Cmd+N on a note that already exists, leaves the request set; the next event then refreshes at once. One extra refresh, harmless.
- **Dropped criterion:** the old criterion 3 (in tauri-listeners.service.test.ts, a rename followed by vault-index-updated patches entries without timers) could not run a real rename there, since that file mocks fs.service, and the bypass it would exercise already exists and is tested (tauri-listeners.service.test.ts:492, :506). The entry-point tests prove the new wiring.
- **Series:** blocked by 028 (both touch the duplicate flow and NoteRowMenu.test.ts). It no longer edits tauri-listeners.service.ts or its test, so it does not overlap 003 there. Do not run it beside tasks 244, which changes how the entries snapshot refreshes. Run 094 after it (lens series).
- **Evidence (verified by reading code at `5f8003d67`, re-checked at `3ab6de999`):** lens.logic.ts:456 lensListsEntries true for every kind except the folder lens -> RailNoteList.svelte:130 lensContext().entries = typeDefinitionsStore.entries -> tauri-listeners.service.ts:106-109 REFRESH_DELAY_MS 2000, REFRESH_MIN_INTERVAL_MS 10_000; :276-290 scheduleRefresh; :298 the only bypass is vaultStore.takePromptIndexRefresh() (src/lib/core/vault/vault.store.svelte.ts:113-123) -> rg requestPromptIndexRefresh src/lib: list-prefs, lifecycle, type-definitions, collection only; none in note-list, core/filesystem, new-note.service.ts or quick-capture -> path-change.service.ts removes a deleted node from the file tree at once (folder lens correct), but nothing updates entries -> Rust create_note, rename_note and remove_note_from_index emit vault-index-updated, which land in the throttle. Cmd+N writes through openOrCreateNote -> create_note (note-creator.service.ts:79-136), not createFile. .scratch/archived/rail-shell-ux/review-2026-11-03.md:128 F42 (create case).
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-04` (from file-io-ux-2). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). typeDefinitionsStore.entries is written only by setEntries and patchEntries in tauri-listeners.service.ts:214,251,254, inside the throttled refresh (REFRESH_DELAY_MS 2000, REFRESH_MIN_INTERVAL_MS 10_000, scheduleRefresh :276-290). The only bypass is takePromptIndexRefresh (:297-303). rg requestPromptIndexRefresh lists only list-prefs, lifecycle, collection and type-definitions, and nothing in core/filesystem or new-note.service. applyPathChange updates only fsStore.fileTree. Every non-folder lens resolves from entries (lens.logic.ts:443-445, RailNoteList.svelte:126-135,177-190). Its suggested placement after diskOp in applyPathChange is superseded by the owner's 2026-11-12 decision (user entry points only).

## Comments

- 2026-11-12: deep dive (validate-s1+s2, cross-tests-relay M3, SUMMARY Q5). Owner chose the user entry points (row menu, F2, Cmd+N, New here) over applyPathChange, so What to build and criteria 1 and 2 now name those call sites, criterion 4 became a guard that core fs functions request nothing, and the unwritable tauri-listeners criterion 3 was dropped. Blocked by 028, targeted e2e specs named in the Gate, known limits recorded in Notes, title trimmed to the operations in scope.

- 2026-11-12: Blocked by 028 dropped: 028 is now polish (owner triage, 2026-11-12) and the link was only a shared test file (`NoteRowMenu.test.ts`), with no logic dependency. Do not run beside tasks-view-ux work that edits the same tests.
