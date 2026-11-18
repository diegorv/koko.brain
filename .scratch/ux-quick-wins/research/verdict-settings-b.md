# Verdict: settings-b (P80 P81 P124 P125 P126 P146 P147 P148 P149 P150 P151 P169 P170 P185)

Adversarial pass on `scout-settings-b.md`, HEAD `085b23c5d`. Every path:line below was re-read at HEAD. Read-only; nothing was run except `git diff --stat origin/main...origin/mvp-claude` and greps.

mvp-claude overlap re-checked: the branch touches `help/documentation/19-settings.md` (hunks at lines 6 and 261-279), `src/lib/core/settings/settings.{logic,service,store.svelte,types}.ts`, `SettingsPanel.svelte`. No component, logic file or other help page in this slice is on it. P126's help edit (`19-settings.md:330,336`) is in a separate hunk.

The scout missed the cross-slice tickets that settings-a's verdict already owns on the same files (`verdict-settings-a.md` tickets A, B, C). Several parts of this slice are already in them, and the rest must wait for them.

## Summary

| id | scout | final | changed | one line |
|---|---|---|---|---|
| P80 | QUICK | QUICK | no | One attribute; premise confirmed in `screens/settings-todoist-light.png` and `SettingItem.svelte:37` |
| P81 | QUICK | QUICK | no (refined) | The existence check must be case-insensitive (APFS), or the "Creates" hint lies; overlaps open-itens 059, which goes the other way (refuse) |
| P124 | QUICK-PART | QUICK-PART | no (refined) | No new date helper: `formatNow` already exists in `utils/date.ts:15`. The example must show what a create really produces (empty format gives a timestamp, not "invalid"). Blocked by settings-a C (same Section and new test file) |
| P125 | DEFER | DEFER | no | Table rewrite of the section (M) |
| P126 | QUICK | QUICK | no (refined) | The scout's "wrapped handler" acceptance test passes today, so it proves nothing; keep the wrap as a refactor with no test of its own. Scout line numbers are off (button at `:276`, flow at `:167-215`) |
| P146 | QUICK-PART | QUICK-PART | yes (blockers, scope) | Shared `FilterPanel` (4 consumers) is also edited by shell-sidebars-ux 16 (`onClear`, ready-for-agent) and the collection slice. The E2E `auto-organize-flows.spec.ts:29` clicks "Add expression", and help `22-auto-organize.md:82,109` names both buttons. All of these were missed |
| P147 | QUICK-PART | QUICK-PART | no (scope grew) | Missed: `auto-organize.logic.ts:511` error text says `"if missing"` (asserted in 3 test files); help 22 uses the labels at `:68,328,339,341`; the E2E layout test `auto-organize.spec.ts:98-130` must still pass after the mode trigger widens; the `choose` helper matches the whole option text |
| P148 | QUICK | QUICK-PART | yes | The name and folder `aria-label`s are already in settings-a ticket B (P28 part). The "Not saved:" lead must go in the Row markup only, not in `BLANK_VALUE_ERROR`, which the loader's `filterProblem` also returns (`auto-organize.logic.ts:25,41`) |
| P149 | QUICK | QUICK-PART | yes | Focusing a new rule's name input is already settings-a ticket B (P70 part). `scrollIntoView` is redundant because `focus()` scrolls. What is left: focus the new property, note property and expression rows |
| P150 | QUICK | QUICK | no (refined) | The chip remove `aria-label` is already in settings-a ticket A, worded differently. The "missing" mark must compare case-insensitively like `isInExcludedFolder` (`auto-organize.logic.ts:874-896`). Blocked by A |
| P151 | QUICK-PART | QUICK | yes | Hiding the button on rules without `rule.icon` is the owner-validated proposal itself and changes no data. The scout's hint placement contradicts the prototype (`settings-auto-organize.html:663,674`) |
| P169 | QUICK | QUICK | no (flag) | Additive field at the four `upsertEntry` sites. Moving the load time into a tooltip reverses mods-load-time Issue 01 (`59f88c7be`, 2026-11-08). It stays in because the proposal says so and was validated |
| P170 | QUICK-PART | QUICK-PART | no | "Stopping..." DROP confirmed: the abort listener cancels the run at once (`mods-host.service.ts:425-430`) |
| P185 | QUICK | QUICK | no | Card-local classes and a pill; inputs keep full opacity |

DONE: none. Checked at HEAD: `TodoistSection.svelte:122-125` is still inline; `UpdateSection.svelte:276-278` still says "Check"; `ModStatusEntry` (`mods.store.svelte.ts:4-24`) has no `description`; `AutoOrganizeRuleRow.svelte:285` has no disabled styling; `AutoOrganizeSection.svelte:186` placeholder is still `_templates`.

