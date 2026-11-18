# Scout: settings-b slice (P80 P81 P124 P125 P126 P146 P147 P148 P149 P150 P151 P169 P170 P185)

Checked at HEAD 085b23c5d. Prototype: `.scratch/design-review/prototypes/settings-auto-organize.html` (sections P80, P124/P125, P126, P81, P169, P170 and the Auto Organize group). Review line numbers in review.md are stale for `AutoOrganizeRuleRow.svelte` (frontmatter-rules added rename, create note and mod action since); all premises below were re-checked at the HEAD lines quoted.

Claude MVP branch (`git diff --stat origin/main...origin/mvp-claude`, 172 files) touches none of the components below. It does touch `help/documentation/19-settings.md` (+15 lines) and `src/lib/core/settings/settings.*`, so help edits for P80/P126/P124 should be small and in separate hunks. No Rust, no write path, no editor decoration in any item. No new dependency.

Test seams used: Settings sections are mounted in jsdom with the real `settingsStore` (`src/tests/lib/core/settings/*Section*.test.ts`); Auto Organize rows with the real stores, mocking only `@tauri-apps/plugin-fs` (`src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`, `AutoOrganizeSection.test.ts`); mods with the real host and only fs and toast mocked (`src/tests/lib/plugins/mods/ModActionPicker.test.ts`, `ModsStatusList.test.ts`). Never a mocked store or `.logic.ts`.

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P80 | QUICK | S | Todoist Root project row: switch to `layout="stacked"`; premise confirmed in the screenshot and in `SettingItem.svelte:37` |
| P81 | QUICK | S | Template picker naming step: template chip, "Creates X.md in the vault root", "Enter opens the existing note", Backspace back; all component-local |
| P124 | QUICK-PART | S | Ship live format examples and "File not found" for template paths in Periodic Notes (plus the template hint in 1:1 Notes); defer 1:1 format examples and Calendar |
| P125 | DEFER | M | Replaces ten rows with a table: a layout redesign, M by the review's own estimate, and ships best after P124's slice proves the hints |
| P126 | QUICK | S | Rename to "Check and download", progress bar, hide unknown size, wrap the handler; the updater flow itself is untouched |
| P146 | QUICK-PART | S | Ship the "When" label (new prop on the shared `FilterPanel`) and one "Add condition" dropdown; defer the shared two-column grid |
| P147 | QUICK-PART | S | Ship verb mode labels with one-line descriptions; defer collapsing the source/type choosers (hides the Expression feature, needs an owner call) |
| P148 | QUICK | S | `aria-invalid`, `aria-describedby`, labels on name and folder inputs, "Not saved:" lead; the red border already exists in `input.svelte:30` |
| P149 | QUICK | S | Focus and scroll the new rule card, new property row and new expression row |
| P150 | QUICK | S | Excluded folders: duplicate message, datalist, missing-folder mark, placeholder, empty state; no change to what is saved |
| P151 | QUICK-PART | S | Label the icon button "Legacy icon on move" with a `_icon` hint; hiding it on rules without an icon waits for an owner OK |
| P169 | QUICK | S | Carry the manifest `description` into `ModStatusEntry`, show it under the name, load time to a tooltip |
| P170 | QUICK-PART | S | Ship coloured status and a named progress bar (and a log live region); the "Stopping..." part is DROP, Stop already ends the run as Cancelled at once |
| P185 | QUICK | S | "Off" pill, dashed border on disabled cards, focus-within border; inputs keep full opacity |

No DONE items: none of the 14 was built by finders-ux, shell-sidebars-ux, tasks-view-ux, frontmatter-rules or vault-organization-v2 (checked `git log` of every file below; the latest commits to `src/lib/features/auto-organize/` are frontmatter-rules Issues 01-14 which added rows, not these polish items). One DROP part (P170 "Stopping...").

## Per-proposal detail

### P80. Todoist Root project overflows its description: QUICK (S)

