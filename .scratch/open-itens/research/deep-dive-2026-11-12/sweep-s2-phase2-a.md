# Sweep s2-phase2-a: Issues 032 to 049

Checked read-only against HEAD `afc0a9df8` on 2026-11-12. All 18 ledger rows are `todo`; none is done or wontfix, so all are in scope. Facts are marked (F) = verified in code at HEAD, (I) = inference.

## Table

| # | Title (short) | Still present at HEAD | Impact for this owner | Cx | Risk | Owner decision open |
|---|---|---|---|---|---|---|
| 032 | Mod errors out of Sentry | Yes (F) | low: needs Sentry on and a mod that throws asynchronously | M | low-med | Re-triage pending (see notes) |
| 033 | Privacy scanner skips URL lines, PRIVACY.md | Yes (F) | low: CI gate and docs, no runtime effect | M | low | No (GNU grep decided) |
| 034 | Sentry environment, test button, DSN, copy | Yes (F) | low: dev noise in the owner's own Sentry | S/M | low-med (new IPC arg) | No |
| 035 | Rust panic location in Sentry | Yes (F) | low | S/M | medium (disables default integrations) | No; blocked by 034 |
| 036 | History "Automatic snapshots" needs vault reopen | Yes (F) | low: rarely toggled | S | low | No |
| 037 | update_semantic_file has no queue | Yes (F) | medium-low: semantic search is off by default; hits on bursts (mods, bulk create) | L | high (Rust, shared embedder state) | Option A already chosen |
| 038 | Canvas images blocked by missing `fs:allow-read-file` | Yes (F) | high inside canvas (every image node is a placeholder); canvas is deferred | S | low | No |
| 039 | Canvas file/image nodes: absolute vs relative path | Yes (F) | high inside canvas (every picked or dropped node fails to load); canvas is deferred | S | low | No (D7 b recorded) |
| 040 | Kanban drag drop lands in the wrong slot | Yes (F) | high inside Kanban (card down in a lane, any lane move); Kanban is deferred | M | low-med | No; blocked by 006 -> 004 |
| 041 | DataArray sort with missing keys | Yes (F) | low-med: QueryJS dashboards, not in the daily list | S | low | No |
| 042 | Enter in quick switcher creates note on no match | Yes (F) | medium-high: Cmd+O, type, Enter is a core flow | S | low | No |
| 043 | Lens lists lag the user's own rename/trash/create | Yes (F) | medium-high: daily rail lenses show stale rows for up to ~10 s | S/M | low-med | No |
| 044 | File History not re-keyed on rename/move | Yes (F) | medium: renames are common, history panel then empty; bytes safe | L | high (Rust command, IPC contract, path-change, trash) | No |
| 045 | Text search `word tag:/path:` only filters top 50; nested tags | Yes (F) | medium: needs a word in over 50 notes (likely in a 10k-note vault) | S-M | low | No |
| 046 | Outgoing links marks embeds and `[[#H]]` as broken | Yes (F) | low-med: wrong red icon, no data effect | M | low | No; blocked by 014 |
| 047 | Numeric `<`, `>` filters match notes lacking the property | Yes (F) | medium: .view and collection filters list wrong notes when the property is sparse | S | low | No |
| 048 | Kanban lane actions and raw `---`; restore to missing lane | Yes (F) | low: needs hand-written `---` in a lane; part 2 unreachable from UI | S | low | No |
| 049 | Kanban lane rename drops limit/auto-complete/collapsed | Yes (F) | medium inside Kanban, rare trigger (rename) | S | low | No; "blocked by 048" is only a same-file ordering |

## Recommended to join the queue

1. **042** Quick switcher Enter creates the note. S, low risk, one component (`QuickSwitcher.svelte:94-103` is still a plain `<button>` inside `Command.Empty`, so Enter has no selected item). Daily core flow. Gate includes `pnpm build` per the Issue.
2. **043** Own file operations request a prompt index refresh. S/M, low-med risk. Only call sites of `requestPromptIndexRefresh` are in properties, type-definitions, collection and list-prefs (F, rg at HEAD); none in `core/filesystem` or `new-note.service.ts`. The fix adds a flag call after a successful diskOp in rename, move, delete, duplicate, create. Run it after 009 and the 070 group (priority notes list 043 in the RailNoteList/lens series, although the edit is in `fs.service.ts`, `path-change.service.ts`, `new-note.service.ts`).
3. **047** Numeric ordering filters with a missing property. S, pure logic: `compareValues` (`evaluator.ts:708-715`) ends in `toNumber(a) - toNumber(b)` and `toNumber(null)` is 0 (F). Only the final branch changes; date and string branches stay. Test-first is easy. Check nothing else relies on `null < x` (I: grep the evaluator tests, `missing + 5` must stay 5).
4. Second tier, add if the owner wants more: **045**. Frontend-only minimum is S: when operators are present, request a much larger `maxResults` and use `matchesIndexTag` (exists, `search.logic.ts:149`) instead of `tagSet.has` (`search.service.ts:215`), then cap after filtering. The Rust-side filter is the larger M variant. The merged Issue 24 (stale results after a no-hit query) adds a second test set in the same branch.

