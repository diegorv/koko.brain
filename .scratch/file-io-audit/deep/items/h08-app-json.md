# Deep-dive group h08-app-json

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## feature-writers-12: Todoist sent-task history is overwritten with a partial list after a failed read or parse
- claimed severity: minor
- anchor: src/lib/features/tasks/todoist.service.ts:114
- scenario: todoist-sent.json is torn by an earlier interrupted in-place write. loadSentTasks returns [], and the next send rewrites the file with only the new entry. Older records are lost, and those tasks can be sent to Todoist again.
- evidence given: todoist.service.ts:103-118 catch returns []; initTodoist :238-244 stores it; sendTaskToTodoist :223-224 and sync :288 -> saveSentTasks :123-131 (truncating writeTextFile, FETCHED).

## vault-lifecycle-8: An unreadable auto-move-rules.json loads empty and the next Settings edit overwrites all rules; the debounced save resolves the vault path when it fires
- claimed severity: minor
- anchor: src/lib/features/auto-move/auto-move.service.ts:62
- scenario: auto-move-rules.json has a typo or is truncated. The rules load as empty. The user adds one rule, and the file now holds only that rule. Separately, a deep-link switch within 500 ms of typing in a rule field writes A's rules, or an empty config, into B's file.
- evidence given: READ: auto-move.service.ts:49-63 falls back to DEFAULT_CONFIG; saveAutoMoveConfig :69-86 writes the store. AutoMoveSection.svelte:33-46 saves on user edits, resolving vaultStore.path when the timer fires.

## feature-writers-13: The quick-capture dedupe anchor advances before the frontend writes, so a dropped capture cannot be retried with the same clipboard
- claimed severity: minor
- anchor: src-tauri/src/quick_capture/commands.rs:94
- scenario: Press Ctrl+Alt+Cmd+C with no vault open (dropped with a toast). Open a vault and press again: Rust returns an empty batch, and nothing is captured until the clipboard changes.
- evidence given: commands.rs:85-95 sets last_signature while building the batch; quick-capture.service.ts:85-91 drops when no vault is open.

## fidelity-12: .view/.collection writers drop YAML comments; sidebar toolbar writes disk under an open dirty .view tab
- claimed severity: minor
- anchor: src/lib/features/collection/yaml-parser.ts:145
- scenario: Change a filter or sort from the rail note list on a commented .view file: comments vanish and the file is reformatted. If the same .view is open and dirty in source mode, its autosave later writes the old YAML back over the toolbar change.
- evidence given: yaml-parser.ts:1, :145-150 parse+stringify; type-sidebar.logic.ts:2, :357-379; type-definitions.service.ts:284-311 no tab sync; callers RailNoteList.svelte:201, TypesNavigator.svelte:134.