Premise confirmed. `TodoistSection.svelte:123-148` puts a `Load projects` Button plus a `w-44` Select in an inline `SettingItem`. The inline layout caps the control box at `max-w-[50%] shrink-0 justify-end` (`SettingItem.svelte:37`), so the wider content spills left over the description (see `screens/settings-todoist-light.png`, "Load projects" covering the text). `layout="stacked"` already exists and is used on the API token row (`TodoistSection.svelte:77`).

Behaviour: the Root project row uses `layout="stacked"`; the Button and Select share one line below the description. The `[data-load-error]` paragraph and `data-setting="sync-root"` wrapper stay.

Files: `src/lib/features/todoist-sync/TodoistSection.svelte` (one attribute). Test: `src/tests/lib/features/todoist-sync/TodoistSection.test.ts` (existing `row('sync-root')` helper).

Acceptance:
1. Failing test first: the `sync-root` row's `SettingItem` root has `flex-col` and its control box has no `max-w-[50%]` (same assertion style as `src/tests/lib/core/settings/SettingItem.test.ts:41-43`).
2. The existing `sync-root` tests (Load projects click, choose a project, load error) pass unchanged.
3. A real-window check at the 1440 px width of `screens/settings-todoist-light.png` shows no overlap (jsdom cannot prove this; say so in the commit).
4. No help text change (the row's label and description are unchanged).

### P81. Template picker hides the chosen template and silently opens existing files: QUICK (S)

Premise confirmed. The naming step (`TemplatePicker.svelte:72-90`) shows only the typed name; `createFileFromTemplate` (`templates.service.ts:55-69`) builds `${vaultPath}/${name}.md` and `openOrCreateNote` opens an existing file without creating (`note-creator.service.ts:87-90`, `exists(filePath)`). There is no way back from the naming step (`reset()` closes the dialog).

Behaviour, all inside `TemplatePicker.svelte`:
- A template chip in the naming step: the selected template's name from `templatesStore.templates` (already in the store).
- The hint line becomes "Creates <name>.md in the vault root" (name with `.md` appended only when missing, as now).
- When `<name>.md` already exists in the vault tree, the hint reads "Enter opens the existing note". Existence is a sync lookup with the existing pure `findFileNode(fsStore.fileTree, vaultStore.path, path)` (`fs.logic.ts:25`), no new IPC.
- Backspace on an empty name returns to the template list (`selectedTemplatePath = null`, keeps the dialog open).

Files: `src/lib/plugins/templates/TemplatePicker.svelte`. Test: `src/tests/lib/plugins/templates/TemplatePicker.test.ts` (real `templatesStore`, real `fsStore`; only `createFileFromTemplate` is mocked there already).

Acceptance:
1. Failing test first: after selecting "Daily" and typing "Standup", the dialog text contains "Daily" and "Creates Standup.md in the vault root".
2. With `fsStore.setFileTree` holding `/vault/Standup.md` and `vaultStore` path `/vault`, the hint says "Enter opens the existing note"; Enter still calls `createFileFromTemplate` once (behaviour unchanged).
3. Backspace on the empty input shows the template list again and does not call `createFileFromTemplate`.
4. A name typed with a slash (`a/b`) shows `a/b.md`, not a lie about the folder; existing tests (create, trim, close, empty Enter) pass.
5. Caveat for the ticket: when `fsStore.fileTree` is empty (tree not loaded) the "already exists" hint is simply not shown, never a wrong "Creates".

### P124. Path and format fields have no validation or preview: QUICK-PART (S)

Premise confirmed (`PeriodicNotesSection.svelte:20-131`: plain `Input` for each format and template, no example, no existence hint; `OneOnOneSection.svelte:55-85` likewise).

Ship (one ticket, two Settings sections):
- Periodic Notes: under each Format a muted live example ("Today: Daily/2026-11-18.md") built from the section's own folder, format and today. The formatting goes through a new pure helper in `src/lib/utils/date.ts` (utils may be imported by any layer). It must NOT live in `plugins/periodic-notes/periodic-notes.logic.ts`: `core/settings` importing `plugins/` is a new layer violation that `layer-rules.test.ts` rejects, and `settings-copy.test.ts` forbids the word `dayjs` in a Settings page source, so the Section may not import it directly.
- Under each Template path, and under 1:1 Notes' Template path, a muted "File not found" when the path is non-empty and `findFileNode(fsStore.fileTree, vaultPath, `${vaultPath}/${path}`)` is null (the same path the service reads, `periodic-notes.service.ts:55`). Skipped when no vault is open or the tree is empty.
- The format and template rows use `layout="stacked"` so the hint sits under the field and long paths stop truncating.

Defer: the 1:1 Folder/Filename format examples (they need the 1:1 note builder and the `{person}` substitution; verify it before promising) and Calendar's "Day starts at" (kept as is, per the review's note). P125's table.

