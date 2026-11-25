# Deep-dive evidence

Baseline: `2eaff3d00588dd5a84c4b2cd7c7d05dee1fb5675`. The twenty assignments below completed before publication. No application source was changed.

Source anchors are audit-time navigation aids, not implementation mandates. Use `codemap/INDEX.md` and current code when implementing. Ticket bodies intentionally describe outcomes rather than freezing source structure.

Probe artifacts live under `/private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/`. Most configs refer to the original checkout and its dependencies. Run from that checkout at the recorded baseline, or recreate tests in the implementation worktree. Temporary artifacts are not guaranteed durable across machine cleanup.

## Save boundaries

**Assignment 02; tickets 01/02.** Eight characterization probes passed using actual editor, exit, vault, stores, hooks, and debounce with deferred Tauri filesystem I/O. Observed:

```text
CLEAN_CLOSE disk=B tabs=0 prompts=0
FINAL_SNAPSHOT failed=[] disk=B content=C dirty=true
PREPARE_EXIT authorized=true disk=B content=C
LATE_BARRIER_EDIT authorized=true disk=A content=C writes=0
```

The dirty-close and write-failure controls behaved correctly. Switching selected the next vault with C dirty, but the later initialization retry can rescue it; do not equate that intermediate state with inevitable loss.

- `src/lib/core/editor/editor.service.ts:207–253,319–393`
- `src/lib/core/vault/exit.service.ts:15–22`
- `src/lib/app/lifecycle/app-lifecycle.service.ts:182–200`
- Probe: `pnpm exec vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep02.config.mjs`

Not a native shutdown or full initialization execution.

## Buffered views

**Assignment 03; tickets 03/04/05.** Mounted production `EditorView`, real stores/services, and real keyboard bindings: **7 desired-preservation failures, 4 passing controls**. Canvas exit/switch/reload lost pending text; Kanban card/lane keyboard switch/close lost drafts. Close-tab Canvas flush and Escape policies passed.

- `CanvasInner.svelte:98–132,225–265` under `src/lib/features/canvas/`
- `KanbanCard.svelte:72–140,225–231` and `KanbanLane.svelte:117–179,291–296` under `src/lib/plugins/kanban/`
- `src/lib/app/EditorView.svelte:80–85`
- Probe: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep03.config.ts`

A separate earlier browser probe found zero blur events on focused-field removal in WebKit and one in Chromium. That is not a native app regression test. New-card submission is intentionally outside existing-card draft scope.

## Task settlement

**Assignment 06; ticket 06.** Real task/editor/Todoist services, stores, save scheduling and note-change owner; only external boundaries mocked. **7 failing regression assertions, 3 passing controls.** Covered status, due, priority, opening during closed-note sync, background tabs, autosave overlap, and path reuse.

```text
disk: unchecked task + body + typed during IPC
tab: checked task + body
savedContent: checked task + body
```

The overlap also failed with the real two-second autosave debounce. Rename probe used the actual tab re-key operation, not physical rename.

- `src/lib/core/filesystem/task-write.service.ts:24–37`
- `src/lib/features/tasks/tasks.service.ts:283–525`
- `src/lib/features/todoist-sync/closed-note-writer.service.ts:35–62`
- Probe: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep06.config.mjs`

Native Rust ordering and mounted undo were not exercised.

## Backlink rewrites

**Assignment 08; ticket 07.** Independent source tracing upheld snapshot overwrite and save-queue bypass. Earlier production-function deferred-I/O reproduction lost typed text. This deep dive did not rerun that new race; the existing focused suite passed 21 tests.

