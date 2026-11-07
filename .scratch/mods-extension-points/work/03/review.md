VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first. With zero items the menus render today's labels, with no stray separator (`NoteRowMenu.test.ts`, `FilesNavigator.menu.test.ts` stay green). — The versioned discovery record at `work/03/discovery.md:27-31` records the red stages; the implementation commit also records the host/registry red stage. Independently reran both named suites: unchanged zero-item labels and separator assertions pass (`NoteRowMenu.test.ts:253-294`, `FilesNavigator.menu.test.ts:197-224`). Historical test execution order is recorded evidence, not an independently replayed result.
- [met] Real registry: a `.canvas` row hides a `markdown` item; the root gives `''`; a relative path reaches `run.target`. — Passing real-store tests cover markdown/all filtering and inset entries (`NoteRowMenu.test.ts:165-182`), root/folder paths including a trailing slash (`FilesNavigator.menu.test.ts:178-195`), target capture across input (`mods-host.service.test.ts:427-451`), and late registration/disposal through the mounted list (`RailNoteList.test.ts:167-181`). The browser test at `vault-mods.spec.ts:202-218` verifies the target in the written note.
- [met] Host: an unknown id throws; one item after reload; none after unload. — Independently passed `mods-host.service.test.ts:474-517`: real host reload replaces the callback without duplicating the item; unload and failed onload leave no items; an unknown action throws. `rail-registry.store.test.ts:128-144` also passes identity replacement, repeated disposal, and reset assertions.
- [met] E2E: right-click a row, pick the item, assert the written note. Another covers `ctx.ui.prompt` opened from an item, for focus. — Ran `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: all 14 tests passed. The cases at lines 202-243 assert rendered content and exact filesystem bytes, then keyboard focus, typing, Enter submission, and the resulting annotation note.
- [met] `help/documentation/28-mods.md` documents `menu` and `run.target`. — Lines 198-271 document placement syntax, markdown default, all-files opt-in, folder/root targets, disposal/replacement, absent targets on rail/palette runs, capture through input, and shared menu/palette busy behavior. Checked against the implementation and passing contract/host tests.

## Findings

None.

## Standards

No actionable standards violations found. The registry uses raw reactive state and identity-based cleanup; the getter and reset have real-store tests. UI consumers stay in features and do not import plugins. The architecture test passes, with no changes to its baseline or composition-root exceptions. New behavior has corresponding tests, and the diff does not modify save/index/watch orchestration.

## Specification

Reviewed `git diff main...HEAD` through `cb220c54b700c530ea4ecaf1b6028c0216092f00`, against the Issue, plan EP-03 and section 12, the mods PRD, and ADR-0036. No missing behavior or scope creep found. Placements reference existing actions rather than introducing another execution model. Menu rendering reads data only. Target paths are converted at the menu boundary, the root is handled explicitly, and the host copies the target before input. Rail and palette runs omit the property. Menu runs reuse the existing lazy execution path and palette busy key. Action disposal and unload own placement cleanup.

## Independent checks

All commands ran in `/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/issue-03-right-click-menus`; verdicts use each command's exit status, not the build report.

- `pnpm check`: exit 0; 226 files, zero errors and warnings.
- First targeted Vitest invocation: exit 0; 39 files passed, 1,077 tests passed and 53 skipped conditional variants. Selected files referencing `mods-host`, `rail-registry`, `RailNoteList`, `FilesNavigator`, `NoteRowMenu`, or `mod-api.v1`, plus the architecture test.
- Rail-interface consumer invocation: exit 0; 16 files passed, 696 tests passed. Selected test files referencing `rail-shell.types`. This overlaps the first invocation; counts are not summed.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: exit 0; 14 Chromium tests passed.
- `git diff --check`: exit 0.

### First targeted invocation: exact test files

```text
src/tests/help/mods-example.test.ts
src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts
src/tests/lib/plugins/mods/ModsStatusList.test.ts
src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts
src/tests/lib/app/commands.test.ts
src/tests/lib/app/meta-bind-open-view.test.ts
src/tests/lib/app/LabsSection.test.ts
src/tests/lib/plugins/mods/mod-api-contract.test.ts
src/tests/lib/plugins/kanban/kanban.service.test.ts
src/tests/lib/plugins/mods/ModActionPicker.test.ts
src/tests/lib/plugins/mods/mod-app.service.test.ts
src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts
src/tests/lib/plugins/mods/mod-vault.service.test.ts
src/tests/lib/app/commands.new-commands.test.ts
src/tests/lib/features/rail-shell/rail-registry.store.test.ts
src/tests/lib/plugins/mods/mod-note-saved.test.ts
src/tests/lib/plugins/mods/mod-rail-icon.test.ts
src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts
src/tests/lib/plugins/mods/mod-vault-paths.test.ts
src/tests/lib/plugins/mods/ModDialogHost.test.ts
src/tests/lib/plugins/mods/mods-host.service.test.ts
src/tests/lib/features/rail-shell/RailNoteList.view.test.ts
src/tests/lib/features/rail-shell/RailNoteList.test.ts
src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts
src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts
src/tests/lib/features/rail-shell/FilesNavigator.test.ts
src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts
src/tests/lib/features/rail-shell/Rail.test.ts
src/tests/lib/plugins/mods/mod-watch.test.ts
src/tests/lib/features/rail-shell/LayoutSection.test.ts
src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts
src/tests/lib/plugins/calendar/calendar-rail.service.test.ts
src/tests/lib/plugins/mods/mod-theme.test.ts
src/tests/lib/features/rail-shell/files-navigator.service.test.ts
src/tests/lib/features/rail-shell/RailNoteList.search.test.ts
src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts
src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts
src/tests/lib/features/note-list/NoteRowMenu.test.ts
src/tests/lib/architecture/layer-rules.test.ts
```

### Rail-interface consumer invocation: exact test files

```text
src/tests/lib/app/rail-navigation.test.ts
src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts
src/tests/lib/features/rail-shell/rail-registry.store.test.ts
src/tests/lib/features/rail-shell/RailNoteList.search.test.ts
src/tests/lib/features/rail-shell/lens.logic.test.ts
src/tests/lib/features/rail-shell/TypesNavigator.test.ts
src/tests/lib/features/rail-shell/list-properties.logic.test.ts
src/tests/lib/plugins/calendar/day-lens.logic.test.ts
src/tests/lib/features/rail-shell/list-search.logic.test.ts
src/tests/lib/features/rail-shell/list-sort-compare.logic.test.ts
src/tests/lib/features/rail-shell/types-navigator.service.test.ts
src/tests/lib/features/rail-shell/view-lens.service.test.ts
src/tests/lib/features/rail-shell/new-note.service.test.ts
src/tests/lib/features/rail-shell/list-prefs.logic.test.ts
src/tests/lib/features/rail-shell/rail-items.logic.test.ts
src/tests/lib/features/rail-shell/FilesNavigator.test.ts
```

## Verification limits

The full suite is deliver's gate and was not run here. No production build or native Tauri/WKWebView verification was performed; Chromium focus coverage does not establish native webview behavior. Historical red-stage execution order was not replayed.
