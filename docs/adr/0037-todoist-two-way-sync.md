---
type: ADR
id: "0037"
title: "Todoist two-way sync: anchored lines, two-base merge, Todoist wins, detach only"
status: active
date: 2026-11-10
---

## Context

The owner wanted what is created or changed in a vault to show up in Todoist, and the reverse, projects and labels included (`.scratch/todoist-bisync/research/design.md`, Goal). The app had a one-way "Send to Todoist" popover in the Tasks view: it created a task over REST, kept the pairing in `.kokobrain/todoist-sent.json` keyed by note path and raw line text, and polled each sent task with `getTask` for its completion. That key broke on any edit of the line, nothing came back from Todoist but a badge, and a lost response or a lost sidecar sent the task again.

Constraints that shaped the design, each found by a validation pass before any code (design.md, Hard rules):

- A note line has no stable id: the parser strips signifiers, collapses spaces and drops `#tags` from the description, so the brain-to-Todoist projection is lossy and raw text cannot be compared.
- REST `closeTask` has no idempotency key and the SDK retries network errors, so a recurring date can advance twice; `item_complete` archives a recurring task for good. Only `/sync` commands carry a `uuid` Todoist deduplicates.
- Todoist HTTP is allowed from TypeScript only (plugin-http scope, CSP, `.github/workflows/privacy.yml`).
- The sync writes into notes the user may have open, and a vault can be restored from a backup, opened on another machine or lose its `.kokobrain/`.

## Decision

**A vault syncs one Todoist project tree through `/sync` commands with uuids, pairing each note line with its Todoist task by a visible `🆔 td-…` anchor, merging field by field against two stored bases, letting Todoist win conflicts, never deleting on either side, and stopping before large or suspicious changes.**

- **State in `kokobrain.db`.** Tables `todoist_kv` (sync token, `first_run_done`, project state), `todoist_task_link` (anchor, Todoist id, note path, `local_base`, `remote_base`, `pending_uuid`, `pending_cmd`, `miss_count`, `frozen`), `todoist_section_link` and the bounded `todoist_sync_log` (newest 1000 rows) live in the existing `<vault>/.kokobrain/kokobrain.db` (`src-tauri/src/db/schema.rs`, `todoist_repo.rs`), written through one transactional IPC per step (`todoist_commit_state`). Bases move in the same transaction as the sync token.
- **`/sync` with uuids.** Every write is a `/sync` command (`item_add`, `item_update`, `item_close`, `item_uncomplete`, `item_move`, `project_add`, `project_update`, `section_add`) with a stored uuid, sent in requests separate from pulls (`src/lib/features/todoist-sync/sync-now.service.ts`). A close or reopen waits in `pending_cmd` until Todoist acknowledges it; each cycle pulls before it pushes. `item_close` is built by hand: the SDK's typed command map lacks it.
- **Two-base field merge.** `remote_base` holds the Todoist values last seen, `local_base` the values parsed from the line as last written. A local change is the line against `local_base`, a remote change the item against `remote_base`, compared in Todoist terms (projected priority, case-insensitive labels) so a lossy field never ping-pongs (`fields.logic.ts`). Writes into a line are token patches (status char, `📅`, priority emoji, tags, description), never a whole-line rewrite, and a description with text mid-sentence that the patch would drop is left alone and logged (`task-line.logic.ts`).
- **The `🆔` anchor plus a description back-link.** A synced line carries `🆔 td-<todoist id>` (Todoist-born) or `🆔 td-<8 base36>` (brain-born), parsed today without a parser or DTO change. A brain-born task's anchor and pending link are committed before its `item_add` goes out, and its Todoist description ends with the line `kokobrain:td-<value>`. A lost response, a crash or a lost sync state is recovered by pairing on either: rebuild mode pairs and creates nothing.
- **Todoist wins.** A field changed on both sides since the bases takes the Todoist value; the brain value goes to the sync log.
- **Detach only.** A task deleted or moved out of the tree in Todoist, a line missing from 3 consecutive scans, or a line moved out of scope detaches its link: both sides are kept and stop syncing (`detach.logic.ts`). Absence from an incremental pull never counts.
- **Safety brakes.** A cycle starts only on a ready index, rechecks the vault path before every write, and stops when fewer than half of the attached links have a line (a manual cycle asks). Per cycle, more than 25 close/reopen pushes, 50 field pushes, 25 creates or 10 detaches pauses a manual cycle for a confirm and makes an automatic one skip that action class. The first manual cycle with creates is a preview, and automatic cycles start only after `first_run_done`. Two lines with one anchor freeze that link.