- `src/lib/core/filesystem/link-updater.service.ts:46–79`
- `src/lib/core/editor/editor.service.ts:120–140,207–245`
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:175–247,629–653`

Required regression schedules: clean read/type; dirty write/type; background source; both save/write orders; concurrent target renames sharing one source. Ordinary watcher reread guards are now stronger and do not constitute the same outstanding bug.

## Trash boundary

**Assignment 09; ticket 08.** Actual path-change/editor/Trash services, real stores/logic; host APIs controlled. **6 desired-safety failures, 3 passing controls.**

Lost latest file edits, earlier folder-child edits, initially clean child edits, pending Canvas publication, and undo-clean state behind an older save. A controlled completion after Trash rename recreated the source; native frequency is not claimed.

- `src/lib/core/filesystem/path-change.service.ts:65–71,157–180`
- `src/lib/core/editor/editor.service.ts:220–253,463–475`
- `src/lib/core/trash/trash.service.ts:49–177`
- Probe: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep09/vitest.config.mts`

Stable dirty save, child-save failure, and rename-failure preservation were passing controls. Canvas flusher boundary was real, but that particular probe did not mount Canvas.

## History restoration

**Assignment 05; tickets 09/10.** **13 characterization tests passed** with actual services/stores, CodeMirror undo, and controlled IPC/filesystem.

Confirmed wrong-target write `["/vault/B.md","A historical"]`, closed-target redirection, no-view no-op, reopened-session corruption, late history-load selection mismatch, stale preview, and unsuccessful save closing history. Closing history and leaving it closed safely canceled; a reopened session reintroduced exposure.

- `src/lib/features/file-history/file-history.service.ts:17–100`
- `src/lib/features/file-history/FileHistoryDialog.svelte:40–50`
- `src/lib/core/editor/editor.service.ts:200–252`
- Probe: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/history05-T2rcxK/vitest.config.mts --reporter verbose`

The vault probe applied relevant real resets, not full SQLite/lifecycle switching. Mounted board restoration remains implementation verification. Predecessor decisions settle guard-first and later closed-target restoration; no new closed-target policy was invented.

## Properties and types

**Assignment 10; tickets 11/12.** Real Properties component, stores/services, CodeMirror and meta-bind:

```text
editor b=true; panel b=false; next panel edit restores b=false
editor b=newb; panel b=oldb; final save payload contains b=oldb
```

Production TS and Rust probes confirmed unsafe scalar output and semantic matching gaps. `Research #2` becomes `Research`; boolean/list-looking values cease to be string membership. An apostrophe can invalidate frontend YAML while Rust fallback still recognizes the name: do not claim all readers necessarily lose membership.

- `src/lib/features/properties/properties.service.ts:23–106`
- `src/lib/features/properties/PropertiesView.svelte:103–118`
- `src/lib/features/type-definitions/type-definitions.logic.ts:210–240`
- `src/lib/features/type-definitions/type-definitions.service.ts:54–94,221–245`
- `src-tauri/src/vault/parsing.rs:103–165`
- Artifacts: `deep10/` under the temporary evidence root.

No-op properties, creation orchestration, and partial-write reporting were traced against accepted predecessors; not every acceptance was newly executed. Keep the existing keep-rename/report-failures/no-rollback decision.

## Composer

**Assignment 11; ticket 13.** **12 characterization probes passed**, mounting the real Svelte page and CodeMirror with IPC controlled.

```text
before old flash: text="buy milk", draft="buy milk", undo=1
after old flash: text="milk", draft="milk", undo=0
```

Also confirmed late success after Discard, overlapping success statuses, duplicate prefix consumption, and saved-body resurrection in persistent draft. Error/timeout/rejection controls retained new text.

