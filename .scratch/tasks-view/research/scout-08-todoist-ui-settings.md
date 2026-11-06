# Scout 08: todoist-ui-settings

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

Not written to `.scratch/tasks-view/research/`: this agent's instructions bar report files, so the findings are below. Each claim is from reading the code unless marked otherwise. Paths are under `/Users/diegorv/Dev/pet-projects/koko/brain/`, abbreviated as `brain/`.

## Facts

**Send UX**
- The send button is a hover/focus-only icon on each task row (`brain/src/lib/features/tasks/TodoistPopover.svelte:113-116`). It renders only when a token exists and the task is not yet sent (`brain/src/lib/features/tasks/TasksView.svelte:241-266`). Sent tasks show a cloud icon linking to Todoist, green when completed.
- The popover shows the task title, then read-only chips for due date, recurrence and tags (`TodoistPopover.svelte:121-141`). None of these can be edited there.
- Fields: Project select (`:152-165`), Section select, shown only if sections exist or are loading (`:170-195`), Priority select with 4 levels (`:200-213`), an error line (`:216-218`), and a Send button (`:221-234`).
- On open, project and section are pre-filled from `todoistStore.lastProjectId`/`lastSectionId`. Priority comes from task metadata if present, otherwise from `lastPriority` (`TodoistPopover.svelte:55-68`). Projects load, and sections load only if a project is selected (`:70-77`).
- Changing project clears the section and reloads sections (`:80-92`).
- Send calls `sendTaskToTodoist` (`brain/src/lib/features/tasks/todoist.service.ts:181-235`). It merges metadata-derived args with popover overrides, applies the default label, creates the task, stores a sent entry, persists to disk, and remembers project, section and priority. On error the message is shown as `String(err)` (`TodoistPopover.svelte:106-108`). No retry.
- Metadata-to-Todoist mapping (`brain/src/lib/features/tasks/todoist-bridge.logic.ts:15-63`): highest=4, high=3, medium=2, low/lowest/none=1. Tags become labels. A recurrence sets `dueString` and drops `dueDate`, even though the popover still shows the 📅 chip.
- Labels: `defaultLabel` is appended to every created task via `mergeLabel` (`todoist.service.ts:207-211`). The popover has no opt-out.

**Stale remembered IDs**
- `handleOpen` restores `lastSectionId` without checking that it belongs to the selected project (`TodoistPopover.svelte:60-61`).
- The labels fall back to "Inbox (default)" and "No section" when an ID is not found (`TodoistPopover.svelte:39-48`), but `handleSend` still sends the raw ID (`:100-101`).
- `store.sections` is not cleared on open, so a failed `loadSections` leaves the previous project's sections visible (`:70-77`).

**Sent-task identity**
- Keyed by `${filePath}:${text}` (`brain/src/lib/features/tasks/todoist.store.svelte.ts:24-28, 49-51`). Editing task text or moving the file orphans the link, and the popover reappears, allowing a duplicate send. Identical task lines in one file collapse into one key.
- Entries are never removed (`todoist.service.ts:215-224`).
- `isCompletedInTodoist` uses the first matching entry (`todoist.store.svelte.ts:70-75`).

**Sync**
- Manual button only, shown when a token exists (`TasksView.svelte:137-150`). No sync on open or on a timer.
- One GET per sent task with `Promise.allSettled` (`todoist.service.ts:263-279`).
- A 404 becomes `null` and is then written as `todoistCompleted: false` (`todoist.service.ts:273`). A deleted Todoist task therefore looks open, not deleted.
- 404 is detected by substring match on the error message (`todoist.service.ts:86`).
- Per-task failures only go to `debug()` (`:277`). The view's catch logs with `console.error` only (`TasksView.svelte:85-89`), which breaks the CLAUDE.md rule that user-facing errors show a toast.
- `syncedAt` is written (`todoist.service.ts:275`). I did not check whether any UI reads it.

**Projects and sections**
- Projects are cached in memory with no UI refresh (`todoist.service.ts:137-154`). `forceRefresh` exists but has no caller I found. `todoistStore.reset()` runs at `brain/src/lib/app/lifecycle/app-lifecycle.service.ts:649`; I did not check exactly when.
- Sections are fetched per project (`todoist.service.ts:159-171`).

**Token and settings**
- The token is a password-type `Input` (`brain/src/lib/core/settings/sections/TodoistSection.svelte:24-29`). Every keystroke calls `updateTodoist` (`:7-8`).
- Stored in `settings.todoist.apiToken` (`brain/src/lib/core/settings/settings.types.ts:242-247`; defaults in `settings.store.svelte.ts:122-125`).
- Persisted as plain JSON in `<vault>/.kokobrain/settings.json` (`brain/src/lib/core/settings/settings.service.ts:13-18`, written at `:258` and `:271` with `JSON.stringify` of the whole settings object). No field is stripped.
- No keychain or stronghold plugin. A grep of `src-tauri/Cargo.toml` and `src-tauri/src` for keyring, keychain, stronghold and todoist returned no hits.
- The sent-task file `<vault>/.kokobrain/todoist-sent.json` is in the vault too (`todoist.service.ts:12, 95-96`).
- No "test connection" action. Validation happens only when projects load.
- The help link opens `todoist.com/prefs/integrations` (`TodoistSection.svelte:32-40`).
- Tests exist for service, store, bridge, client, adapter and `TodoistSection`. A grep found no test file referencing `TodoistPopover`.

## Problems and gaps

1. Metadata chips are display-only. Recurrence silently replaces due date on send.
2. Stale project or section IDs produce raw API errors, and the UI shows the wrong label.
3. The section list can belong to another project.
4. Sent identity is text-based, so edits cause duplicates. There is no cleanup of orphaned entries.
5. Deleted Todoist tasks appear as open.
6. No progress or error feedback for sync.
7. The token is stored in plain text in a vault folder that may be synced or committed.
8. No opt-out for the default label per send.
9. No bulk send, no default-rule mechanism, and no project refresh.
10. Priority mapping collapses low, lowest and none into Normal.

## Ideas worth keeping

- Per-send memory keyed by source (file or tag) rather than one global "last used".
- Clickable metadata chips that feed the send form.
- Validate remembered IDs against the freshly loaded lists before use.
- Keep the cloud icon and the completed-state indicator.
- `mergeLabel` (`todoist-bridge.logic.ts:72-79`) is a reusable dedupe helper.
- Validate the token on save with a single `getProjects` call.
- Move the token out of the vault settings file, into the OS keychain or a user-level config.

## Open questions

- Does the Todoist API reject a section that belongs to a different project, and what is the exact error text? From memory, not verified.
- Does every settings keystroke write to disk? The save path is not traced here.
- Is `syncedAt` shown anywhere in the UI?
- When exactly is `todoistStore.reset()` called?
- Should sent identity move to a stable ID written into the note, or stay text-based?