## Deferred-by-owner items worth a second look

- **038 and 039 (canvas images and file nodes):** both still fully present (F: `canvas-image.service.ts:35` is the only `readFile` import in `src/lib`; `default.json` has `fs:allow-read-text-file` at :66 and no `allow-read-file`; picker passes absolute `file.path`, readers prefix `vaultStore.path` at `canvas-image.service.ts:33-34` and `FileNode.svelte:40`). Impact is high if the owner puts images or notes on canvases; fixes are S and low risk. The owner deferred canvas except 004, so this is only a prompt to re-ask. 038 should come first (039 builds on image reading). 038's gate includes Rust tests (capability JSON), 039's includes `pnpm build`.
- **040 (kanban drag slot):** present (F: `handleItemDrop` indexes over all `[data-item-id]` including the dragged card, `KanbanView.svelte:385-405`; `handleLaneDrop` counts `[data-lane-id]`, which cards also carry, `KanbanCard.svelte:164`). Highest-frequency Kanban bug in this range, but blocked by 006, which is blocked by 004, and Kanban is deferred. If Kanban is un-deferred, take 040 first, then 049.

## Looks already fixed

None. Every central claim still matches HEAD (no `rename_history`, no `sentryEnvironment`, no `fs:allow-read-file`, `renameLane` still maps title only, `DataArray.sort` comparator unchanged, no `requestPromptIndexRefresh` in core/filesystem). Only the line numbers drifted a little in the kanban and canvas Issues.

## Notes per Issue

- **032:** `removeSensitiveEventData` (`sentry.service.ts:28-36`) still always returns an event. The Issue's own 2026-11-06 comment records that WKWebView ignores `//# sourceURL`, so the stack-frame rule never matches in the app and the host tag (wrap `onload` and every registered callback) is the only signal. That moves the size from S to M and asks for re-triage before it runs. Timers and floating promises inside a mod stay untagged. Low impact because the owner is the sole Sentry recipient (memory note) and mods are not in the daily list.
- **033:** the `:\s*//` skip is at `privacy.yml:69` and the dead ERE patterns (`(?:` at :43, `\x27` at :53) are still there. Scope is large (scanner, CSP/capability check script, two path filters, PRIVACY.md rewrite). Needs GNU grep from Homebrew in a clean shell. No runtime benefit for the app; skip unless the privacy gate matters before a release.
- **034:** no `sentryEnvironment` anywhere; `configure_sentry` has no environment; the JS call at `sentry.service.ts:64` still passes only `enabled, dsn, release`. `isValidSentryDsn` still accepts the bare `ingest.sentry.io` host (`url.hostname === domain`). `SentrySection.svelte:32` and :50 still carry the old copy. Touches both languages and the IPC contract.
- **035:** `error_monitoring.rs` has no custom panic extractor (the only panic mention is a comment at :62). The wiring step (turn off `default_integrations`, re-add the list) is the risky part and needs verification against the locked `sentry` version, so S/M is optimistic.
- **036:** `history.enabled` is read only at `app-lifecycle.service.ts:283`; `registerFileHistoryHook` and `saveSnapshotForFile` do not check it. Fix is one read in the observer. Cheap but low value, the setting is rarely toggled. Safe filler if a slot is free.
- **037:** `update_semantic_file` still spawns one `spawn_blocking` per call (`semantic.rs:1305-1310`). `semanticSearchEnabled` defaults to false (`settings.store.svelte.ts:108`), so this affects the owner only with semantic search on (I: the evidence logs come from a vault with it on). Owner chose the per-path pending map (option A); that is a new Rust state owner, hence L and high risk. Overlaps 107/106 in the same file; the priority notes already put them in one series.
- **044:** no `rename_history` or `UPDATE snapshots` in `src` or `src-tauri/src` (F). Correct fix needs a Rust command, contract entry, a path-change leg, a trash-restore leg with a time cutoff, and several test files. Medium impact, real size. Not recommended now; a smaller partial (rename/move only, skip Trash restore) is possible but is the same Rust and IPC surface.
- **046:** `deduplicateByTarget` (`outgoing-links.service.ts:25-34`) still keys on target alone and nothing resolves against `fsStore.fileTree` (F). Frontend only, but blocked by 014, which is not in the proposed queue. Low-med because the symptom is a red icon on image embeds, with no data effect.
- **048:** `restoreItem` still adds the card nowhere when `toLaneId` is unknown (`kanban.logic.ts:571-579`), but the only caller passes an existing lane (per the audit). Part 1 needs a raw `---` plus a lane titled Archive. Corner case.
- **049:** `renameLane` still changes only the title (`kanban.logic.ts:492-499`). Cheap pure-logic fix, S, low risk, but Kanban is deferred. The `Blocked by 048` is an ordering preference (same file), not a data dependency (I).

## Not checked

No test or app was run (read-only sweep). Impact ratings for 037, 044 and 045 depend on how often the owner uses semantic search, File History and the Search panel; those frequencies are inference, not measured.