Files: `src/lib/core/settings/sections/PeriodicNotesSection.svelte`, `OneOnOneSection.svelte`, `src/lib/utils/date.ts` (+ `src/tests/lib/utils/date.test.ts`), help `19-settings.md` if the section text is quoted. Tests: new `PeriodicNotesSection.test.ts` beside the existing section tests, `OneOnOneSection.test.ts`.

Acceptance:
1. Failing test first: the new date helper formats `YYYY-MM-DD` and a nested `YYYY/MM-MMM/DD` for a fixed date, and returns an "invalid" marker (not a throw) for an empty format.
2. Periodic Notes daily format `YYYY-MM-DD` shows "Daily/2026-11-18.md" for a mocked today; editing the format updates the line.
3. A template path absent from `fsStore.fileTree` shows "File not found"; present, empty, or no vault shows nothing.
4. `settings-copy.test.ts` (no `dayjs` in Settings source, no em dash) and the layer-rules test stay green.
5. The values saved in `settingsStore.periodicNotes` are identical before and after (the hints are display only).

### P125. Periodic Notes repeats five identical blocks: DEFER (M)

Premise confirmed (ten near-identical rows, `PeriodicNotesSection.svelte:34-131`) but the fix is a new table layout that rewrites the whole section and drops the per-row descriptions that help `19-settings.md` and `settings-copy.test.ts` quote. M by the review, and the P124 slice above already adds the information; revisit after it ships and the owner sees whether the length still bothers them.

### P126. The update "Check" button also downloads and installs: QUICK (S)

Premise confirmed. `UpdateSection.svelte:271-273` shows "Check" but `checkForUpdates` (`:164-205`) calls `check_for_update_on_channel` then `plugin:updater|download_and_install` in the same run; progress is text (`:276`); `formatBytes` returns `?` for 0 bytes (`:122-126`). Also `onclick={checkForUpdates}` (`:272`, and Retry `:285`) passes the MouseEvent as `opts`; harmless today (all reads are `undefined`) but the review's "wrap the handler" is right.

Behaviour: label "Check and download" (the install still waits for "Restart to update"; do not change the flow); the downloading state renders a `role="progressbar"` with `aria-valuenow` and an `aria-label` ("Download of update vX"), plus the text; when the size is unknown the text is "Downloading vX: N%" without "(?)" and the bar is indeterminate (no `aria-valuenow`); handlers are `() => checkForUpdates()`.

Files: `src/lib/core/settings/sections/UpdateSection.svelte`; help `19-settings.md:330, 336` (the row is quoted there). Tests: `UpdateSection.restart.test.ts` and `UpdateSection.layout.test.ts` (both look up the button by the text "Check", update them), plus a download-progress test (the mocked `Channel` exposes `onmessage`).

