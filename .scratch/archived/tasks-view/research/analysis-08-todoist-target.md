# Analysis 08: todoist-target

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Todoist today is a one-way push of single tasks plus a pull of one boolean, keyed by fragile filePath:text identity (todoist.store.svelte.ts:24-31) and with silent sync failures, so the target is a hardened one-way core with sidecar identity by Todoist id (no note markers), a Todoist-state facet for the view, then confirmed note-wins completion/edit sync, then bulk send and rules, and no full two-way mirror or import unless the owner asks.

## Candidate issues

- Todoist sync: surface failures, add a 'deleted' state (use httpStatusCode, not message substrings), bounded concurrency, stop on 401/429
- Todoist sent log: write a pending entry before POST, atomic write, back up a corrupt log instead of overwriting
- Todoist identity: key entries by todoistTaskId, re-match to tasks by path+text/description, update paths via applyPathChange on rename/move, 'unlinked' state with manual re-link (owner decision)
- Todoist state as a facet in the Tasks view (none/sent/done/deleted/unlinked/outdated) with badge and counts, consumable by the new filter/group engine
- Todoist send mapping: kokobrain://open back-link in description, label sanitising, recurrence guard, payload preview in popover (owner decision on scheduled date and deadline)
- Bulk send (selected or current filter) with per-task payload preview, one project/section/label choice, bounded concurrency
- Confirmed bidirectional completion sync (Todoist->note via toggle_task_status, note->Todoist via closeTask/reopenTask), recurring tasks excluded, automatic mode opt-in (owner decision)
- Edit sync: detect out-of-date sent tasks by stored payload hash and push with updateTask on click, note wins
- Send rules: saved filter -> project/section/labels, preview-first run on Sync, optional auto-run per rule (owner decision, depends on filter engine)
- Import Todoist tasks into a configured note as linked checkbox lines (only if owner confirms; low priority)
- Todoist housekeeping: paginate projects/sections, refresh stale project cache, token test-connection; separate spike for SDK 15->17 major bump

## Owner questions

- Identity: keep the Todoist link only in .kokobrain/todoist-sent.json with re-match and an 'unlinked' state, or put a visible marker in the task line? Recommended default: sidecar keyed by Todoist id with re-match; revisit only if unlinked cases appear in real use.
- Completion sync: should a task done in Todoist be checked in the note and the reverse, automatically or confirmed? Recommended default: confirmed list on Sync, automatic opt-in per direction, recurring tasks excluded.
- If the note task is done but the sent task was deleted in Todoist (or the opposite), do nothing or act? Recommended default: show state 'deleted', do nothing.
- Date mapping: keep the due-date emoji as Todoist due or map it to deadline, and should the scheduled-date emoji fill due when there is no due date? Recommended default: keep as due, no scheduled mapping, no deadline.
- Do you want unattended rules that send matching tasks automatically, or is 'send everything in this filter' with a preview enough? Recommended default: bulk send with preview first; rules only after you confirm you want unattended sending.
- Do you want Todoist-created tasks imported into notes or shown in the view? Recommended default: no for both (usage today is note->Todoist); confirm whether you capture in Todoist (e.g. from phone) before building import.
- Should the Todoist task get a back-link to the note in its description? Recommended default: yes, using the existing kokobrain://open link builder.
- Include the SDK 15->17 major bump in this work? Recommended default: separate spike Issue after the sync, log and identity issues, since 16 and 17 are marked breaking.
- When note text changes after sending, update Todoist automatically or only on click? Recommended default: only on click via an 'out of date' badge, note wins.

## Agent note on file

.scratch/tasks-view/research/analysis-08-todoist-target.md (NOT WRITTEN: the Write tool refused with 'Subagents should return findings as text'; full analysis is in the final text response, the parent must write the file)
