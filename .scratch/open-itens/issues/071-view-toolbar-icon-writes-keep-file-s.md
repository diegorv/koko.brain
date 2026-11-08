# 071: .view toolbar and icon writes keep the file's YAML comments

**Origin:** `audit-2026-11-05` Issue 97, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/32-app-json-corrupt-overwrite.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). What remains is section 3 only: sections 1-2 duplicate audit-2026-11-04 Issue 14, and section 4 is fixed. Every filter or sort change on a commented .view deletes the comments from disk. Views are daily and agents now write .view files, so this stays in content at low likelihood.

**Audit check at `5f8003d67`:** partially_fixed (content, low). (1) auto-move-rules.json and (2) todoist-sent.json overwrite: still present (auto-move.service.ts:61-64, :70-88; todoist.service.ts:103-131), and covered by the newer ready-for-agent Issue 14 (.scratch/archived/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md). (3) .view comments dropped on a real change: still present, since updateCollectionYaml ends in stringifyYaml (src/lib/features/collection/yaml-parser.ts:261, siblings :355, :378, :406, :429) and updateViewIconYaml / updateViewColorsYaml too (type-sidebar.logic.ts:542, :570); a no-op guard now returns the input unchanged when nothing differs (:521-531, :564-566). (4) Toolbar write reverted under a dirty tab and the history gap: fixed, because every .view writer goes through rewriteViewFile (src/lib/features/type-definitions/type-definitions.service.ts:350-440), which takes the dirty tab as base, syncs the tab, saves through saveFileByPath or writes with create:false, then markRecentSave and applyNoteChange.

**Stale in the text below:** Sections 1-2 duplicate Issue 14; drop them here or mark them superseded. Section 4 is fixed. updateViewQuery and type-definitions.service.ts:284-311 no longer exist; the comment-loss sites are yaml-parser.ts:175-261 and type-sidebar.logic.ts:520-570.

**Plan review:** The title still promises 'a toolbar write is not reverted by a dirty tab's autosave'. At HEAD that part is fixed: every .view writer goes through rewriteViewFile (type-definitions.service.ts:350-440, commit 3df680423), and the verdict marks it (4) fixed. Only the comment loss remains (yaml-parser.ts:175-261, type-sidebar.logic.ts:520-570).

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) h08-app-json (raw reports in .scratch/archived/file-io-audit/deep/raw/), verified at c4bfee07

## Unparseable auto-move-rules.json is overwritten by the next Settings save

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: vault-lifecycle-8

**How a user hits it.** Needs the rules file to be unparseable: a hand-edit typo, or a torn write after a crash mid-write (tauri-plugin-fs write_text_file truncates and writes in place, no temp file or fsync). Then any Settings edit (add, remove, reorder, or debounced rule text) saves the empty fallback over it. Rare but plausible.

**Recoverable from.** none from the app; original bytes are overwritten unless the user has their own copy

**Root cause.** src/lib/features/auto-move/auto-move.service.ts:60-63 (catch sets DEFAULT_CONFIG via setConfig, no flag) and :69-87 (saveAutoMoveConfig writes the store without checking the load succeeded). Trigger: AutoMoveSection.svelte:33-39, 57-68, 77.

**Evidence.** Repro src/tests/repro/h08-app-json/auto-move-corrupt-overwrite.test.ts FAILS: after loading a truncated rules file and one save, writeTextFile hit .kokobrain/auto-move-rules.json and the original bytes were not kept elsewhere. The deep-link timer half of the claim is folded into refutation.

**Limits found while trying to refute.** The timer half of vault-lifecycle-8 is mostly refuted: the 'A rules into B file' path needs the 500 ms timer to fire between vaultStore.open (vault.service.ts:21) and teardownVault, a microtask-to-ms window. The residual 'empty config into B' path (timer fires during initializeVault steps 1-3 before loadAutoMoveConfig at app-lifecycle.service.ts:289, after resetAutoMove at :641) is real but needs a deep-link switch within ~500 ms of typing with Settings open: P3, config only. A's last sub-500 ms edit is lost on switch: P3.

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h08-app-json/auto-move-corrupt-overwrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected false to be true (configWrites.length === 0 || originalKeptElsewhere)
```

**Fix sketch.** Track a load-failed flag in the store; refuse saveAutoMoveConfig while set (surface a toast), or copy the unreadable file aside before the first write.

## Unparseable todoist-sent.json is overwritten by the next send or sync

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: feature-writers-12

**How a user hits it.** Needs an unparseable sent-tasks file: a torn in-place write after a crash (plugin write is truncate plus write_all, no rename, no sync), or a hand edit. Then the next sendTaskToTodoist or syncTodoistTasks rewrites it with only the store contents. Rare.

**Recoverable from.** none from the app; the Todoist tasks still exist but the filePath to task-id links are overwritten, so re-sending creates duplicate Todoist tasks

**Root cause.** src/lib/features/tasks/todoist.service.ts:114-117 (loadSentTasks returns [] on parse error) feeding initTodoist :238-244 and saveSentTasks :124-131 via sendTaskToTodoist :215-224 and syncTodoistTasks :281.

**Evidence.** Repro src/tests/repro/h08-app-json/todoist-corrupt-overwrite.test.ts FAILS: after initTodoist on a truncated file and one sendTaskToTodoist, writeTextFile wrote /test-vault/.kokobrain/todoist-sent.json and the original bytes were not kept elsewhere. Third-party: raw.githubusercontent.com tauri-apps/plugins-workspace v2 plugins/fs/src/commands.rs shows write_file_inner opens the target with truncate and write_all in place, no rename, no sync_all.

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h08-app-json/todoist-corrupt-overwrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected false to be true (sentWrites.length === 0 || originalKeptElsewhere)
```