Acceptance:
1. Failing test first: the idle button text is "Check and download".
2. Driving the mocked `Channel` with `Started{contentLength: 1000}` and `Progress{chunkLength: 500}` yields a progressbar with `aria-valuenow="50"` and a name.
3. `Started{contentLength: null}` shows no "?" and a progressbar without `aria-valuenow`.
4. `invoke` is called with `{channel, allowDowngrades: false}` after a click (proves the wrapped handler does not leak the event).
5. The flow tests (ready then Restart, error then Retry, downgrade confirm) pass unchanged except for the label.

### P146. The rule filter borrows collection wording and has two add buttons: QUICK-PART (S)

Premise confirmed. `FilterPanel.svelte:149,162` hard-codes "Add filter" and "This view"; `AutoOrganizeRuleRow.svelte:329,343-351` adds a separate "Add expression" button with an `ml-[6.5rem]` offset. `FilterPanel` is shared with `CollectionView.svelte`, `ViewDialog.svelte` and `RailNoteList.svelte` (tests assert "This view": `FilterPanel.svelte.test.ts:73,81`, `ViewDialog.svelte.test.ts:377,649,692`), so the shared default must not change.

Ship:
- `FilterPanel` gets an optional `viewLabel` prop (default "This view") and an optional `hideAdd` prop; the rule row passes "When" and hides the panel's own button.
- `addFilter` (`FilterPanel.svelte:73-85`) moves to `filter.logic.ts` as a pure exported function so the rule row can call it from its dropdown (the row already imports `createEmptyExpressionRow` and others from there).
- The rule row shows one "Add condition" `DropdownMenu` with "Property filter" and "Expression" (the existing `addExpression`, `:161-165`), replacing the two buttons.

Defer: the shared two-column grid that replaces `ml-[6.5rem]` (pure cosmetics, easiest to do once with the settings-a P70 card restructure).

Files: `FilterPanel.svelte`, `filter.logic.ts`, `AutoOrganizeRuleRow.svelte`. Tests: `FilterPanel.svelte.test.ts`, `filter.logic.test.ts`, `AutoOrganizeRuleRow.test.ts` (it clicks "Add filter" / "Add expression" at `:637,640,651,663,675,729`; update to open the dropdown).

Acceptance:
1. Failing test first: a rule row renders "When" and not "This view"; the Collection and ViewDialog panels still render "This view".
2. One "Add condition" button; its menu has "Property filter" and "Expression"; picking each appends a row of that kind and nothing is saved until the row has a value (existing rule: blank rows never commit).
3. `addFilter` unit tests in `filter.logic.test.ts` (empty groups creates an `and` group; existing group appends to the first).
4. The saved `rule.expression` shapes in the existing row tests are unchanged.

### P147. Property rows pack six controls and unexplained jargon: QUICK-PART (S)

Premise confirmed. `MODE_LABELS` (`AutoOrganizeRuleProperty.svelte:51-56`) are "if missing", "always", "remove", "add to list" with no hint that "always" overwrites; six controls share the row (`:222-352`).

Ship: verb labels "Set if missing", "Always overwrite", "Remove", "Add to list"; each `Select.Item` renders its one-line description under the label (children snippet; `select-item.svelte` supports one); the mode trigger widens from `w-28` to fit "Always overwrite". The stored `mode` values (`if-missing`, `always`, `remove`, `add`) do not change, so no file or migration is involved.

Defer: collapsing the Source and Type choosers behind a caret. It hides the Expression source the owner's recent rules use, adds disclosure state, and the review itself needs an auto-open rule for non-default rows; that is a design call, and it collides with settings-a P70 (card collapse).

Files: `AutoOrganizeRuleProperty.svelte`; help `22-auto-organize.md:68` (names the modes). Tests: `AutoOrganizeRuleRow.test.ts` (the `choose(row, 'Property mode', 'always' | 'remove' | 'add to list')` helper at `:187,219,231,350,370,378` matches by label; update the labels).