Scope is the sync folder's project notes plus `#todoist` lines elsewhere, with templates, `_system/`, `.view` files and code blocks excluded. The one-way popover, the per-task `getTask` polling and every read and write of `todoist-sent.json` were removed; the file is left on disk, unmigrated.

## Alternatives considered

- **A JSON sidecar in `.kokobrain/`, as `todoist-sent.json` was**: no schema change. Rejected: no transaction to move the bases with the sync token, and a torn write loses every pairing.
- **A Rust HTTP client**: one process owns state and network. Rejected: `privacy.yml` allows Todoist hosts only from TypeScript, and the plugin-http adapter already exists.
- **REST calls (`addTask`, `closeTask`, `updateTask`)**: simpler SDK surface. Rejected: no idempotency key, network retries in the SDK, and a recurring close can roll the date twice.
- **A hidden `^td-<id>` block id as the anchor**: invisible in live preview. Rejected: needs a parser and DTO change (strip it from the description and from the recurrence text, which swallows it) and breaks when text is typed after it. `🆔` collides with the Obsidian Tasks dependency meaning; a line with a user `🆔` without `td-` stays out of the sync.
- **One base, or last-writer-wins by timestamp**: less state. Rejected: with one base the lossy projection reads as a change on every cycle, and a note line has no reliable modification time.
- **Propagating deletes, behind caps**: keeps both sides tidy. Rejected by the owner: a mistaken bulk delete or a vault that lost lines would delete real tasks.
- **The whole vault in scope, or a label filter**: no folder rule. Rejected: templates, archives and thousands of old tasks would sync; the per-vault project tree replaced the label filter (design rule 8c).

## Consequences

- The anchor is visible text the user must not copy or edit; a copied line freezes its task until one copy is removed. The guide says so (`help/documentation/29-todoist-sync.md`, "The anchor").
- Subtask nesting, comments, Todoist descriptions, reminders, deadlines, `⏳`/`🛫` and task order do not sync. The `🔁` text is sent only at creation: Todoist owns the rule, and a due push on a recurring task always resends `{date, string, lang}` because a date-only update drops the rule.
- Links are never retired on their own: a task closed long ago keeps its attached link, so deleting many old `[x]` lines trips the line brake until a manual "Sync now" is confirmed and those links detach over 3 cycles.
- Losing `kokobrain.db` costs the bases and the log, not the pairing: rebuild mode re-pairs by anchor and back-link and creates nothing.
- Known limits, accepted rather than handled:
  - A note with CRLF line endings is never written: any edit on it is stale, logged as `stale` and retried every cycle (`task-line-edits.logic.ts`, `applyTaskLineEdits`), so Todoist changes do not reach it.
  - A note renamed while its `project_add` is unanswered (a lost response) drops the pending add: a second Todoist project can appear, and the old temp id resolves to nothing, so that note's task lines detach (`projects.logic.ts`, pending adds matched by path). Rare and recoverable by hand.
  - Only quiet automatic cycles fold in the sync log (`cycle-log.logic.ts`). Event rows are never folded, so a cycle that logs the same event every run writes an event row and a cycle row each time and can fill the 1000-row cap.
- Revisit when a second vault must sync the same tree, when Todoist offers an idempotent REST write, or when the anchor can move into a hidden parsed field.
