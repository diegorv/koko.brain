# Adversarial review: Issue 09 (A rule can create a note)

Read-only. Evidence is path:line on main (17892c5ed). Post-06 names map to today's `src/lib/features/auto-move/`. Scout report `issue-review-09-scout.md` was used as a lead and re-checked. Owner decisions in the Issue Notes are not reopened.

## Findings

### F1. data-loss: a create rule whose filter matches its own output creates one more note per save

- **Issue line:** Behavior 5 (09:26), with the follow-up example (09:4, 09:19) and `open` (09:22, 09:25).
- **Evidence:** Behavior 5 only stops the same run. The created note is evaluated at its first save like any note (`auto-move.service.ts:127-160`). The Issue's own use case makes it match: a "meeting follow-up" built from a meeting template that carries `type: meeting`, with filter `type == "meeting"`. Or filter `file.inFolder("meetings")` with a target in the source's folder (`{folder}/...`, `auto-move.logic.ts:353`). Saving `X follow-up.md` creates `X follow-up follow-up.md`, and so on, one note per save of the newest one. With `open: true` each new note opens in a tab, which invites the edit that creates the next note. "Would create N notes now" (Behavior 8) counts only today's matches, so it does not show this.
- **Minimal fix (Behavior 5, add):** "Before creating, evaluate the rule's own filter against the note it would create, using the record built from the target path and the rendered content. If it matches, create nothing and log once per rule per session. The help page says a create rule's filter must not match the note it creates." Acceptance: "A rule whose filter matches its own created note creates nothing and logs once."

### F2. spec-error (leads to duplicate notes): "only when missing" is not what `createFile` gives, and shared targets race

- **Issue line:** Behavior 2 (09:23) and Behavior 4 (09:25).
- **Evidence:** `createFile` never refuses an existing name. It renames it with `generateUniqueName` (`fs.service.ts:200-203`, `fs.logic.ts:233-262`), so a target that exists becomes `X follow-up 1.md`. Rust `create_note` refuses an existing file (`vault.rs:1142-1144`) but never sees one. Behavior 2 works only if the implementer checks `exists` first, and the Issue does not say so. The hub example (09:6) also breaks under concurrency. Each source has its own debounce timer (`auto-move.service.ts:145-160`), so a bulk save (Todoist sync, a mod) fires several runs together. Two sources that resolve to `hubs/X.md` can both pass `exists`. The second run then gets either a stray `X 1.md` or a refused `create_note`, which `createFile` logs as an error and sends to Sentry (`fs.service.ts:222-224`).
- **Minimal fix (Behavior 2, replace the mechanism):** "Check `exists(target)` before `createFile`, which renames a clash instead of refusing it. Hold the target in a module-level in-flight set while it is created, like `writingPaths` (`auto-organize.service.ts`); a target already in the set is skipped. Rules in one run create one after another." Acceptance: "Two sources with the same target, run together, create one note and no `1` suffix."

### F3. spec-error: the `{parent}` example puts the follow-up one folder up

- **Issue line:** Behavior 1 (09:19).
- **Evidence:** `{parent}` is the parent of the note's folder, not the folder itself (`auto-move.logic.ts:348-349`, `:354`). `meetings/2026/x.md` gives `meetings/x follow-up.md`, and a note in a top-level folder gives the vault root. The source's folder is `{folder}` (`:353`).
- **Minimal fix:** use `{folder}/{basename} follow-up.md` in Behavior 1 and in the help page example.

### F4. spec-error: the `..` and absolute-path guard is placed where it cannot work

- **Issue line:** Behavior 7 (09:30) and Acceptance (09:44).
- **Evidence:** `resolveDestination` strips a leading `/` (`auto-move.logic.ts:363`). After resolution, an absolute `path` is quietly moved inside the vault, so an "absolute path" check on the resolved path never fires. The same function fills `{status}` and `{type}` from the note's frontmatter (`:356-357`), so `status: ../../x` gives `../../x/n.md`, and that only shows up after resolution. The missing folder (Behavior 3) would be created with the plugin-fs `mkdir` the move uses (`auto-move.service.ts:233`) before `createFile`. Rust `ensure_safe_write_path` (`vault.rs:1108-1120`) guards only the later `create_note`.
- **Minimal fix (Behavior 7):** "A `path` that starts with `/` is dropped on load. After the variables are resolved, a target with any `..` segment is refused. This check runs before the folder is created."

### F5. contradiction (PRD Decision 9, Issues 10 and 11): the create step has no place in the run

- **Issue line:** Behaviors 1 and 4 (09:21, 09:25). No order is given.
- **Evidence:** PRD Decision 9 says "A failed move writes nothing for that run" (`PRD.md:21`). A create placed before the move breaks that rule. The run returns early when there is no legacy icon and no owned property (`auto-move.service.ts:254-255`), so a rule with only `createNote` would never create unless the order is stated. Issue 10 puts its action "after the move and the property writes" (10:19). Issue 11 orders rename, move, properties (11:22). Behavior 1 says the variables refer to the source, but not whether that is before or after the move. The code builds the record once, before the move (`auto-move.service.ts:207`, `:224`), and Issue 08 evaluates "against the same record as the filter" (08:19).
- **Minimal fix (new line in Behavior 4):** "Order: move, legacy icon, properties, then create, then run action (Issue 10). A failed move skips the create. The path variables and `createNote.properties` use the record the filter used, from before the move (and the rename, Issue 11)."

### F6. spec-error: the "template picker" and "the way the template system does" cross the layer rule, and a missing template fails silently

