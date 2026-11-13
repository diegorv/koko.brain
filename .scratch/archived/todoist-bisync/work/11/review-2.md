VERDICT: APPROVED

Re-review of the fixes in ca50bf888 (`git diff dcfee3ce6..HEAD`), against `.scratch/todoist-bisync/work/11/review.md` and its "## Resolution".

## Previous findings

| # | Severity | Outcome | Evidence |
|---|----------|---------|----------|
| 1 | major | resolved | `sync-now.service.ts:654-672` `writeProjectId` now takes the tab branch when a tab holds the note: same lossy check and `rebuildContent(parseFrontmatterProperties(...))` as `frontmatter-write.service.ts` `attempt`, then `syncExternalContentToEditor(path, next, false, 'body')` with no `saveFileByPath`. That is the content-only path `note-writer.service.ts:83` uses for a background tab. For the active tab, `syncExternalContentToEditor` bumps the external-content signal, which is the same route the core frontmatter writer takes for the active tab, so no new behavior there. A closed note still goes through `updateNoteFrontmatter`. Test "writes the id to the tab of an open note without saving it" asserts that the tab content carries `todoist_project`, that `savedContent` and the file on disk are unchanged, and that the base is stored. The old code would have saved the tab and fails that assertion. While the autosave is pending, the next cycle's scan reads the note from disk without `todoist_project`. `planProjects` still adds nothing for it, because the `known` set (projects.logic.ts:280-281) excludes a note that a base points at. |
| 2 | minor | resolved | `projects.logic.ts:240-252`: the note's own path is skipped in the collision loop, and a target equal to the note's path apart from case keeps the path and only moves the base name. The removed `target === localName` short-circuit is covered by the same branch, since `pathFor(localName)` equals `note.relPath`. Tests: "keeps the note path on a case-only Todoist rename..." and "leaves the note's own path out of the collision check". The next cycle sees no local or remote rename, so the note does not loop. |
| 3 | minor | resolved | Two service tests: "sends a line with the real project id when its project_add went out in an earlier request of the cycle" (100 lines plus the note; `project_add` is in request 1 and `Outline` in request 2 with the real id), and "resends a line with the real project id after its project was acknowledged in an earlier cycle". I ran my own throwaway mutation (passing `{}` for `known` to `sendCommands`, then restored, worktree clean), and the second test failed (exit 1). |
| 4 | minor | rejection stands | The review itself asked for no code (a rare race under the owner's rules). The Resolution records the follow-up for the main session, including the line-detach half. |
| 5 | nit | resolved | `sync-now.service.ts:225,237-239`: the root is still checked on the full pull first, and `treeIds` now comes from the merged `projects`. Test "detaches the note of a project deleted between the two pulls of one cycle" asserts `missCount` 3 and `detached: true` on the base. |
| 6 | nit | resolved | JSDoc added on every field listed in finding 6 (`projects.logic.ts:43,51,59,64,66,71,73,99,103,105`). |
| 7 | nit | resolved | discovery.md line 29 now says that rebuild mode blocks only `project_add`. |

No test was deleted or weakened: the fix commit only adds tests. Nothing outside the files tied to these findings changed. No change to `src-tauri/`, `layer-baseline.json`, `BASELINE_SIZE` or the composition roots.

## Acceptance criteria re-checked

- [met] A new note directly in the sync folder (not a subfolder, not excluded) without `todoist_project` frontmatter: `project_add` (uuid, temp_id, `parent_id` = the root project, design rule 8c) and its tasks' `item_add` in the same request with `project_id` = the temp id; the frontmatter id is written on ack. — The closed-note path is unchanged and its tests still pass. An open note gets the id in its tab content, left to the autosave ("writes the id to the tab of an open note without saving it"). A line split across requests, or resent in a later cycle, is sent with the real project id (the two new service tests).
- [met] Todoist rename: the file is renamed through the app's rename-with-links path (`renameItem`). Brain file rename: `project_update` with the new filename as name. — The rename tests still pass. A case-only Todoist rename now keeps the path (no self-collision suffix), and a path that would have collided with itself is left alone. Both are covered by the new logic tests.
- [met] `is_archived`: the note's tasks stop syncing (links kept); unarchive resumes. `is_deleted`: the note and its links are detached (nothing deleted), logged. — The existing tests pass. A deletion that lands between the two pulls of one cycle now detaches the base too ("detaches the note of a project deleted between the two pulls of one cycle").
- [met] Gate: frontend, or Both if IPC changes. — No IPC change. `pnpm check` exited 0 (229 files, 0 errors). The targeted vitest run passed. The full suite is deliver's to run.

## Findings

None open or new.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 229 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/ src/tests/lib/core/frontmatter/ src/tests/lib/architecture/`: exit 0, 37 files, 1198 tests.
- Throwaway mutation of `known` in `pushCreates`: the matching test failed. The file was restored with `git status` clean.
- Not verified: the active-tab route of the tab write runs with a live CodeMirror view. The service tests have no view, so this rests on the external-content signal that the core frontmatter writer already uses.
