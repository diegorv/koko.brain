# 06 discovery: "Todoist: Sync now" pulls projects and open tasks

No `spec.md`; the design is `research/design.md` rules 1, 3, 8, 8c, 9, 10, 11, Project model, Anchor. Builds on 02 (line helpers), 03/04 (writers), 05 (fake `/sync`, state IPC, settings, `treeProjectIds`). Pull only: no command is sent to Todoist.

## Files

- `src/tests/fixtures/todoist-sync.fake.ts:247-251` `since`: a full sync (`*`) leaves out checked items (live-check 5b; 05 review finding 4). `todoist-sync.fake.test.ts` gets the case.
- New `features/todoist-sync/pull.logic.ts` (pure): `normalizeSyncFolder`, `projectNoteBaseName`, `extractTaskLines` (open-tab text, Rust `extract_tasks` mirror), `pulledTaskLine` (line + `local_base` + `remote_base`), `kokobrainAnchor`, `planPull` (project notes to create, inserts per note, new links, frozen flags, log entries, rebuild mode).
- `priority.logic.ts`: `mapPriorityFromTodoist` (4 -> highest, 3 -> high, 2 -> medium, 1 -> none). `task-line-edits.logic.ts:125` `codeFence` exported for `extractTaskLines`.
- New `features/todoist-sync/vault-scan.service.ts`: `scanVault(vaultRoot, templatesFolder)`: `get_all_tasks_v2` + `get_all_property_records` (frontmatter `todoist_project`, note paths), open tabs through `readNoteContent` (04) replace the index tasks of their note, `isInSyncScope` filter, `buildAnchorOccurrences`.
- New `features/todoist-sync/sync-now.service.ts`: `syncNow()` / `syncNowFromUi()` (toast). Guards, one full `/sync` (projects + items), read kv + links, scan, plan, write (vault path rechecked before every write), then one `todoist_commit_state` (links + `sync_token`) and `todoist_append_log`.
- `closed-note-writer.service.ts:68` `createEmptyNote` -> exported `createNoteFile(vaultRoot, path, content)` (project note with frontmatter).
- `todoist-sync.store.svelte.ts:4` result becomes a union with a `pull` kind (notes created, tasks inserted, links paired).
- `app/commands.ts:243` palette `todoist:sync-now`, "Todoist: Sync now".

## Prior art

- `todoist-sync.service.test.ts` (fake `/sync`, real stores); `closed-note-writer.service.test.ts` (invoke mock). New fixture `src/tests/fixtures/todoist-vault.fake.ts`: an in-memory vault behind `invoke` (tasks, property records, `write_task_lines` through the real `applyTaskLineEdits`, `create_note`, the five `todoist_*` commands, root checks).

## Defaults taken

- Each run is a full `/sync`: the tree filter needs the whole project list. The returned token is stored for later tickets.
- Rebuild mode = empty link table and (an anchored line in the vault, or a remote item whose description carries `kokobrain:td-...`). A Todoist-born item alone is no evidence of a lost store; otherwise the first run could never create anything. Pairing by anchor also runs in normal mode, so a line whose link is gone is paired, never duplicated.
- A paired link stores `remote_base` from the item and `local_base: null` (no line was written by the sync). An unpaired item with a `kokobrain:` line is never inserted (ticket 10), only logged.
- Existing links are not touched except `frozen` (= 2+ occurrences, logged when it turns on); unchanged links are not re-upserted. Missing lines of existing links are not reinserted (detach is ticket 13).
- `syncFolder`: trimmed, trailing slashes removed; a leading `/` or `\`, `~` or a drive letter is absolute and refused; any `..` segment refused; empty -> `Todoist`.
- Filenames: `\ / : * ? " < > |` and control chars -> `-`, leading dots and surrounding spaces/dots trimmed, empty -> `Untitled`; collision (case-insensitive, any indexed note, or another project in the run) -> ` 2`, ` 3`. Inbox allocated first as `Inbox.md`. Two notes with the same `todoist_project` id: that project gets no writes, logged.
- Excluded labels (never tags, kept in `unmappedLabels`): `todoist` (scope tag), `defaultLabel`, `Work`, `personal`, case-insensitive. Due date written as `due.date` cut to `YYYY-MM-DD`; `🔁` only when `isRecurring`. A newline in content becomes a space (the writer refuses newlines); every round-trip problem is logged (`content-roundtrip`) and kept as `remote_base.contentProblem`.
- Scan scope = the rule 11 exclusions only (`isInSyncScope`); the `#todoist` scope (b) matters for pushes, not here.

## Risks

- The fake vault's task parser is a test double for Rust `extract_tasks`; the real filter logic runs in TS.
- A stale write (user edited the note mid-cycle) drops that note's new links; the next run retries.