- **Issue line:** Behavior 1 (09:20) and Behavior 8 (09:31).
- **Evidence:** The only template picker is `src/lib/plugins/templates/TemplatePicker.svelte` (it imports `templatesStore`, `:4`). The template system's create path is `createFileFromTemplate` (`plugins/templates/templates.service.ts:55`). Both live in `plugins/`. `features -> plugins` is a layer violation (`scripts/import-graph.mjs:165`). `layer-baseline.json` holds only the three `utils` entries, and `BASELINE_SIZE = 3` (`layer-rules.test.ts:32`) fails on any new one. The core loader `loadNoteTemplate` (`core/note-creator/note-creator.service.ts:49`) is legal, but it swallows a read failure and returns `''` (`:53-58`). A mistyped `template` therefore creates a blank note, and Behavior 2 then never retries it.
- **Minimal fix:** in Behavior 1: "`template` is a vault-relative path. The content comes from `loadNoteTemplate` (`core/note-creator`). If the template file does not exist, nothing is created and this is logged once per rule per session." In Behavior 8: "a vault-relative path field, as `PeriodicNotesSection.svelte:46` does; no import from `plugins/templates`."

### F7. spec-error: "Would create N notes now" counts source notes, not notes

- **Issue line:** Behavior 8 (09:31).
- **Evidence:** The Issue defines N as "the matching notes whose resolved target does not exist yet". Under the hub example (09:6), many sources resolve to one target. A hundred matching notes give "Would create 100 notes", but one save creates one. The existing count (`countMatchingNotes`, `auto-move.logic.ts:81-95`) returns only a number, so a new function is needed in any case.
- **Minimal fix:** "N is the number of distinct resolved targets of the matching notes that do not exist and pass the gates of Behavior 7."

### F8. contradiction (PRD Decision 10, Issue 01 Behavior 1): `createNote.properties` load rules are unstated

- **Issue line:** Behavior 1 (09:21).
- **Evidence:** PRD Decision 10 refuses `todoist_project` and accepts only booleans for `_organized`, `_archived` and `_favorite` (`PRD.md:29`). Today that rule lives only in the `properties` sanitizer (`auto-move.service.ts:81`, `:92-96`, `sanitizeRuleProperties` at `auto-move.logic.ts:157-170`), and `withValidProperties` does not touch a new `createNote` field. A created note with `todoist_project` sends its tasks to that Todoist project (`features/todoist-sync/create.logic.ts:218`). A text `"false"` on `_organized` silently reads as the default (`01:33`).
- **Minimal fix (Behavior 1):** "`createNote.properties` are loaded with the same rules as `properties` (Issue 01 Behavior 1, Issues 07 and 08). A `createNote` without a string `path` ending in `.md` is dropped on load."

## Not blocking

- `createFileFromTemplate` adds `_organized: false` when `settingsStore.explicitOrganization` is on (`templates.service.ts:67`). Say in one line whether a rule-created note gets it.
- `file.folder` is absolute (`evaluator.ts:201`; Issue 01 tests use `/vault/...`). The linking recipe in Behavior 9 must build the link from `file.basename`, not from `file.folder`.
- The acceptance line at 09:45 is true by construction, because `createFile` fires no after-save. It only proves something if the note is built in full before `createFile` (`fs.service.ts:193-196`), and Behavior 4 should say so.
- An empty variable gives a dot-file: `hubs/{type}.md` on a note without `_type` resolves to `hubs/.md`. Refuse a final name that `getFileNameError` rejects (`fs.logic.ts:133`) or that starts with `.`.
- The help page should say two things. A deleted created note comes back at the source's next save. A template note saved in the templates folder can match a rule (a meeting template carries `type: meeting`) and create a note.

## Tried and could not refute

- `createFile` is at `fs.service.ts:198`. Through Rust `create_note` (`vault.rs:1136-1158`) and `applyNoteChange` (`fs.service.ts:219`), it updates the Rust index and the TS indexes.
- `createFile` calls no `notifyAfterSave`, so Behavior 5 holds for the same run. The citation of Issue 01 Behavior 9 is correct (`01:53`).
- `addToTree` creates missing ancestor folders in the tree, so Behavior 3 needs only the disk folder.
- Blocked by 08 is right. 09 needs 08's computed values and 02's property editor (`AutoMoveRuleProperty.svelte`, reusable), and the 08 -> 09 -> 10 chain matches the PRD table (`PRD.md:57-59`).
- The cap of 5 per run fits one `createNote` per rule. "Logs once per rule per session" needs its own set, cleared in `resetAutoMove` (`auto-move.service.ts:338-351`), which is an implementation detail.
- The frontend-only gate is correct. The rules file has no Rust reader and no ts-rs export, and going through `createFile` keeps the raw-write ratchet green.
- The default templates folder `_system/templates` (`settings.store.svelte.ts:98`) lies inside `_system`, so the Behavior 7 gates overlap but do not conflict. The excluded-folder gate can reuse `isInExcludedFolder` (`auto-move.logic.ts:275`).
- There is no conflict with Issue 06 names, or with Issue 12, which is docs only. Issue 11 also uses the `{variable}` syntax, so 09 does not add a third dialect beyond what M6 (`validation-01.md:108-113`) already lists.
- For F1, I checked whether Todoist sync could feed the chain without any user action. The closed-note writer only calls `markRecentSave` (`closed-note-writer.service.ts:3`) and never notifies after-save, so I did not prove an unattended loop. The chain needs one save per step.