- `src/routes/composer/+page.svelte:83–206`
- `src/lib/plugins/quick-capture/composer-editor.ts:143–151`
- Probe: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep-dive11/probe.config.mts --silent=false`

ADR-0028 deliberately permits cleanup of inherited text across shows; ignoring every old result would violate it. Native delivery and durable disk capture were not exercised.

## Todoist freeze

**Assignment 19; ticket 14.** Actual completion/field planners via Vite:

```text
frozen: patches=0, withholdToken=false
unfrozen after checkpoint advance: patches=0, commands=0
unfrozen with remote replay: patches=["closed"]
```

Real service tracing shows checkpoint advancement; repository fake-server semantics omit completed tasks from the full snapshot and consumed changes from subsequent increments.

- `src/lib/features/todoist-sync/completion.logic.ts:159–164,232–245`
- `src/lib/features/todoist-sync/fields.logic.ts:163–174`
- `src/lib/features/todoist-sync/sync-now.service.ts:312–322,562–575`

No full consecutive production sync or live Todoist run. This is persistent local divergence, not remote-task destruction. Reproduce end-to-end before implementation.

## Clipboard

**Assignment 15; ticket 15.** Actual component Paste handler with deferred clipboard read and a real shared CodeMirror view/state swap:

```json
{"noteA":"Note A","noteB":"clipboard from A","sameView":true}
```

- `src/lib/core/markdown-editor/MarkdownEditor.svelte:354–370,474–518`
- Probe: `node /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/paste15-probe.cjs`

DOM paste probes also confirmed code-context TSV/HTML conversion and dropped secondary selections, but that parked lower-priority work is not migrated. Full tab/UI and native clipboard timing remain unverified for the new wrong-target case.

## External writers

**Assignment 07; tickets 16/17.** Task read/transform/replace and autosave-before-watcher mechanisms upheld. Standalone Rust probe extracted unchanged production atomic-write helpers and demonstrated:

```text
checked A; independent B completed; real write_atomic installed A-prime; B absent
```

Thus a second check is not atomic conditional replacement. Earlier ignored production-task demonstrator observed 153 losses in 200 induced races; its discarded errors and probabilistic scheduling prohibit treating that as a real-world rate or regression gate.

- `src-tauri/src/commands/vault.rs:680–704,812–840,913–931`
- `src-tauri/src/utils/fs.rs:16–35`
- `src/lib/core/editor/editor.service.ts:236–245,503–557`
- `src/lib/features/file-history/file-history.service.ts:191–203`

Watcher 500 ms and frontend 300 ms are quiet-window delays, not a maximum reconciliation time. History after-save receives new bytes. No deterministic complete Rust-command or history-database integration test was added in this audit.

## History baseline

**Retained backlog scope; ticket 18.** Read the current save/history chain and predecessor acceptance. Ordinary after-save snapshots receive the new content; existing open-item 016 additionally owns pre-save baseline, destructive deep-link overwrite recovery, and an explicitly approved retention change.

- `src/lib/features/file-history/file-history.service.ts:191–203`
- `src-tauri/src/commands/history.rs:61–87`
- [Original acceptance and owner decision](../open-itens/issues/016-file-history-keeps-snapshot-pre-save-bytes.md)

This scope was not independently reproduced anew by the twenty-agent round. Its historical failing test and real-storage retention checks must be re-established at implementation time.

## No clobber

**Assignment 04; ticket 19.** Real macOS temporary filesystem:

```text
ordinary: both sources absent, destination SECOND
exclusive: second operation EEXIST, second source intact, destination FIRST
```

Verified `renamex_np` with `RENAME_EXCL`, including a late-created destination and an existing empty directory. Installed plugin 2.7.1 exposes ordinary replacing rename, not a no-replace flag.

- `src/lib/core/filesystem/fs.service.ts:271–323`
- `src/lib/core/filesystem/path-change.service.ts:157–257`
- `src/lib/features/auto-organize/auto-organize.service.ts:206–242,323–415`
- [Locked plugin source](https://crates.io/api/v1/crates/tauri-plugin-fs/2.7.1/download)

Not tested on other OS/filesystems or a second volume. The race was explicitly accepted in predecessor 233; ticket remains triage.

## Hidden frontmatter

**Assignment 01; ticket 20.** Actual production extensions, mode effects, stores and CodeMirror commands: four behavioral probes plus a separate history/drop probe passed. Mode caret 1 → preview → input changed the opening fence to `-X--`; search and pointer selections also enabled hidden changes. Keyboard document-start and selection-only undo controls protected the boundary.

- `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:89–194`
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:657–663`
- Probe: `pnpm exec vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/frontmatter-01.XZRXkV/vitest.config.mjs --silent=false --reporter=verbose`

