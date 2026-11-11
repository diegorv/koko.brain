# Adversarial review of Issue 11: A rule can rename the note

Reviewed `.scratch/frontmatter-rules/issues/11-rule-action-rename-note.md` against main at `17892c5ed`, the PRD, Issues 01, 04 (on main), 03 and 06-10, 12 (specs). Code names are today's `auto-move`; the Issue uses post-06 names. The scout report (`issue-review-11-scout.md`) was checked, and its key facts were re-read in the code. Owner decisions in the Issue's Notes are not reopened.

## Findings

### F1. data-loss: the headline example renames on every save and grows the name

- **Issue lines:** 4 (`{date} {basename}` for meetings), 24-26 (Behavior 4 "idempotent"), 39 (Acceptance "a second save does nothing").
- **Evidence:**
  - `{date}` is not a destination variable. The only ones are `folder`, `parent`, `basename`, `type`, `status`, `year`, `month` (`src/lib/features/auto-move/auto-move.logic.ts:352-360`). Unknown variables stay literal (`:362`, `vars[key] ?? match`). `{` and `}` are not in Behavior 1's replace list, so the note becomes `{date} Meeting.md`.
  - `{basename}` is the note's current name (`auto-move.logic.ts:355`, from the record built at `auto-move.service.ts:207`). On the next save, `X {basename}` evaluated on `X Meeting` gives `X X Meeting`. That is neither `<name>.md` nor `<name> N.md`, so Behavior 4's "already named" check cannot catch it. The same applies to `expr` with `file.basename` or `file.name` (Issue 08 line 5 makes `file.basename` a normal value).
  - Each rename rewrites every backlink source on disk (`src/lib/core/filesystem/link-updater.service.ts:46-71`). For a Todoist project note, a local rename is pushed to Todoist as a project rename (`src/lib/features/todoist-sync/projects.logic.ts:221-229`, `localRenamed && !remoteRenamed` -> `plan.updates`). The name grows until the OS refuses it, and from then on `renameItem` logs to Sentry on every save (`src/lib/core/filesystem/fs.service.ts:295`).
- **Why it is not covered by the owner decision:** Behavior 7 lists only `now()` and `file.mtime`. A volatile name changes; a self-referencing name grows without bound, and the Issue presents it as the main example.
- **Minimal fix:**
  - Line 4: replace the example with a self-reference-free one, such as `{year}-{month} Meeting`, or an `expr` built from properties.
  - Behavior 7 (line 31): add "A name that uses the note's own name (`{basename}`, `file.basename`, `file.name`) is refused on load and in Settings, because it grows on every save." Alternatively, list it with the volatile names and document it, if the owner prefers that. Either way, Acceptance 1 must use a stable template.

### F2. data-loss: rename has no gates, so it can rename canvases, type definitions, templates and Todoist project notes

- **Issue lines:** 15-31 (no gate Behavior) and 21 ("The `.md` extension is kept").
- **Evidence:**
  - The observer filters only `.view` files (`auto-move.service.ts:129`; `isViewFile` at `src/lib/core/filesystem/fs.logic.ts:71-73`). A canvas edit calls `onContentChangeForPath` (`src/lib/app/EditorView.svelte:84`), which schedules the autosave (`src/lib/core/editor/editor.service.ts:265-268`). The autosave runs `notifyAfterSave` (`editor.service.ts:196`), so `Board.canvas` reaches `evaluateAndMove`. A folder rule then renames it to `<name>.md`, and the canvas JSON becomes a broken note.
  - Issue 01's gates guard property writes only (`propertyWriteSkipReason`, `auto-move.logic.ts:251-269`).
  - A type definition is a note named after the type (`type-definitions.service.ts:190-193`). A plain `renameItem` does not rewrite the members' `_type`. Only `renameType` does that (`type-definitions.service.ts:221-240`), so a rule rename orphans every member note.
  - Todoist project note: see F1 (`projects.logic.ts:221-229`). The rule's name is pushed to Todoist.
  - The PRD forbids rule writes to all of these: non-Markdown, `_system`, templates, type definitions (`PRD.md:22-29`).
- **Minimal fix:** add a Behavior: "**Gates.** The rename is skipped, with a quiet debug line, for a file that is not Markdown, a note under `_system` or the templates folder, a type definition (the Issue 01 Behavior 10 gates, minus the frontmatter-shape ones), and a note with a `todoist_project` property. The note keeps its own extension (`.md` or `.markdown`)." Add one acceptance line for the gates.

### F3. spec-error: the free name is checked in the wrong folder when the rule also moves

- **Issue lines:** 22 (rename, then move) and 25 ("the note gets `<name> 2.md`").
- **Evidence:**
  - `moveItem` keeps the file name and throws when the destination already holds it (`fs.service.ts:308-313`, `targetExistsError`).
  - Issue 01 Behavior 8 says a failed move writes nothing for the run (`auto-move.service.ts:243-248`).
  - Scenario: a rule renames to `Weekly` and moves to `Archive/`, which already has `Weekly.md`. Run 1 renames `Inbox/foo.md` to `Inbox/Weekly.md`, since that name is free in `Inbox`, and then the move throws. On every later save, "already named" skips the rename, the move throws again and logs to Sentry, and the properties are never written. The note is stuck for good.