**Fix sketch.** Same as the auto-move case: do not write over a file that failed to parse (flag the load failure and block saves, or copy the file aside first).

## .view toolbar and icon writes drop YAML comments; a toolbar write under a dirty open tab is reverted by autosave

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: fidelity-12

**How a user hits it.** Comments: every RailNoteList toolbar change (filter, sort) and every TypesNavigator icon/color change on a .view that has comments removes them. Common for any user who comments a .view. Revert: only while the same .view is dirty in source mode during the 2 s autosave window; narrow.

**Recoverable from.** Comments are not recoverable from file history: updateViewQuery bypasses the editor save observers, so no snapshot is taken for that write. The reverted toolbar change must be redone by hand.

**Root cause.** src/lib/features/collection/yaml-parser.ts:145-158 and :32 (updateCollectionYaml parse then stringify, comments discarded); src/lib/features/type-definitions/type-sidebar.logic.ts:356-380 (updateViewIconYaml, same pattern). Writers: type-definitions.service.ts:284-311 (no tab or history sync), RailNoteList.svelte:188-201, TypesNavigator.svelte:134. Revert: src/lib/core/editor/editor.service.ts:375-392 skips dirty tabs, so the editor copy is autosaved over the toolbar change.

**Evidence.** Repro src/tests/repro/h08-app-json/yaml-comments.test.ts FAILS: output 'views:\n  - type: table\n    name: All\n    sort: ...' contains neither '# Project tracker...' nor '# main table'. Confirmed by grep that type-definitions.service.ts:305-311 calls writeTextFile with no notifyAfterSave/applyNoteChange. The dirty-tab revert is traced, not run.

**Limits found while trying to refute.** Priority is P2 not P1: this is a .view config file, not note body, and the lost bytes are comments, not content. The revert needs a dirty tab during the autosave window.

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h08-app-json/yaml-comments.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected 'views:\n  - type: table\n    name: Al...' to contain '# Project tracker, do not reorder the...'
```

**Fix sketch.** Use a comment-preserving YAML round-trip (parseDocument and edit nodes, or the yaml library's Document API) for updateCollectionYaml and updateViewIconYaml. For the revert, route toolbar writes through the open-tab sync (update the tab's content and savedContent, or reload a clean tab) so autosave cannot write stale YAML back.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/features/collection/yaml-parser.test.ts (updateCollectionYaml describe): a .view text such as 'views:\n  - type: table\n    name: All\n    sort: ...' with a leading comment '# Project tracker, do not reorder these' and an inline comment '# main table', run through updateCollectionYaml with a real filter or sort change, returns text that still contains both comments and the new filter or sort. It fails today (stringifyYaml drops the comments).
- [ ] The sibling writers in yaml-parser.ts that end in stringifyYaml (addView, removeView, renameView, setViewType, updateViewEditYaml) keep the comments of the parts they do not touch; one test each, in the matching describe blocks of yaml-parser.test.ts.
- [ ] updateViewIconYaml and updateViewColorsYaml keep comments when they change the icon or colors, tested in src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts.
- [ ] The no-op guard stays: when nothing differs the input is returned unchanged, byte for byte (existing cases stay green). Existing output expectations for key order and quoting in yaml-parser.test.ts and type-sidebar.logic.test.ts stay green, or any deliberate change is named in the commit message.
- [ ] A rail toolbar change through updateViewToolbarKey (type-definitions.service.ts:518, which runs applyToolbarEdit inside rewriteViewFile), tested in src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts with the plugin-fs disk mock: a filter or sort change on a commented .view writes a file that still contains its comments.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/32-app-json-corrupt-overwrite.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