Pointer geometry was stubbed; no native IME. Crucially, resolved 002 explicitly accepts these exclusions. The final investigator withdrew the claim that they violate the existing delivered requirement.

## Vault settings

**Assignment 12; ticket 21.** Six characterization/control probes with real loader, store, persistence, initialization, Sentry queue and URL dispatch. Mounted harness copied production listener/init effects and controlled peripheral services:

```text
stale-load: current B; B writes [24,18]
stale-configure: current B; A writes [18,24]
stale-read-error: current B; B writes [24,19(default)]
protected-control: stale store value; B writes []
```

- `src/lib/core/settings/settings.service.ts:44–79,217–232`
- `src/lib/core/settings/settings-persistence.svelte.ts:55–100`
- `src/lib/app/lifecycle/app-lifecycle.service.ts:184–225`
- Probe preparation: `node /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep12/prepare.mjs`
- Run: `pnpm vitest run --config /private/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/opencode/deep12/vitest.config.ts --reporter verbose`

Malformed-backup timing, physical writes and complete native app not exercised.

## Cross-vault actions

**Assignment 12; ticket 22.** Same production-orchestration probes confirmed an action dropped by teardown and a failed B initialization followed by dispatch of B's retained action against C.

- `src/lib/features/deep-link/deep-link.service.ts:153–172,353–364`
- `src/lib/app/lifecycle/app-lifecycle.service.ts:248–255,528,679`

The action fixture records dispatch, not a daily-note disk write. Existing archived 26 already describes this exact family; reconsideration remains triage.

## Markdown images

**Assignment 16; tickets 23/24.** Actual completion/production-host probes confirmed extension stripping and application-origin relative-image loading. No new root-resolution policy is required by the accepted predecessors.

- `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:71–79`
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:172–190`
- `src/lib/app/editor-host.ts:123–140`
- `src-tauri/tauri.conf.json:28–45`

Current host lacks source-note-folder context; accepted relative-image scope is vault-relative using the existing host. Native asset loading remains unverified. The former default-vault scope blocker is stale.

## Other completed assignments

| Assignment | Evidence and final disposition |
| --- | --- |
| 13, bulk search | Metadata-only >10-path fallback and 15-second path-marker suppression source-confirmed; 39 existing targeted tests passed without end-to-end search assertions. Queued payloads are accumulated/serialized, refuting the proposed debounce-loss concern. Existing lower-priority owner retained. |
| 14, search build ownership | Real SQLite/FTS5 scheduling replay reproduced cross-vault index contamination and cleanup deletion, not production Rust interleaving. Recoverable derived data and prior wontfix scope; excluded from severe implementation. |
| 17, link identity | Actual TS and extracted Rust resolver probes reproduced root/nested ambiguity. Extensionless folder ignoring and move exclusions are documented policy; root syntax was explicitly declined. No silent reopening. |
| 18, panel cache | Five mounted-component real-store characterization tests confirmed empty/wrong rows and stale reset responses. Existing broad shell-sidebars ticket retained; no byte loss. Artifact config: temporary `dive18/vitest.config.mts`. |
| 19, exclusions | Also executed real filter/parser probes; narrowed Date-string semantics and excluded parsing-only/intentional undo behavior. Todoist follow-up retained separately. |
| 20, backlog reconciliation | Read current tickets and ledgers, not just research claims. Distinguished resolved predecessors, migrated wontfix entries, explicit owner decisions, and genuinely new scope. No runtime claim. |

All twenty final reports were reconciled with these dispositions. Counts above are per-probe results, not a summed test total; repeated existing suites are not counted as additional coverage.
