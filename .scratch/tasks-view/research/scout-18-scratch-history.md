# Scout 18: scratch-history

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Summary (120 words max):** Scratch history shows the Tasks area has been fixed mostly for data safety and performance, not for UI or rules. Open items are the Todoist sent-list (corrupt-file overwrite, duplicate sends, key collisions), stale line-number toggles, and Rust parsing gaps (case-sensitive section match, task-tag boundary, CRLF). The default `#to-list` section scope has no recorded decision in `.scratch/`. Calendar and Tasks view use different scope rules. I did not write `research/scout-18-scratch-history.md`, because the system instructions say subagents return findings directly and not as report files. Findings follow.

## Facts

**Past decisions and fixes (done)**
- Task toggle saves a dirty tab first, then toggles, and line-shift guard compares text: `b4f126bf2` (file-io Issue 02, ledger done), `file-io-audit/work/02/review.md:6-7`.
- Section scan prefilters to notes with tasks, runs off main thread, and only the latest `buildTaskIndex` call wins: `839fc0b93` (ui-responsiveness Issue 02, resolved). `ui-responsiveness/issues/02-tasks-in-section-prefilter-and-async.md`. Skip task scan on vault open: `25c5f2b93`.
- Default Todoist label setting and dedupe helper: `4ca706ad1`, `6e8d79738`. Default label is `''`, so existing vaults are unaffected.
- Dead TS task parser removed; parsing is Rust-only (`get_all_tasks_v2`, `toggle_task_status`): `9f457365b`, `f51230ae2`.
- Tasks tab hides the right sidebar: `25d91cdc3`. Row wikilinks and markdown links rendered: `8a845d9c1`. List scroll fix: `1dcfae4b1`.
- Hover-only Todoist trigger now reveals on focus: ux-polish Issue 67, done `22178ce9e` (`ux-polish/ledger.md:101`). Unverified whether an aria-label was added.
- Todoist settings inputs moved to shadcn `Input`: ux-polish Issue 24, done (`ux-polish/ledger.md:60`).
- Calendar Issue 40 shows dated tasks by `metadata.dueDate` (`📅` only). It calls `get_all_tasks_v2` with no section tag (`archived/calendar-feature/work/40/discovery.md:4-6`, `review.md:24`).

**Open issues (todo or needs-triage)**
- Corrupt `todoist-sent.json` is overwritten on the next send or sync. Root cause `todoist.service.ts:114-117`. `file-io-audit/issues/32-app-json-corrupt-overwrite.md` (todo). Same root in `audit-2026-11-04/issues/14-aux-json-load-failure-guard.md` (todo, Issue 14).
- Stale task list can tick the wrong line. `toggle_task_status` takes only `(path, line_number)` (`commands/vault.rs:708-713`). `parsing.rs:1873-1906` does no text check. `file-io-audit/issues/24-stale-task-list-wrong-line.md` (needs-triage, P2 corruption). Fix sketch: pass the displayed task text and refetch on mismatch.
- Unguarded writes: `toggle_task_status` has no vault-root check (`audit-2026-11-04/findings.md:373`, vault.rs:767, 958). Issue 16 (todo). Earlier kimi audit C2 said it can read arbitrary files (`archived/kimi-3-tauri-audit/audit-2026-08-19.md:16-19`).
- Todoist UI copy and styling: raw `String(err)` in `TodoistPopover.svelte:76,89,107` (ux-polish Issue 60, todo). `TasksView.svelte:184` and `:252` use raw palette colors (Issue 48, todo). Todoist token help text to move into its row (Issue 26, todo). Todoist section in grouped cards (Issue 70, todo). Filtered-empty message for Tasks (review-2026-11-04 item 11).

**Confirmed findings with no Issue file yet** (`audit-2026-11-04/findings.md`)
- Sent links keyed by `filePath + text`. Rename drops links, duplicate lines share one key, so sending one marks both: `todoist.store.svelte.ts:49` (line 93).
- Retry after failed save creates a duplicate Todoist task: `todoist.service.ts:223` (line 479).
- Out-of-order section responses: `todoist.service.ts:166` (line 476).
- Failed sync shows no feedback: `TasksView.svelte:89` (line 480).
- Section match is case-sensitive substring: `parsing.rs:1739` (line 408). `#work` matches `#workshop`, `#Work` does not.
- Task tag has no preceding-boundary check: `parsing.rs:1578`. `https://x.com/#intro` yields tag `intro`.
- CRLF notes give `Task.text` a trailing `\r`: `parsing.rs:1427`.
- Vault switch during send writes the old vault's entry into the new vault: `todoist.service.ts:224`.
- Todoist API token stored in plaintext in `.kokobrain/settings.json`: `audit-2026-11-04/findings.md:447`, `settings.types.ts:237`. Remote sessions redact it (`ios-app/architecture-proposal-2026-11-02.md:178`).

**Scope and status facts**
- Default `sectionTag` `'#to-list'` at `tasks.store.svelte.ts:8` and `:30`, per `ui-responsiveness/research/A-deep-dive.md:12`. Filters are in-memory only and reset on vault teardown (from memory of `tasks-view/research/scout-02`, not re-verified here).
- Calendar tasks ignore the section tag, which is a scope disagreement with the Tasks view (`archived/calendar-feature/work/40/discovery.md:6`).
- Calendar review (CHANGES_REQUESTED) found in-progress, important, question and forwarded tasks render as done (`archived/calendar-feature/work/40/review.md:59`). Fix commit `c987395bc` is titled "show task status". I did not verify the diff.
- The same review probe showed `get_all_tasks_v2` going from 1 to 7 calls on unrelated settings writes (`review.md`, probe). Not verified as fixed.

## Problems and gaps
- The Todoist sent list has no atomic write, no load guard, and no stable task identity. Three open items point to the same design gap.
- Toggle relies on a line number. Only dirty tabs get a text check (`audit-2026-11-04/findings.md:477`).
- Scope rules are substring-only and not visible in the UI. Nothing in `.scratch/` explains the empty state when `#to-list` matches nothing.
- Calendar and Tasks use different scope rules, and the Calendar ignores the section tag.

## Ideas worth keeping
- Key Todoist sent state by stable Todoist task ID plus a line-independent task anchor, not `filePath + text`.
- Pass the displayed task text in `toggle_task_status` and refetch on mismatch (Issue 24 sketch).
- Write-then-rename for `todoist-sent.json`, plus Issue 14's "do not save over an unloaded file" guard.
- Reuse `mergeLabel` (`todoist-bridge.logic.ts:88-107`) for any label rules.
- The prefilter pattern from ui-responsiveness Issue 02 applies to any rule-based sourcing.

## Open questions
- Is `#to-list` the intended default scope, or a leftover? No decision record in `.scratch/`.
- Should section matching be boundary-aware and case-insensitive?
- Should the Calendar honor the same sourcing rules as the Tasks view?
- Was the Calendar's repeated `get_all_tasks_v2` refetch fixed in the Issue 40 follow-ups?
- Does the PRD take ownership of the Todoist sent-list fixes (Issues 14, 32), or keep them in the audit track?