- **Minimal fix:** in Behavior 4, add "The first free name is picked in the folder the note ends in: the resolved destination when the run moves it, else its current folder."

### F4. contradiction with Issues 08, 09 and 10: the run order and the record after a rename are not stated

- **Issue line:** 22 (order "rename first, then move, then write the properties").
- **Evidence:**
  - The order leaves out Issue 09's create note and Issue 10's mod action. Issue 10 runs "after the move and the property writes" (`10-rule-action-run-mod-action.md:19`). Issue 09 does not place itself in the run.
  - Issue 08 evaluates values against "the same record as the filter" (`08-computed-property-values.md:19`), which is the record from before the rename (`auto-move.service.ts:207`).
  - Issue 09's "only when missing" idempotence is keyed on a path resolved from the source's `{basename}` (`09-rule-action-create-note.md:19,23`). Take a rule that renames and creates `{parent}/{basename} follow-up.md`. It creates `Old follow-up.md` in run 1 and `New follow-up.md` at the next save. With a volatile name (Behavior 7, allowed), it creates a new note on every save. Issue 09's cap of 5 is per run, not across saves (`09:27`).
  - Issue 08's `title: file.basename` with `always` writes the old name at the new path, then rewrites it at the next save.
- **Minimal fix:** in Behavior 2, add "After a rename, the destination template, Issue 08 values and Issue 09's create path resolve with the new name and path. The order is rename, move, properties, create note, mod action." In Docs (line 35), add "A rule that renames with a volatile name and creates a note from `{basename}` creates one note per save."

### F5. spec-error: converting an `expr` result to a name is undefined, and the meeting use case needs a date

- **Issue lines:** 19 (`expr` "computed by the engine, as in Issue 08") and 21.
- **Evidence:**
  - `today()` and `now()` return a JS `Date` (`src/lib/features/collection/expression/evaluator.ts:363-369`). A plain `String(date)` gives `Tue Nov 10 2026 00:00:00 GMT-0300 (...)`, and the `:` replacement then produces a garbage name.
  - Issue 08's date rule covers property values only (`08-computed-property-values.md:20-21`).
  - Lists, booleans and `null` have no rule either. The Issue says only "An empty result does nothing".
- **Minimal fix:** in Behavior 1, add "An `expr` result is converted as in Issue 08 Behavior 2: a date becomes `YYYY-MM-DD`, or the ISO date and time with `now()`, before the character replacement. A number becomes its text. A list, a boolean, `null` or a throw does nothing, logged once per rule per session."

## Not blocking

1. On a case-insensitive volume, the "already named" check and the target-exists check must compare case-insensitively. Otherwise a case-only change finds the note itself and picks ` 2`. There are precedents at `fs.logic.ts:226-229` and `projects.logic.ts:243-246`.
2. The Issue does not say what a failed rename does to the move and the properties. `renameItem` calls `error()` on every failure (`fs.service.ts:295`), so pick "log once per rule per session" and "continue at the old path" or "stop".
3. Load validation for `rename` (both fields, neither field, non-string values) is unstated. `withValidProperties` passes unknown fields through untouched (`auto-move.service.ts:92-96`). Issue 08 Behavior 1 drops such entries; say the same here.
4. Dirty tab plus property writes: the property write flushes the user's edit (`frontmatter-write.service.ts:131-133`). The observer ignores that save, because the path is in the skip set (`auto-move.service.ts:128`). The deferred rename therefore waits for the user's next edit, and Acceptance 4 should say which save it means.
5. `getFileNameError` (`fs.logic.ts:133-140`) already covers the forbidden characters, a leading `.` and control characters; Behavior 1's list misses the last two. `doesNothing` (`AutoMoveRuleRow.svelte:65`) must count `rename`, or a rename-only rule is flagged "does nothing".

## Tried and could not refute

- `renameItem` is at `fs.service.ts:280`. It goes through `applyPathChange`, so links are rewritten and the tab is re-pathed (`link-updater.service.ts:35-71`).
- Behavior 6's premise holds. The link rewriter writes raw, then calls `syncExternalContentToEditor(..., 'none')` and `applyNoteChange`, and never calls `notifyAfterSave` (`link-updater.service.ts:58-71`). The pin test can be written, and it is a pin, not a failing-first test.
- A rename or move fires no after-save, so the skip set is needed only for the property write at the final path (`auto-move.service.ts:257-267`). The rename itself cannot loop.
- For a stable template, Behavior 4's "already named" rule does stop the `X 2` to `X 3` churn on a clash.
- Rename then move composes, because `moveItem` keeps the current file name (`fs.service.ts:308`).
- The blockers are right: 11 is blocked by 10 in the 07-12 chain, and 12 (docs only) is blocked by 11. There is no conflict with PRD decisions 3 and 6: a rule's rename is not a save and does not chain.