Acceptance:
1. Failing test first: the mode menu lists "Set if missing", "Always overwrite", "Remove", "Add to list", each with its description text.
2. Choosing "Always overwrite" calls `onupdate` with `mode: 'always'` (stored value unchanged); same for the other three.
3. A created-note property row (`allowRemove={false}`) still offers no "Remove".
4. A lifecycle key still hides "Add to list".
5. Help `22-auto-organize.md:68` uses the new labels.

### P148. Rule validation errors are not tied to their fields: QUICK (S)

Premise confirmed. At HEAD: name input `AutoOrganizeRuleRow.svelte:288-293` and Move to folder `:402-407` have only placeholders; the create-note path/template errors (`:451-455`, `:463-467`), rename error (`:393-395`), blank filter value (`:352-353`) and property expression error (`AutoOrganizeRuleProperty.svelte:354-355`) are separate paragraphs with no `id`/`aria-describedby`, and no input sets `aria-invalid` although `input.svelte:30` already styles it red.

Behaviour:
- `aria-invalid` and `aria-describedby` (pointing at the message `id`, unique per rule via `rule.id`) on the field that failed: Create note path, Create note template, Rename to, the property expression, and the property key when `isRefusedKey`.
- `aria-label="Rule name"` and `aria-label="Move to folder"` on those two inputs (the neighbouring `<span>` is not a label).
- Messages for states that are really "kept unsaved" lead with "Not saved:" (path, template, rename refusal, expression refusal, blank filter value). Messages for a stored-but-ignored state (a stored rename that `renameProblem` flags, refused key) keep their wording, since "not saved" would be false there.

Files: `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte`. Tests: `AutoOrganizeRuleRow.test.ts` (existing assertions `toContain('not saved')` at `:830,844` must become "Not saved").

Acceptance:
1. Failing test first: typing `notes/bad` into Create note path leaves the input with `aria-invalid="true"` and an `aria-describedby` that resolves to the message element; fixing it removes both.
2. The same for the template path, the rename refusal, and a refused expression in a property row.
3. The name and folder inputs are found by `getByLabel`-style queries ("Rule name", "Move to folder").
4. The "Not saved:" prefix appears on refusals only; a stored invalid rename shows the old text.
5. Nothing about what is saved changes (the existing `onupdate` assertions pass untouched).

Overlap: settings-a P28 (labels vs neighbouring spans) and P152 (property rows keyed by index, which makes per-row error state follow the wrong row) touch the same fields; run P148 with or after them in one worker.

### P149. New rules are added below the fold without focus: QUICK (S)

Premise confirmed. `AutoOrganizeSection.svelte:49-60` adds the rule and saves; the card appends at the end of `autoOrganizeStore.rules` (`:162`); the "Add rule" button is at the top (`:143-149`). `addProperty` (`AutoOrganizeRuleRow.svelte:177-179`) and `addExpression` (`:161-165`) likewise do not move focus.

Behaviour: after "Add rule", the new card scrolls into view (`scrollIntoView({ block: 'nearest' })`) and its name input takes focus (the Section remembers the new id and passes a prop to the row; the row focuses through `bind:ref` on the `Input`). "Add property" and "Add note property" focus the new row's key input; "Add expression" / "Add condition > Expression" focuses the new row's input. Rules still start disabled (`:55-56`, existing test).

Files: `AutoOrganizeSection.svelte`, `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte` (only if the key input needs a hook). Tests: `AutoOrganizeSection.test.ts`, `AutoOrganizeRuleRow.test.ts`. jsdom needs `Element.prototype.scrollIntoView ??= () => {}`, as the existing tests do.

Acceptance:
1. Failing test first: click "Add rule"; `document.activeElement` is the new rule's name input, and `scrollIntoView` was called on its card.
2. The new rule is still `enabled: false` and exactly one rule was added.
3. Clicking "Add property" focuses the new property key input; "Add note property" and the expression add do the same.
4. Rules loaded from the file (mount) do not steal focus on open (only a just-added id does).

