# Analysis 14: testing-strategy

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The e2e task mock does not match Rust on the feature being redesigned (note-tag match at e2e/mocks/vault-index.ts:478-484 vs heading-scoped match at src-tauri/src/vault/parsing.rs:1701-1749, with metadata dropped at vault-index.ts:174-181), TasksView/TodoistPopover have no component tests, and Todoist is tested only above the SDK (todoist.service.test mocks todoist-client.js; the e2e plugin-http mock returns {} at e2e/mocks/tauri-http.ts:2-7), so the recommended strategy is a layered pyramid: pure rule logic with injected today, jsdom component tests, a plugin-http wire test, and a Rust/TS golden parity fixture for the e2e mock.

## Candidate issues

- Characterize current Tasks pipeline before redesign (TasksView.svelte.test.ts in jsdom, real stores, mock invoke only; shared tasks.fixture.ts; date x hideCompleted x sectionTag combos). No dependency; owner decision: no. Test-first = characterization passes on current code.
- Make e2e task backend faithful and guarded: heading-scoped getTasksInSection, parseTasks for priority/tags/recurrence/etc, non-binary toggle if UI changes; golden task-parse-parity.fixture.json asserted in Rust (vault_task_test.rs) and vitest (precedent: frontmatter-parity fixture). Files: e2e/mocks/vault-index.ts, src-tauri/tests/fixtures/. Gate: Both + e2e tasks-view spec. Depends on PRD field list; owner decision: no.
- Todoist wire-level test: mock only @tauri-apps/plugin-http fetch and plugin-fs, run real SDK 15.8.0 + tauri-fetch-adapter + todoist.service + real stores; assert URL/headers/body (content, priority, dueString vs dueDate, labels, project/section ids), 401/network failure with no store write, sync 404 handling, .kokobrain/todoist-sent.json content. New file todoist-wire.test.ts. No dependency; owner decision: no.
- Rules/filter/grouping engine table-driven logic tests (injected now/today, YYYY-MM-DD string compare, empty rules, unknown field, nested task parent kept, timezone). Depends on PRD rule model and issue 1; owner decision: yes.
- Rule/filter persistence tests (round trip, invalid file, rewrite without losing unrelated content; .view YAML rewrite drops comments per yaml-parser.ts:328-329). Depends on storage choice; owner decision: yes.
- DTO change guard if Task/TaskMetadata gains a field (e.g. heading): Rust parsing tests (fences, equal-level heading ends section), ipc_contracts_test optional-no-null assertion, commands/vault_test wire shape, bump INDEX_SCHEMA_VERSION (src-tauri/src/vault/index_cache.rs:18), regenerate src/lib/contracts/generated, update fromV2, check queryjs.logic.ts:125 KBTask mapping. Gate: Both. Owner decision: no (follows PRD).
- Replace hand-copied 13-field metadata mapping in fromV2 (tasks.service.ts:29-43) with pass-through plus a guard test whose wire fixture contains every TaskMetadata key. Optional; depends on issue 1.
- E2E specs for redesigned view: remove waitForTimeout (tasks-view.spec.ts:19,28,50,52), test real #to-list default without clearing, filter narrows rendered rows, toggle persists via window.__e2e.fs, Todoist controls absent without token. Add per-test fixture notes instead of editing shared e2e/fixtures/test-vault.ts. Depends on e2e mock fidelity issue; owner decision: no.
- Optional stubbed Todoist e2e: programmable tauri-http.ts via window.__e2e.http (precedent tauri-deep-link.ts, tauri-event.ts), one send happy path and one error path. Only if popover/sent-state UI is redesigned; owner decision: yes.
- Housekeeping, separate from redesign: fate of two #[ignore] TOCTOU tests in src-tauri/tests/vault_task_test.rs:30,90 (never run in CI) and its misleading header/personal plan path at :10. Owner decision: yes.

## Owner questions

- Is a jsdom component test of TasksView (real stores, invoke mocked) an acceptable UI gate, with e2e limited to a few happy paths? Recommended default: yes.
- Todoist verification: wire-level vitest test (mock only plugin-http) plus a manual smoke checklist with a throwaway token in the PRD acceptance section, no Todoist e2e unless the popover/sent UI is redesigned? Recommended default: yes.
- Extend the e2e mock parser only for fields the new UI shows, guarded by a golden Rust/TS parity fixture? Recommended default: yes.
- Where do user rules live (.view YAML, settings, dedicated file)? It decides the persistence test plan and whether YAML comment loss on rewrite matters. Recommended default: .view machinery only if tasks become a view type, otherwise settings.
- Should 'completed' keep covering every non-todo status ([-], [/], [?], [>], [!]), which also hides them by default today (tasks.logic.ts:40, task.rs:25)? Recommended default: only done and cancelled count as completed; others stay visible. Tests must change either way.
- Keep, run on demand, or delete the two ignored TOCTOU tests in vault_task_test.rs? Recommended default: leave them and track as a separate housekeeping ticket.
- Do due-today/overdue rules use the local calendar date? Recommended default: yes, injected today as YYYY-MM-DD string compare, tested with the timezone fixture.
- When sent-task identity (filePath:text, todoist.store.svelte.ts:24-28) changes, must existing .kokobrain/todoist-sent.json entries keep working? Recommended default: yes, read-compatible with a legacy-file test.
- Cannot be automated, so accept manual verification for: real Todoist API and Tauri http capability scope for api.todoist.com, real watcher throttle timing (indexing rule 12; e2e emits index events synchronously), large-vault disk-scan cost (report only, not gate), and visual quality judged against the design reference. Recommended default: accept, listed in the PRD acceptance section.

## Agent note on file

NOT WRITTEN: the Write tool refused /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-14-testing-strategy.md ("Subagents should return findings as text, not write report files"). The full analysis is only in this output; the parent must persist it.