## Per proposal

### P80. Todoist Root project overflows. QUICK (unchanged)
- Verified: `TodoistSection.svelte:120-148` is an inline `SettingItem` holding Button plus `Select.Trigger class="w-44"`; `SettingItem.svelte:37` caps the control box at `max-w-[50%] shrink-0 justify-end`, so wider content spills left over the description (screenshot shows "Load projects" covering the text). `layout="stacked"` exists (`SettingItem.svelte:21-23,31-35`) and is used at `TodoistSection.svelte:77`.
- Refutation attempts: no E2E selects `sync-root` (grep of `e2e/`); unit tests reach the row through `[data-setting="sync-root"]` (`TodoistSection.test.ts:58,168-229`), and that wrapper stays. Help `19-settings.md:254` describes behaviour, not layout. The mvp-claude hunk at `19-settings.md:261-279` is not touched. Nothing found.

### P81. Template picker hides template, silently opens existing files. QUICK (refined)
- Verified: `TemplatePicker.svelte:72-90` naming step shows only the name; `templates.service.ts:55-69` builds `${vaultPath}/${name}.md`; `note-creator.service.ts:86-88` opens an existing file without creating.
- Refutation found: `findFileNode` (`fs.logic.ts:25-39`) is an exact, case-sensitive path match, but `exists()` on APFS is case-insensitive. Typing `standup` while `Standup.md` exists would show "Creates standup.md in the vault root", and Enter then opens `Standup.md`. That is the exact surprise P81 removes. The ticket needs a small pure, case-insensitive lookup (in `templates.logic.ts`), not `findFileNode`.
- A name with `/` creates parent folders (`note-creator.service.ts:97-98`), so "in the vault root" is false for `a/b`. The scout's criterion 4 covers this; keep it.
- Overlap: open-itens 059 (ready-for-agent, abandoned folder) wants `createFileFromTemplate` to refuse a taken name. P81 keeps the open and announces it. These are opposite designs. P81 was validated, so 059 can be closed as wontfix with a pointer once the P81 ticket lands. List it and do not run both.

### P124. Path and format fields have no preview. QUICK-PART (refined)
- Verified: `PeriodicNotesSection.svelte:36-48` and the other periods use plain inline `Input`s; `OneOnOneSection.svelte:76-86` is the template path. The periodic service resolves the template as `${vaultPath}/${templatePath}` (`periodic-notes.service.ts:55`), and 1:1 does the same (`one-on-one.service.ts:87-88`). `readTextFile` failure silently falls back to the inline template (`note-creator.service.ts:52-56`), so a typo is invisible today: the premise holds.
- Corrections: (1) `formatNow(format)` already exists in `utils/date.ts:15-17` with the same plugins `buildPeriodicNotePath` relies on (`utils/date.ts:8-12`, imported by `periodic-notes.logic.ts:2`), so no new helper is needed. The Section never imports dayjs, which keeps `settings-copy.test.ts:56` green. (2) `dayjs().format('')` returns the default ISO timestamp, which is the file a create really makes, so the example must show that and not an "invalid" marker that hides the real behaviour. (3) Today's periodic path uses `dayjs()` with no `startOf` (`periodic-notes.service.ts:65-67`), so "today formatted" is exactly what opens. (4) `scan_vault` skips dot folders (`src-tauri/src/commands/vault.rs:111,151`), so a template under a dot folder would read "File not found" when it exists. Skip the mark for dot-prefixed paths, as P150 does.
- Collision: settings-a ticket C edits `PeriodicNotesSection.svelte` (Auto-pin) and creates `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`. Blocked by C.
- Tension to record, not a blocker: stacking ten rows makes P125's "too long" worse. Keep the stacked layout as the review asks; P125 revisits it.

### P125. Five identical blocks. DEFER (unchanged)
- A table that replaces the section's rows, M by the review; no separable small part (the example line is P124).