### P150. Excluded folders accept anything and give no feedback: QUICK (S)

Premise confirmed (`AutoOrganizeSection.svelte:90-97, 183-216`): the duplicate check is a case-sensitive `includes` that returns silently, but matching is case-insensitive (`auto-organize.logic.ts:875-896`), so "Archive" and "archive" both get in; the placeholder `_templates` reads like a value; nothing checks the folder; an empty list shows nothing.

Behaviour:
- Pure helper in `auto-organize.logic.ts`: `isDuplicateExcluded(list, folder)` case-insensitive after trim; the Section shows "Already excluded" (`aria-live`) and does not add.
- A `<datalist>` of vault-relative folders from `collectAllDirPaths(fsStore.fileTree)` + `getRelativePath` on the input.
- A chip whose folder is not in the tree gets a muted "missing" mark. Guards: no mark when the tree is empty (not loaded), and none for a dot-prefixed folder (the scan skips hidden dirs, `src-tauri/src/commands/vault.rs:111,151`, so they would all read "missing").
- Placeholder "e.g. _templates"; "No excluded folders" when empty; chip remove buttons get `aria-label="Remove <folder>"`.
- What is saved (`excludedFolders`, via `saveConfig`) does not change shape.

Files: `AutoOrganizeSection.svelte`, `auto-organize.logic.ts`. Tests: `AutoOrganizeSection.test.ts` (real `autoOrganizeStore`, real `fsStore`), `auto-organize.logic.test.ts`.

Acceptance:
1. Failing test first: adding "Archive" twice (and then "archive") leaves one chip and shows "Already excluded".
2. With `fsStore.setFileTree` holding `/vault/Archive`, the datalist offers "Archive"; a chip "Old Notes" shows "missing"; "Archive" and ".kokobrain" do not; an empty tree shows no marks.
3. Empty list shows "No excluded folders"; placeholder is "e.g. _templates".
4. Removing a chip by its labelled button works and `autoOrganizeStore.excludedFolders` matches the DOM.

### P151. A legacy "file icon" button duplicates the _icon property: QUICK-PART (S)

Premise confirmed. `AutoOrganizeRuleRow.svelte:408-421` is an unlabelled icon-only button (title "Set file icon") after every Move to folder field, while `_icon` is a property row. The service still applies `rule.icon` (`auto-organize.service.ts:359-364, 666-685`), and the PRD keeps it (`.scratch/frontmatter-rules/PRD.md:43`, "It is kept"); help `22-auto-organize.md:202` already says "Use properties instead".

Ship now: label the button "Legacy icon on move" (visible text or `aria-label`, with the current `pack:name` in the title when set) and add a one-line hint "Prefer an _icon property below" under the field when it is empty. No data change.

