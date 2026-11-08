# 224: The auto-move example's steps move the notes as written: edit then save, the right default delay, rules loaded after copying the file

**Origin:** `audit-2026-11-05` Issue 75, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Cmd+S on an unedited note writes nothing: writeTab returns early when the tab is not dirty (src/lib/core/editor/editor.service.ts:189), so notifyAfterSave never fires and Auto Move, which runs only from that observer (auto-move.service.ts:96), moves nothing. The README also gives the default debounce as 2000 ms (help/examples/auto-move-features/README.md:41) while the default is 3000 ms (settings.store.svelte.ts:109, 22-auto-move.md:113). Rules are loaded only at vault open (app-lifecycle.service.ts:292), so a rules file copied while the app runs is not loaded, and the next Settings > Auto Move edit writes the old store over it. Fix direction: README step 4 says to make a small edit and save; step 1 says to copy the file with the app closed or reopen the vault; the delay says 3000 ms. The help page can add that an existing note moves only after its next edited save.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/help/auto-move-features.test.ts (new, same layout as src/tests/help/collection-features.test.ts): the default debounce stated in help/examples/auto-move-features/README.md equals the settings default autoMove.debounceMs. It fails today (2000 vs 3000).
- [ ] README step 4 asks for an edit before saving; step 1 says when the copied rules are picked up.
- [ ] help/documentation/22-auto-move.md states that a note is evaluated after a save that wrote it.
- [ ] Frontend gate: pnpm vitest run on src/tests/help passes.

## Notes

- **Priority:** polish (bucket 3-polish). Polish/low. It is a docs and example fix.
- **Trigger:** The owner copies help/examples/auto-move-features into the vault and follows 'Trying it locally': copies auto-move-rules.json into .kokobrain/ while the app runs, turns Auto Move on, opens each Inbox note and presses Cmd+S with no edits, as step 4 says.
- **Evidence (verified by reading code at `5f8003d67`):** help/examples/auto-move-features/README.md:41 '2000 ms', :59 'press Cmd+S (no edits needed)'; src/lib/core/editor/editor.service.ts:189 `if (!tab || isVirtualTab(tab) || !isTabDirty(tab)) return true;` before notifyAfterSave at :196; src/lib/features/auto-move/auto-move.service.ts:96 only trigger is the after-save observer; src/lib/core/settings/settings.store.svelte.ts:109 debounceMs: 3000; src/lib/app/lifecycle/app-lifecycle.service.ts:292 only loadAutoMoveConfig call; src/lib/features/auto-move/auto-move.service.ts:70-88 save writes the store unconditionally.
- **Source:** audit 2026-11-05, domain `metadata`, finding `N-metadata-05` (from metadata-spec-3). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, low). Confirmed. Cmd+S calls saveCurrentFile, then saveFileByPath, then writeTab. writeTab returns early when the tab is not dirty (editor.service.ts:189), so notifyAfterSave never runs, and the auto-move hook (auto-move.service.ts:96) is its only trigger. The README says 2000 ms (:41) while the default is 3000 (settings.store.svelte.ts:109; 22-auto-move.md:113). loadAutoMoveConfig is called only at vault open (app-lifecycle.service.ts:292), with no file watch, and saveAutoMoveConfig writes the store unconditionally. The Issue is docs only, and the src/tests/help layout it cites exists.

## Comments