### P126. "Check" also downloads and installs. QUICK (refined)
- Verified at HEAD: button `UpdateSection.svelte:276-278`, Retry `:292-294`, flow `:167-215` (check then `plugin:updater|download_and_install` at `:203-206`), `formatBytes` returns `?` at `:123`, progress text `:282`.
- Refutation found: the scout's criterion 4 ("invoke is called with `{channel, allowDowngrades: false}` after a click") passes today. With the MouseEvent as `opts`, `opts.allowDowngrades` and `opts.forceChannel` are `undefined`, so `:170-171` already yields the same call. It is not a failing-first test. The wrap stays as a refactor covered by the existing flow tests.
- Tests that look the button up by the text "Check": `UpdateSection.restart.test.ts:98,115,134,143` and `UpdateSection.layout.test.ts:50`. Updating them is a selector change only.
- Overlaps: open-itens 157 (UpdateSection state lost on remount, M) is not covered and stays open; it later moves this state into a store, and the progressbar markup survives that. feedback-a's verdict adds `select-text` to the Update error span (`:291`). Sequence after it or rebase.

### P146. Rule filter wording and two add buttons. QUICK-PART (changed: blockers and scope)
- Verified: `FilterPanel.svelte:162` "This view", `:204-212` "Add filter"; `AutoOrganizeRuleRow.svelte:329` left label "Filter", `:343-351` "Add expression" with `ml-[6.5rem]`. Consumers: `AutoOrganizeRuleRow`, `CollectionView`, `RailNoteList`, `ViewDialog` (grep `src/lib`).
- Missed by the scout:
  1. shell-sidebars-ux 16 (`issues/16-filters-count-clear-view-triggers.md:9`, ready-for-agent, a live folder) adds an `onClear` prop to `FilterPanel`, and the collection slice restyles its conjunction triggers (`scout-collection.md:130-132`). P146's props must land after both.
  2. E2E `e2e/specs/auto-organize-flows.spec.ts:29` clicks `getByRole('button', { name: 'Add expression' })`. With one dropdown, that becomes open "Add condition", then pick "Expression": two steps, not just a new selector.
  3. Help `22-auto-organize.md:82` ("Click **Add filter**") and `:109` ("click **Add expression** below the builder") must change.