Needs an owner OK, so not in the quick scope: hiding the button on rules that do not already set `rule.icon` (the review's proposal). It would remove the only UI path to the legacy icon for new rules; the owner may still use it. Ask once, then it is a one-line `{#if rule.icon}`.

Files: `AutoOrganizeRuleRow.svelte`. Tests: `AutoOrganizeRuleRow.test.ts` (existing "icon picker" describe at `:67`).

Acceptance:
1. Failing test first: the button is found by its accessible name "Legacy icon on move" and still opens the icon picker ("Change icon").
2. A rule without `icon` shows the `_icon` hint; a rule with `icon` shows the set icon and no hint.
3. Choosing and removing an icon still calls `onupdate` with `icon` set or `undefined` (existing tests unchanged).

### P169. The mods list shows load times, not what each mod does: QUICK (S)

Premise confirmed. `mods.logic.ts:216-223` parses `description` into the manifest; `ModStatusEntry` (`mods.store.svelte.ts:4-24`) has no such field; `ModsStatusList.svelte:100-102` renders only name, version and "Loaded · N ms".

Behaviour: `ModStatusEntry.description?: string`; set at the four `upsertEntry` sites that have a manifest or a previous entry (`mods-host.service.ts:758` error, `:843` loaded, `:873` disabled list, `:1126` disableMod keeps `previous?.description`). The list shows it as a muted line under the name; the load time moves to a `title` on the "Loaded" label. Keep the `data-mod-load-ms` attribute and the "< 1" case (tests rely on it, `ModsStatusList.test.ts:117-121`).

Files: `mods.store.svelte.ts`, `mods-host.service.ts`, `ModsStatusList.svelte`; help `28-mods.md:55` (describes "Loaded · 42 ms" in the row). Tests: `ModsStatusList.test.ts`, `mods-host.service.test.ts` (real host, fs mocked), `mods.store.test.ts`.

Dependency: `.scratch/mods-host-robustness` Issues 01-04 are all needs-triage; none edits these sites (they concern math, write guard, note-saved, callbacks). Not a blocker.

Acceptance:
1. Failing test first: a mod whose manifest has `description` shows that text in its row after the host loads it; one without shows no empty line.
2. The description survives disable (row stays, `state: 'disabled'`) and a load error that still had a manifest.
3. The load time is no longer inline text; `title` carries "Loaded in 42 ms" and `data-mod-load-ms` is intact.
4. Help `28-mods.md:55` updated; existing load-ms tests pass.

### P170. The mod run view's status, progress and Stop are not legible: QUICK-PART (S)

Premise partly false. Confirmed: status is one 12 px muted span for all four states (`ModActionPicker.svelte:108`), the progressbar has no name (`:111-117`), the log has no live region (`:128`). False at HEAD: "Stop gives no feedback while the mod finishes". `stop` aborts the signal and the host's abort listener ends the run `cancelled` at once even if the mod's code keeps going (`mods-host.service.ts:378-380, 425-428`; the test "Stop cancels the run and shows Cancelled" asserts the flip, `ModActionPicker.test.ts:204-213`). There is no interval in which "Stopping..." would show, so that part is DROP.

Ship: coloured status label (`text-success` Done, `text-destructive` Failed, muted Running and Cancelled; tokens already used in `UpdateSection.svelte`), `aria-label` on the progressbar built from the run title and progress ("<title>, 3 of 8"), and `role="log"` with `aria-live="polite"` on the log box. Keep the existing `data-mod-run-status` text values (tests read them).

Files: `ModActionPicker.svelte`. Tests: `ModActionPicker.test.ts` (real host).

Acceptance:
1. Failing test first: while a progress-reporting run is live the `[role="progressbar"]` has a non-empty `aria-label` containing the run title.
2. `[data-mod-run-status]` carries the destructive class for Failed and the success class for Done, and neither for Running or Cancelled.
3. The log box has `role="log"`.
4. The existing Stop, focus and Enter-key tests pass unchanged.

### P185. A disabled rule looks almost identical to an enabled one: QUICK (S)

Premise confirmed. The card is one `div` (`AutoOrganizeRuleRow.svelte:285`); only the Switch (`:294-297`) shows `rule.enabled`, and there is no `focus-within` style. New rules start disabled by design (`AutoOrganizeSection.svelte:55-56`), so inputs must keep full opacity.

Behaviour: when `!rule.enabled` the card has `border-dashed` and an "Off" pill (`data-rule-off`) next to the Switch; every card gets `focus-within:border-ring`. No opacity change. Use existing tokens only (the colour slice's P19-P27 contrast work may retune `text-muted-foreground` on a muted pill; keep the pill on `bg-muted text-muted-foreground`, the pattern used by the chips at `AutoOrganizeSection.svelte:205`).

Files: `AutoOrganizeRuleRow.svelte`. Tests: `AutoOrganizeRuleRow.test.ts`.

Acceptance:
1. Failing test first: a rule with `enabled: false` renders `[data-rule-off]` and a dashed card; `enabled: true` renders neither.
2. Toggling the Switch calls `onupdate` with `enabled` and the pill follows when the prop changes (Harness fixture).
3. The inputs of a disabled rule are not `disabled` and have no opacity class.

## Candidate quick tickets

Order matters inside the Auto Organize group: all of T1 to T3 edit `AutoOrganizeRuleRow.svelte` and `AutoOrganizeSection.svelte`; run them in one worker one after another, and sequence them with the settings-a tickets for P28, P66-P70 and P152 (same files; P70 restructures the card). T1 first.

| ticket | contents | files | size |
|--------|----------|-------|------|
| T1 Auto Organize rule card: state, focus, error wiring | P185 + P149 + P148 | `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte`, `AutoOrganizeSection.svelte` | S to M (three small, same-card changes) |
| T2 Auto Organize wording | P146 slice ("When", "Add condition") + P147 slice (verb mode labels) + P151 slice (legacy icon label, hint) | `FilterPanel.svelte`, `filter.logic.ts`, `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte`, help `22-auto-organize.md` | S to M (touches the shared FilterPanel) |
| T3 Auto Organize excluded folders | P150 | `AutoOrganizeSection.svelte`, `auto-organize.logic.ts` | S (could be folded into T1 if the owner wants one fewer ticket) |
| T4 Settings control fixes | P80 + P126 | `TodoistSection.svelte`, `UpdateSection.svelte`, help `19-settings.md` | S |
| T5 Periodic Notes hints | P124 slice | `PeriodicNotesSection.svelte`, `OneOnOneSection.svelte`, `utils/date.ts` | S |
| T6 Mods legibility | P169 + P170 slice | `mods.store.svelte.ts`, `mods-host.service.ts`, `ModsStatusList.svelte`, `ModActionPicker.svelte`, help `28-mods.md` | S |
| T7 Template picker | P81 | `TemplatePicker.svelte` | S |

Owner questions (only one): P151, hide the legacy icon button on rules without an icon (yes/no). Everything else needs no decision.

## Deferred

- P125 (table redesign, M), after T5.
- P146 two-column grid, with settings-a P70.
- P147 chooser collapse, owner call and P70 overlap.
- P151 hide-when-unused, owner call.
- P124 1:1 format examples and Calendar, needs the 1:1 builder checked.
- P170 "Stopping..." DROP (premise false at HEAD).

## Overlaps found

- `.scratch/open-itens` (abandoned): none of the 14 matches an open Issue by title; I did not find one that T1 to T7 fully cover. The orchestrator's sweep may still match by file when listing its Issues.
- Live folders: `.scratch/frontmatter-rules` supplies the rule fields these items polish (Issues 03 filter builder, 08 expressions, 09 create note, 11 rename, 10 mod action); it is a dependency, not a replacement, and has no open Issue for these. `.scratch/mods-host-robustness` Issues 01-04 are unrelated to P169/P170. `.scratch/claude-code-integration` / mvp-claude touch no file here beyond `help/documentation/19-settings.md`.
- Cross-slice: settings-a P28, P66-P70, P152 and P08 share `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte` and `AutoOrganizeSection.svelte` with T1-T3. `FilterPanel.svelte` is shared with the collection slice (P82, P47-P50, P138-P142): the `viewLabel`/`hideAdd` props in T2 must be additive so that slice is unaffected. The `SettingItem` stacked layout used by P80/P124 is a primitive other slices (settings-a P53, P54) also use; nothing here changes the primitive.
- Not checked: the real-window rendering of P80, P185 and the P126 progress bar (jsdom cannot show overlap or colour); `src/tests/help` copy tests for help 19, 22 and 28 after the label edits; and whether `fsStore.fileTree` is always fully loaded for deep folders (P150, P124, P81 rely on it and degrade to "show nothing" when it is empty).
