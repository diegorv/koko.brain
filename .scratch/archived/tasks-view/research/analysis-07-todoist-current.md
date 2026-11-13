# Analysis 07: todoist-current

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The sync feature may never show "completed": the SDK and docs describe GET /tasks/{id} as active-only (todoist-api.js getTask JSDoc), yet service.ts:84-89 and :272-275 turn any 404 into todoistCompleted:false, and a 5-minute live check with the owner's token would settle it. Other main problems: sent identity is filePath+text (todoist.store.svelte.ts:24-31, text includes emoji signifiers per parsing.rs:1632), so editing a task line or renaming a note causes duplicate sends; send is not durable (service.ts:213-224); the token is plaintext in the vault (settings.types.ts:243, against ADR-0019:61). No endpoints in use are deprecated (SDK pins api/v1).

## Candidate issues

- Spike: what GET /api/v1/tasks/{id} returns for a completed task and a deleted task (two curl calls with the owner's token; no code)
- Sync correctness: use httpStatusCode instead of message substring, three states (open / closed in Todoist / not found), batch via getTasks({ids}) or capped concurrency, handle 429 retry_after, one aggregated toast, show last-synced time
- Sent identity: key = vault-relative path + text + occurrence index, migrate legacy absolute entries, path-change consumer for rename/move/delete registered in initializeVault, orphan list with unlink
- Send durability: persist the entry before showing it as sent, capture vault path at send start, 'task may already exist' message after timeout/non-HTTP failure, load-failure guard and atomic write (fold in or reference audit-2026-11-04 Issue 14 and file-io-audit Issue 32)
- Send popover fixes: explicit Inbox / No section options (currently unreachable once a project is remembered, TodoistPopover.svelte:160-164), paginate projects and sections via nextCursor, refresh projects (forceRefresh has no caller), drop stale section responses, readable error mapping, confirm sending a checked task, visible aria-labelled trigger
- Settings: Test connection button, save token on blur/button instead of per keystroke, move token out of the vault settings.json (owner decision on location)
- Payload fidelity: keep explicit due date with recurrence (dueString 'every week starting <date>', verify live), description with kokobrain://open deep link via buildOpenNoteDeepLink (opt-in), optional parentId, bulk send from the new selection model
- TodoistRowStatus component for the redesigned Tasks view plus a TS-side 'Todoist state' facet (not sent / sent / closed) for the filter bar
- Routine SDK bump to newest 15.x plus an adapter test pinning today's error shape (string rejection becomes 'An unknown error occurred during the request'; never make it a TypeError without POST idempotency or the SDK will retry POSTs and duplicate tasks); 16/17 majors as a separate Issue
- Optional, owner-gated: write a durable Todoist id into the note line and expose it from the Rust parser as a TaskMetadata field (Option B)

## Owner questions

- Can you run two curl calls with your Todoist token (one completed task id, one deleted) and paste status and body? Default: yes; it decides the sync design. Without it, ship the wording 'closed in Todoist (completed or deleted)', which is correct either way.
- Should sync tick the note checkbox when a task is completed in Todoist, and close the Todoist task when you tick the note? Default: no, keep display-only (matches help/documentation/10-tasks-and-todoist.md:137-138); revisit after the new view ships.
- Where should the API token live: (a) leave in vault settings.json and document excluding .kokobrain from sync, (b) app-level storage outside the vault, (c) OS keychain (ADR-0013 dropped the keychain dependency)? Default: (b), since it fixes the leak and per-vault re-entry with no native dependency.
- Do you want the Todoist id stored in the note (Option B)? Default: no for now; do the identity fix first and reconsider if the new view needs 'sent' as a Rust-side filter or duplicates persist.
- May the Todoist task description carry a kokobrain://open link to the note (it exposes vault name and note path inside Todoist and only works on your Mac)? Default: yes, as an opt-in setting that is off by default.
- Should recurring tasks keep their explicit due date via 'every week starting <date>'? Default: yes, once a live call confirms Todoist accepts it; otherwise keep current behavior.
- Do you want automatic rules for which tasks go to Todoist? Default: no auto-send; offer bulk send, decided together with the PRD's filter and category model.
- Should sending an already-checked task be blocked or allowed with confirmation? Default: allow with a confirmation.
- Which SDK line? Default: bump to the newest 15.x now (routine), schedule the breaking 16 and 17 majors as their own Issue after the Tasks work.
- Do you use Todoist from more than one machine or vault? Default: assume one machine; this decides how soon relative paths and token placement matter.

## Agent note on file

.scratch/tasks-view/research/analysis-07-todoist-current.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files"; I did not work around it. The full draft exists only in this run's context, so re-run with writing allowed or ask for it as text.)
