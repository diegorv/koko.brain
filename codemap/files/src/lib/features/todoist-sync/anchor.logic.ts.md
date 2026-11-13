# file card src/lib/features/todoist-sync/anchor.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/anchor.logic.ts ' codemap/files
file src/lib/features/todoist-sync/anchor.logic.ts logic L110 module src/lib/features/todoist-sync in8 t1 | `🆔 td-…` anchors that tie a task line to a Todoist task, and the path scope the sync reads lines from.
## imported-by
imp src/lib/features/todoist-sync/create.logic.ts:10 -> src/lib/features/todoist-sync/anchor.logic.ts anchorToken,hasForeignId,idValues,readAnchor
imp src/lib/features/todoist-sync/projects.logic.ts:15 -> src/lib/features/todoist-sync/anchor.logic.ts isInSyncScope
imp src/lib/features/todoist-sync/pull.logic.ts:11 -> src/lib/features/todoist-sync/anchor.logic.ts anchorForTodoistId,anchorToken,readAnchor
imp src/lib/features/todoist-sync/sections.logic.ts:11 -> src/lib/features/todoist-sync/anchor.logic.ts readAnchor
imp src/lib/features/todoist-sync/sync-now.service.ts:27 -> src/lib/features/todoist-sync/anchor.logic.ts generateAnchor,idValues
imp src/lib/features/todoist-sync/sync-scheduler.logic.ts:7 -> src/lib/features/todoist-sync/anchor.logic.ts readAnchor
imp src/lib/features/todoist-sync/task-line-edits.logic.ts:10 -> src/lib/features/todoist-sync/anchor.logic.ts idValues
imp src/lib/features/todoist-sync/vault-scan.service.ts:4 -> src/lib/features/todoist-sync/anchor.logic.ts buildAnchorOccurrences,isInSyncScope
## reach
in2 src/lib/features/todoist-sync/anchor.logic.ts 9 files in 1 modules: src/lib/features/todoist-sync(9)
out2 src/lib/features/todoist-sync/anchor.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/todoist-sync/anchor.logic.test.ts imports src/lib/features/todoist-sync/anchor.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/anchor.logic.ts:8 const ANCHOR_PREFIX L1 | Prefix that marks a `🆔` value as a sync anchor rather than a user id.
sym src/lib/features/todoist-sync/anchor.logic.ts:11 const ID_EMOJI L1 | The id signifier emoji (Rust `ID_EMOJI`, `src-tauri/src/vault/parsing.rs`).
sym src/lib/features/todoist-sync/anchor.logic.ts:18 const ID_TOKEN_RE L1 | Every `🆔` token with its value, mirroring Rust `ID_RE` (`🆔`, optional U+FE0F, optional space, non-whitespace value).
sym src/lib/features/todoist-sync/anchor.logic.ts:24 fn idValues(line: string): string[] L3 | The values of every `🆔` token on the line, in order.
by src/lib/features/todoist-sync/anchor.logic.ts:idValues <- src/lib/features/todoist-sync/create.logic.ts:171 in planCreates call
by src/lib/features/todoist-sync/anchor.logic.ts:idValues <- src/lib/features/todoist-sync/sync-now.service.ts:1099 in writeBatches call
by src/lib/features/todoist-sync/anchor.logic.ts:idValues <- src/lib/features/todoist-sync/task-line-edits.logic.ts:77 in applyTaskLineEdits ref +5
sym src/lib/features/todoist-sync/anchor.logic.ts:33 fn readAnchor(line: string): string | null L7 | Reads the sync anchor (`td-…`, prefix included) from a line.
by src/lib/features/todoist-sync/anchor.logic.ts:readAnchor <- src/lib/features/todoist-sync/create.logic.ts:172 in planCreates call
by src/lib/features/todoist-sync/anchor.logic.ts:readAnchor <- src/lib/features/todoist-sync/pull.logic.ts:507 in planPull call
by src/lib/features/todoist-sync/anchor.logic.ts:readAnchor <- src/lib/features/todoist-sync/sections.logic.ts:77 in noteOutline call
by src/lib/features/todoist-sync/anchor.logic.ts:readAnchor <- src/lib/features/todoist-sync/sync-scheduler.logic.ts:18 in hasAnchoredLine call
sym src/lib/features/todoist-sync/anchor.logic.ts:46 fn hasForeignId(line: string): boolean L3 | Whether the line carries a user `🆔`: a value without the `td-` prefix, or a bare `td-` that is no anchor.
by src/lib/features/todoist-sync/anchor.logic.ts:hasForeignId <- src/lib/features/todoist-sync/create.logic.ts:172 in planCreates call
sym src/lib/features/todoist-sync/anchor.logic.ts:51 fn anchorForTodoistId(todoistId: string): string L3 | The anchor of a Todoist-born task: `td-<todoist id>`.
by src/lib/features/todoist-sync/anchor.logic.ts:anchorForTodoistId <- src/lib/features/todoist-sync/pull.logic.ts:369 in pulledTask call +2
sym src/lib/features/todoist-sync/anchor.logic.ts:56 fn anchorToken(anchor: string): string L3 | The line token for an anchor: `🆔 td-…`.
by src/lib/features/todoist-sync/anchor.logic.ts:anchorToken <- src/lib/features/todoist-sync/create.logic.ts:398 in addAnchor call
by src/lib/features/todoist-sync/anchor.logic.ts:anchorToken <- src/lib/features/todoist-sync/pull.logic.ts:369 in pulledTask call
sym src/lib/features/todoist-sync/anchor.logic.ts:64 fn generateAnchor(taken: ReadonlySet<string>, random: () => number = Math.random): string L9 | Generates a brain-born anchor, `td-` plus 8 random base36 chars, not present in `taken`.
by src/lib/features/todoist-sync/anchor.logic.ts:generateAnchor <- src/lib/features/todoist-sync/sync-now.service.ts:483 in cycle call
sym src/lib/features/todoist-sync/anchor.logic.ts:75 interface AnchoredLineSource L6 | A task line and the vault-relative path of the note it sits in.
sym src/lib/features/todoist-sync/anchor.logic.ts:87 fn buildAnchorOccurrences<T extends AnchoredLineSource>(lines: readonly T[]): Map<string, T[]> L11 | Maps each anchor to every line that carries it, in input order.
by src/lib/features/todoist-sync/anchor.logic.ts:buildAnchorOccurrences <- src/lib/features/todoist-sync/vault-scan.service.ts:111 in scanVault call
sym src/lib/features/todoist-sync/anchor.logic.ts:104 fn isInSyncScope(relPath: string, templatesFolder: string): boolean L7 | Whether a vault-relative path may hold synced lines (design rule 11).
by src/lib/features/todoist-sync/anchor.logic.ts:isInSyncScope <- src/lib/features/todoist-sync/projects.logic.ts:277 in planProjects call
by src/lib/features/todoist-sync/anchor.logic.ts:isInSyncScope <- src/lib/features/todoist-sync/vault-scan.service.ts:55 in scanVault call
## calls
call src/lib/features/todoist-sync/anchor.logic.ts:34 in readAnchor -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/anchor.logic.ts:47 in hasForeignId -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/anchor.logic.ts:90 in buildAnchorOccurrences -> src/lib/features/todoist-sync/anchor.logic.ts:readAnchor call