- The prototype puts "When" in the row's label column (`settings-auto-organize.html:711`), replacing "Filter", with no "This view" header. So: the row label says "When", and `FilterPanel` gets one additive optional prop that hides its view header and its own add button for the rule. Moving `addFilter` (`FilterPanel.svelte:73-85`) to `filter.logic.ts` as a pure function keeps all four consumers on one implementation.
- DEFER part: the shared two-column grid that replaces `ml-[6.5rem]` (cosmetic; do it with settings-a P70's card rework).

### P147. Property rows: jargon modes. QUICK-PART (scope grew)
- Verified: `AutoOrganizeRuleProperty.svelte:51-56` labels, mode trigger `w-28` at `:328`, items `:332-339`. `select-item.svelte:32-36` renders `children` when given.
- Missed by the scout:
  1. `auto-organize.logic.ts:511` returns `... so it works only with "if missing"`, which shows under the row as `exprError` (`AutoOrganizeRuleProperty.svelte:354-355`). After the relabel it would name a mode that no longer exists. It is asserted in `auto-organize.logic.test.ts:780-781,1168-1169`, `auto-organize.service.test.ts:268,272` and `AutoOrganizeRuleRow.test.ts:499,510,549`. Change it to `"Set if missing"` (copy in a `.logic.ts`, nothing stored).
  2. Help 22 also names the modes at `:328` ("with **always** or **add to list**"), `:339` and `:341`, not only `:68`. The backtick spellings (`if-missing`, `always`) at `:199,263-264,315,347,365-366` are stored values and stay.
  3. E2E `auto-organize.spec.ts:98-130` checks that no control in a property row overlaps another or ends past the row, that "Property value" is at least 80 px, and that a remove row keeps key and mode on one line. Widening the mode trigger for "Always overwrite" is exactly what that test guards, and jsdom cannot see it. Run it.
  4. The test helper `choose` (`AutoOrganizeRuleRow.test.ts:187-199`) matches an option by its whole `textContent`, so with a description inside every option it finds nothing. Render the label in its own element and match on that.
- DEFER part unchanged: collapsing Source and Type choosers (hides the Expression source, disclosure state, overlaps P70).

### P148. Validation errors not tied to fields. QUICK-PART (changed)
- Verified: `AutoOrganizeRuleRow.svelte:288-293` name input and `:402-407` folder input have no names; error paragraphs `:393-395`, `:451-455`, `:463-467`, `:352-353`, `AutoOrganizeRuleProperty.svelte:354-355,360-364` have no ids; no input sets `aria-invalid`. `input.svelte:30` styles `aria-invalid`.
- Already owned elsewhere: `aria-label` "Rule name" and "Move to folder" are in settings-a ticket B (P28 part). Drop them here.
- Refutation found: `BLANK_VALUE_ERROR` (`auto-organize.logic.ts:25`) is also what `filterProblem` returns (`:41`), and the loader uses that to ignore a stored rule. Prefixing the constant with "Not saved:" would put a false message in logs. Add the prefix in the Row markup only. Help `22:62` quotes "**Every filter needs a value**". Keep that substring, or update the help.
- `pathInvalid` (`:189`) and `templateInvalid` (`:191-193`) are also true for a stored invalid value (hand-edited JSON), and today's "It is not saved." is already false in that case. Use "Not saved:" only for `pathRefused` / `templateRefused`; a stored invalid value says "A run ignores this path". The same split applies to `renameRefusal` versus a stored `renameProblem` (`:232`).
- Property rows need a per-instance id (`$props.id()`), not `rule.id`, so two rows' messages never collide.
- Blocked by settings-a ticket B: same two files, and B's stable property-row keys (P152) are what keep a row's error on the right row.

### P149. New rules below the fold without focus. QUICK-PART (changed)
- Already owned: settings-a ticket B item 5 focuses the new rule's name input after "Add rule" (P70 part). `focus()` scrolls the element into view by default, so a separate `scrollIntoView` adds nothing.
- Left: "Add property" (`AutoOrganizeRuleRow.svelte:435-438`), "Add note property" (`:477-485`) and "Add expression" (`:343-351`, or the P146 menu item) do not move focus. Focus the new row's first input after the store update (`tick()`). The expression row renders inside the shared `FilterRow`, so find it inside `[data-rule-filter]` instead of editing `FilterRow`.
- Writes nothing new: `addProperty` already saves at once (`:177-179` -> `onupdate` -> `AutoOrganizeSection.svelte:62-65` debounced save). Focus does not change that.
- Blocked by settings-a ticket B (B's parallel id array gives the new row a stable key to focus).

### P150. Excluded folders give no feedback. QUICK (refined)
- Verified: `AutoOrganizeSection.svelte:90-97` case-sensitive `includes`; matching is case-insensitive (`auto-organize.logic.ts:874-896`); placeholder `:186`; no empty state `:202`.
- Refutation found: the "missing" mark must compare case-insensitively too, or a working chip `archive` (folder `Archive`) is marked missing. Guards kept: empty tree, dot-prefixed folders.
- Already owned: settings-a ticket A gives the excluded input `aria-label` "Folder to exclude" and each chip remove "Remove <folder> from excluded folders", and rewrites the line above the input. Drop the scout's "Remove <folder>" wording. `settings-controls.test.ts:24` keeps the raw chip button at 1, so no new raw `<button>`. `<datalist>` is not flagged by that scan (`settings-controls.test.ts:30-38`).
- Stored shape unchanged; a refused duplicate is simply not added.
- Blocked by settings-a ticket A.

### P151. Legacy icon button. QUICK (changed)
- Verified: `AutoOrganizeRuleRow.svelte:408-421` unnamed icon button on every rule; `auto-organize.service.ts:359-364,666-685` still applies `rule.icon`; PRD keeps the field.
- Why the whole proposal is QUICK: the review's validated proposal (owner-validated, "revise. No data migration") is to show the button only where `rule.icon` is already set. That is markup only. A rule with an icon keeps the button and its picker (choose, recolour, remove); `handleIconRemove` (`:272-275`) clears it and the button then hides, which is the intended end state. The `_icon` property row (`AutoOrganizeRuleProperty.svelte:279-288`) is the path for new rules, and help `22:202,485` already says "use properties instead".
- The scout's hint "under the field when it is empty" contradicts the prototype, which shows the hint only next to a set legacy icon (`settings-auto-organize.html:663,674`).
- Existing test opens the picker from a rule that has an icon (`AutoOrganizeRuleRow.test.ts:58-99`), so it stays valid.
- Sequence after settings-a ticket B, which names this button with its title; this ticket replaces that name with "Legacy icon on move".

### P169. Mods list shows load time, not purpose. QUICK (flag)
- Verified: `mods.logic.ts:146,216,223` parses `description`; `ModStatusEntry` lacks it (`mods.store.svelte.ts:4-24`); upsert sites `mods-host.service.ts:758,843,873,1126`; row `ModsStatusList.svelte:94-102`.
- Refutation attempts: the field is optional and additive, and every reader of `entries` ignores unknown fields. mods-host-robustness 01-04 touch none of these sites (grep). No E2E reads `data-mod-load-ms` or "Loaded ·".
- Flag: the inline load time was added deliberately on 2026-11-08 (`59f88c7be`, mods-load-time Issue 01, help `28-mods.md:55`). The validated proposal moves it to a tooltip; the ticket does that, rewrites help `:55`, and updates `ModsStatusList.test.ts:116-133`. If the owner wants it inline, the ticket shrinks to the description line.

### P170. Run view status and progress. QUICK-PART (unchanged)
- Verified: status `ModActionPicker.svelte:107` single muted span; progressbar `:109-118` unnamed; log `:125-129` no role. Stop: the abort listener calls `modsRunsStore.cancel(id)` synchronously (`mods-host.service.ts:425-430`), so "Stopping..." has no interval to show in. DROP that part.
- E2E `vault-mods.spec.ts:193,372-395` reads `[data-mod-run-status]` text; keep the text values.

### P185. Disabled rule looks enabled. QUICK (unchanged)
- Verified: card `AutoOrganizeRuleRow.svelte:285`, Switch `:294-297`, rules start disabled `AutoOrganizeSection.svelte:55-56`.
- Refutation attempts: E2E finds the rule switch by `getByRole('switch').nth(1)` (`auto-organize-flows.spec.ts:44`), and a pill is not a switch. Card-local classes, no shared component.
- Sequence after settings-a ticket B (same file).

## Final quick tickets

Order inside Auto Organize: settings-a A and B land first (they own names, rule focus and stable row keys). Then Q1, Q2 and Q3, one at a time, in one worker. Q4 waits for shell-sidebars-ux 16 and the collection FilterPanel ticket. Q5 can run once A is in.

### Q1. Auto Organize rule card: Off state and focus on new rows
- **ids:** P185, P149 (part)
- **Touches:** `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`, `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`
- **Blocked by:** settings-a ticket B.
- **What to build:** when `!rule.enabled`, the card gets `border-dashed` and an "Off" pill (`data-rule-off`, `bg-muted text-muted-foreground`, as the chips at `AutoOrganizeSection.svelte:205`) beside the Switch; every card gets `focus-within:border-ring`; no opacity change. After "Add property", "Add note property" or "Add expression", the new row's first input takes focus once it has rendered.
- **Acceptance criteria:**
  - [ ] Failing test first: a rule with `enabled: false` renders `[data-rule-off]` and a `border-dashed` card; `enabled: true` renders neither, and the pill follows a prop change (Harness).
  - [ ] Failing test: clicking "Add property" leaves `document.activeElement` on the new row's "Property key" input; the same for "Add note property" (on a rule with `createNote`) and for "Add expression" (the new expression input inside `[data-rule-filter]`).
  - [ ] Mounting a rule with existing rows moves no focus.
  - [ ] The inputs of a disabled rule are not `disabled` and carry no opacity class; the `onupdate` payloads in the existing tests are unchanged.
  - [ ] Gate: `pnpm check` + targeted vitest; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes.

### Q2. Auto Organize: tie validation messages to their fields
- **ids:** P148 (part)
- **Touches:** `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte`, `AutoOrganizeRuleRow.test.ts`; help `22-auto-organize.md:62` only if the quoted message changes.
- **Blocked by:** settings-a ticket B; Q1 (same file).
- **What to build:** `aria-invalid="true"` and `aria-describedby` (message id from `$props.id()`) on Create note path, Create note template, Rename to, Property expression, and Property key while `isRefusedKey`. Messages for a refusal kept unsaved (`pathRefused`, `templateRefused`, `renameRefusal`, `exprError`, blank filter value) lead with "Not saved:", added in markup, never in `BLANK_VALUE_ERROR` or `exprProblem`. A stored invalid path, template or rename says that a run ignores it instead of "not saved".
- **Acceptance criteria:**
  - [ ] Failing test first: committing `notes/bad` in Create note path sets `aria-invalid="true"` on it and its `aria-describedby` resolves to an element whose text starts "Not saved:"; committing a valid path removes both.
  - [ ] Failing test: the same for the template path, a refused rename, and a refused expression in a property row; two property rows with refusals have different message ids.
  - [ ] Failing test: a rule loaded with a stored invalid `createNote.path` shows the message without "Not saved:".
  - [ ] `filterProblem` and `exprProblem` return values are unchanged (`auto-organize.logic.test.ts` untouched); `AutoOrganizeRuleRow.test.ts:830,844` updated to the new text.
  - [ ] Gate: `pnpm check` + targeted vitest; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes.

### Q3. Auto Organize: verb mode labels and the legacy icon button
- **ids:** P147 (part), P151
- **Touches:** `AutoOrganizeRuleProperty.svelte`, `AutoOrganizeRuleRow.svelte`, `auto-organize.logic.ts` (the message at `:511` only), tests `AutoOrganizeRuleRow.test.ts`, `auto-organize.logic.test.ts`, `auto-organize.service.test.ts`; help `22-auto-organize.md:68,328,339,341,485`.
- **Blocked by:** Q2 (same files).
- **What to build:** mode labels "Set if missing", "Always overwrite", "Remove", "Add to list". Each option shows its label in its own element plus a one-line description ("Writes only when the note has no value", "Replaces the note's value on every save", "Deletes the property", "Adds items to a list"). The trigger is wide enough for "Always overwrite". Stored `mode` values are unchanged. `exprProblem`'s message names "Set if missing". The legacy icon button renders only when `rule.icon` is set, as an outline button labelled "Legacy icon on move" with the `pack:name` in its title, and next to it a muted hint pointing to the `_icon` property.
- **Acceptance criteria:**
  - [ ] Failing test first: the mode menu offers "Set if missing", "Always overwrite", "Remove", "Add to list", each with its description; choosing "Always overwrite" calls `onupdate` with `mode: 'always'`.
  - [ ] Failing test: a rule without `icon` has no "Legacy icon on move" button; a rule with `icon` has it, it opens the picker ("Change icon"), and the `_icon` hint is shown.
  - [ ] `allowRemove={false}` rows still offer no "Remove"; a lifecycle key still offers no "Add to list".
  - [ ] `exprProblem('now()', 'always')` names "Set if missing"; the three test files are updated, and no stored value or loader rule changes.
  - [ ] The `choose` helper matches on the label element, not the whole option text.
  - [ ] Gate: `pnpm check` + targeted vitest; `bash scripts/e2e.sh auto-organize.spec.ts auto-organize-flows.spec.ts` passes, including "every property row fits its controls side by side inside the rule card".

### Q4. Rule filter reads "When" with one "Add condition"
- **ids:** P146 (part)
- **Touches:** `src/lib/features/collection/toolbar/FilterPanel.svelte`, `filter.logic.ts`, `AutoOrganizeRuleRow.svelte`; tests `FilterPanel.svelte.test.ts`, `filter.logic.test.ts`, `AutoOrganizeRuleRow.test.ts`; `e2e/specs/auto-organize-flows.spec.ts:29`; help `22-auto-organize.md:82,109`.
- **Blocked by:** shell-sidebars-ux 16 (FilterPanel `onClear`), the collection slice's FilterPanel conjunction ticket, Q3.
- **What to build:** `addFilter` moves to `filter.logic.ts` as a pure export taking the groups, the properties and the index; `FilterPanel` calls it unchanged. `FilterPanel` gets one optional prop (default off) that hides its view-section header and its add button; only the rule row sets it. The row's label column reads "When", and one "Add condition" dropdown offers "Property filter" and "Expression", replacing both buttons.
- **Acceptance criteria:**
  - [ ] Failing test first: a rule row renders "When" and neither "This view" nor "Add filter"/"Add expression" buttons; `FilterPanel.svelte.test.ts:73,81` and the ViewDialog tests still find "This view".
  - [ ] Failing test: "Add condition" > "Property filter" adds a filter row and "Expression" adds an expression row; a blank row is not saved (`rule.expression` unchanged until a value is typed).
  - [ ] `filter.logic.test.ts`: `addFilter` on `[]` makes one `and` group; on existing groups it appends to the first, leaving the others untouched.
  - [ ] The E2E step at `auto-organize-flows.spec.ts:29` opens "Add condition" and picks "Expression"; the spec passes, as do `rail-shell.spec.ts:661-712` and `rail-list-toolbar.spec.ts:237` (other consumers).
  - [ ] Gate: `pnpm check` + targeted vitest + those E2E specs.

### Q5. Excluded folders: suggestions, duplicate and missing marks
- **ids:** P150
- **Touches:** `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `auto-organize.logic.ts`; tests `AutoOrganizeSection.test.ts`, `auto-organize.logic.test.ts`.
- **Blocked by:** settings-a ticket A (same section, names and copy).
- **What to build:** a pure `isDuplicateExcluded(list, folder)` (trimmed, case-insensitive). A duplicate is not added and "Already excluded" shows in an `aria-live` line. The input gets a `<datalist>` of vault-relative folders (`collectAllDirPaths` + `getRelativePath`, `fs.logic.ts:276,297`). A chip whose folder is not in the tree (case-insensitive; skipped when the tree is empty or the folder is dot-prefixed) shows a muted "missing". Placeholder "e.g. _templates"; "No excluded folders" when the list is empty.
- **Acceptance criteria:**
  - [ ] Failing test first: adding "Archive", then "Archive" and "archive", leaves one chip and shows "Already excluded"; `autoOrganizeStore.excludedFolders` is `['Archive']`.
  - [ ] Failing test: with `fsStore.setFileTree` holding `/vault/Archive`, the datalist offers "Archive"; chips "Old Notes" show "missing", "archive" and ".kokobrain" do not; an empty tree shows no marks.
  - [ ] Failing test: an empty list shows "No excluded folders"; the placeholder is "e.g. _templates".
  - [ ] `isInExcludedFolder` is unchanged; `settings-controls.test.ts` still counts one raw button in the section.
  - [ ] Gate: `pnpm check` + targeted vitest.

### Q6. Settings: Todoist root row layout and the update button
- **ids:** P80, P126
- **Touches:** `src/lib/features/todoist-sync/TodoistSection.svelte`, `src/lib/core/settings/sections/UpdateSection.svelte`; tests `TodoistSection.test.ts`, `UpdateSection.restart.test.ts`, `UpdateSection.layout.test.ts`, a new download-progress case; help `19-settings.md:330,336`.
- **What to build:** the Root project row uses `layout="stacked"`. The update button reads "Check and download" and the install still waits for "Restart to update". The downloading state renders a `role="progressbar"` named "Download of update v<version>", with `aria-valuenow` when the size is known, plus text without "(?)" when it is not. Check and Retry handlers become `() => checkForUpdates()`.
- **Acceptance criteria:**
  - [ ] Failing test first: the `sync-root` row's `SettingItem` root has `flex-col` and no control box with `max-w-[50%]` (assertion style of `SettingItem.test.ts:41-55`); the Load projects, choose and load-error tests pass unchanged.
  - [ ] Failing test: the idle button text is "Check and download".
  - [ ] Failing test: driving the captured `Channel` with `Started{contentLength: 1000}` then `Progress{chunkLength: 500}` gives a named progressbar with `aria-valuenow="50"`; `Started{contentLength: null}` gives no "?" and no `aria-valuenow`.
  - [ ] Existing flow tests (ready then Restart, error then Retry, downgrade confirm) pass with only the label lookup changed. The handler wrap has no test of its own because the current code makes the same call.
  - [ ] A real-window check at 1440 px shows the Root project row with no overlap (jsdom cannot); state it in the commit.
  - [ ] Gate: `pnpm check` + targeted vitest.

### Q7. Periodic Notes and 1:1: live path examples and missing-template marks
- **ids:** P124 (part)
- **Touches:** `src/lib/core/settings/sections/PeriodicNotesSection.svelte`, `OneOnOneSection.svelte`; tests `PeriodicNotesSection.test.ts` (created by settings-a C), `OneOnOneSection.test.ts`.
- **Blocked by:** settings-a ticket C.
- **What to build:** the format and template rows use `layout="stacked"`. Under each Format, a muted "Today: <folder>/<formatNow(format)>.md", built the way `buildPeriodicNotePath` joins folder and name. Under each periodic Template path and the 1:1 Template path, a muted "File not found" when the path is non-empty, a vault is open, the tree is loaded, the path has no dot-prefixed segment, and `findFileNode(fsStore.fileTree, vault, `${vault}/${path}`)` is null. Display only; no dayjs import in either Section.
- **Acceptance criteria:**
  - [ ] Failing test first: with system time 2026-11-18 and folder `Daily`, daily format `YYYY-MM-DD` shows "Today: Daily/2026-11-18.md"; editing the format updates the line; the line equals `buildPeriodicNotePath('', folder, format, dayjs())` without the leading slash, asserted in the test.
  - [ ] Failing test: a template path absent from `fsStore.fileTree` shows "File not found"; present, empty, dot-prefixed, no vault, or empty tree shows nothing; same for 1:1.
  - [ ] `settingsStore.periodicNotes` and `oneOnOne` values are identical before and after rendering; `settings-copy.test.ts` (no `dayjs`, no em dash, quoted copy) and `layer-rules.test.ts` stay green.
  - [ ] Gate: `pnpm check` + targeted vitest.

### Q8. Mods: show what each mod does, legible run status
- **ids:** P169, P170 (part)
- **Touches:** `src/lib/plugins/mods/mods.store.svelte.ts`, `mods-host.service.ts` (four object literals), `ModsStatusList.svelte`, `ModActionPicker.svelte`; tests `ModsStatusList.test.ts`, `mods-host.service.test.ts`, `ModActionPicker.test.ts`; help `28-mods.md:54-55`.
- **What to build:** `ModStatusEntry.description?: string`, set from the manifest at `mods-host.service.ts:758,843,873` and from `previous?.description` at `:1126`; shown as a muted line under the name. The load time moves to a `title` on the state label ("Loaded in 42 ms", "< 1 ms" kept), and `data-mod-load-ms` stays. In the run view, the status is coloured (`text-success` Done, `text-destructive` Failed, muted otherwise) with the text unchanged; the progressbar gets an `aria-label` "<title>, <done> of <total>"; the log box gets `role="log"`.
- **Acceptance criteria:**
  - [ ] Failing test first (real host, fs mocked): a mod whose manifest has `description` shows it in its row after load; without one, no empty line.
  - [ ] Failing test: the description survives `disableMod` and a load error that had a manifest.
  - [ ] Failing test: the row text no longer contains "Loaded · 42 ms"; the state label's `title` is "Loaded in 42 ms"; `data-mod-load-ms="42"` is intact.
  - [ ] Failing test: during a progress run the progressbar's `aria-label` contains the run title; `[data-mod-run-status]` carries the destructive class on Failed and the success class on Done, and has the text "Done" / "Failed" as before; the log has `role="log"`.
  - [ ] Stop, focus and Enter-key tests pass unchanged; `bash scripts/e2e.sh vault-mods.spec.ts` passes.
  - [ ] Gate: `pnpm check` + targeted vitest.

### Q9. Template picker names the template and the outcome
- **ids:** P81
- **Touches:** `src/lib/plugins/templates/TemplatePicker.svelte`, `templates.logic.ts` (one pure lookup); tests `TemplatePicker.test.ts`, `templates.logic.test.ts`.
- **What to build:** in the naming step, a chip with the chosen template's name; the hint reads "Creates <name>.md in the vault root" (with the folder part shown as typed when the name has a `/`), or "Enter opens the existing note" when a file with that vault-relative path exists, matched case-insensitively against `fsStore.fileTree` (a pure function in `templates.logic.ts`). Backspace on an empty name returns to the template list with the dialog open. `createFileFromTemplate` is unchanged.
- **Acceptance criteria:**
  - [ ] Failing test first: after selecting "Daily" and typing "Standup", the dialog shows "Daily" and "Creates Standup.md in the vault root".
  - [ ] Failing test: with the tree holding `/vault/Standup.md`, typing "standup" shows "Enter opens the existing note"; Enter still calls `createFileFromTemplate` once with the typed name.
  - [ ] Failing test: Backspace on the empty input shows the template list again, the dialog stays open, and nothing is created.
  - [ ] An empty tree never shows "opens the existing note"; existing tests (create, trim, close, empty Enter) pass.
  - [ ] Gate: `pnpm check` + targeted vitest.

## Deferred

- P125: one-table Periodic Notes layout; rewrites the section (M), revisit after Q7.
- P146 (rest): shared two-column label grid replacing `ml-[6.5rem]`; do it with settings-a P70's card rework.
- P147 (rest): collapse Source/Type choosers at defaults; hides the Expression source, adds disclosure state, overlaps P70.
- P124 (rest): 1:1 Folder/Filename format examples (need the `{person}` substitution path verified) and Calendar "Day starts at" (kept by the review).
- P170 "Stopping...": DROP, the run ends cancelled synchronously on Stop (`mods-host.service.ts:425-430`).

## Overlaps to record

- open-itens 059 (ready-for-agent): opposite design to P81 (refuse versus announce). Q9 covers the "silently" complaint; mark 059 wontfix with a pointer to Q9 once Q9 lands. Do not run both.
- open-itens 157 (UpdateSection state on remount, M): not covered by Q6; stays open, same file, run after Q6.
- open-itens 226 (help 08 unescaped formats): not covered; Q7's live example will show the wrong path for such formats, which helps the owner see it.
- settings-a A (P28/P68/P66/P08 parts), B (P28/P69/P70/P152 parts), C (P53 part): own the names, rule focus, stable row keys and the PeriodicNotesSection test file that Q1, Q2, Q3, Q5 and Q7 build on.
- shell-sidebars-ux 16 (ready-for-agent): `FilterPanel` `onClear`; Q4 waits for it. The collection slice's FilterPanel conjunction ticket too.
- feedback-a: `select-text` on UpdateSection's error span; the Undo toast in `AutoOrganizeSection.svelte`. Sequence Q5 and Q6 with them.
- mods-load-time Issue 01 (`59f88c7be`): Q8 moves its inline load time to a tooltip, as the validated proposal says.
