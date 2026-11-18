# Scout: settings-a (Settings shell, Auto Organize, Todoist chip)

Slice: P08 P28 P66 P67 P68 P69 P70 P152 P51 P52 P53 P54 P79. Prototype: `.scratch/design-review/prototypes/settings-auto-organize.html`. HEAD `085b23c5d`. Read-only research; every call below was checked against the code at HEAD.

Claude MVP overlap (`git diff --stat origin/main...origin/mvp-claude`): the branch edits `src/lib/app/SettingsPanel.svelte` (import, icon map and component map, 4 lines), `src/lib/core/settings/settings.logic.ts` (one entry in `SETTINGS_SECTION_GROUPS`), `settings.types.ts`, `settings.store.svelte.ts`, `settings.service.ts`, `AppShell.svelte`, `commands.ts` and `help/documentation/19-settings.md`. It does NOT touch `SettingItem.svelte`, any `sections/*.svelte`, `features/auto-organize/*` or `features/todoist-sync/*`.

## Summary table

| id | call | size | one-line reason |
|---|---|---|---|
| P08 | QUICK-PART | S | Ship only the failed-save toast in `AutoOrganizeSection.saveConfig`; the loader reset / blocked save is DEFER (config file write path, open-itens 031) |
| P28 | QUICK-PART | S | Name and click-toggle every `SettingItem` control from inside `SettingItem.svelte`, plus aria-labels on the Auto Organize row controls; checkbox property in `PropertyField` waits for shell-sidebars-ux 04/10/11 |
| P51 | DEFER | S | Only reason: `SettingsPanel.svelte` is also edited by `mvp-claude` (hunks are disjoint); promote to QUICK once mvp-claude merges or the owner waives the rule |
| P52 | DEFER | S | Needs the owner's "if wanted" decision, adds a field, and shares the `SETTINGS_SECTION_GROUPS` array and `SettingsPanel.svelte` with mvp-claude |
| P53 | QUICK | S | Disable Auto-pin while Auto-open is off and the log-dependent Troubleshooting switches while their log option is off; markup only |
| P54 | QUICK | S | Number fields write on input only when finite and in range, clamp on change; Editor, File History and Auto Organize debounce; absorbs open-itens 201 |
| P66 | QUICK-PART | S | Ship the "Auto Organize is off, N types set an archive folder" hint with an Enable button; the read-only "From your types" group is DEFER |
| P67 | DEFER | L | "Apply to N notes" bulk-moves and renames vault files and adds an Undo toast: write/move path, risky |
| P68 | QUICK | S | Copy only; the current text ("move", "first match determines the destination") is wrong against `evaluateAndMove` |
| P69 | QUICK-PART | S | Show the 7 variables and warn on unknown `{var}` in the destination, create-path and rename-name fields; the Insert menu, live preview and folder suggestions are DEFER |
| P70 | DEFER | L | Collapsible rule cards restructure the whole `AutoOrganizeRuleRow` layout and add expand state |
| P152 | QUICK | S | Premise true: rows are `(i)`-keyed, so refused-expression state follows the wrong row; key by a non-persisted id |
| P79 | QUICK-PART | S | Make the chip a button that opens the existing sync log; "Sync now and last error at the top of the log" is DEFER. Owner does not use Todoist, so lowest value |

No DONE and no DROP in this slice: nothing here was built by finders-ux, shell-sidebars-ux, tasks-view-ux, frontmatter-rules or vault-organization-v2 (checked their issue lists and ledgers).

## Per-proposal detail

### P08. Unreadable auto-organize config reset then overwritten; save failures silent
Premise true. `auto-organize.service.ts:113-116` (`catch` sets `DEFAULT_CONFIG` on a parse failure), `:186-200` (`saveAutoOrganizeConfig` writes whatever the store holds), `AutoOrganizeSection.svelte:33-39` (`saveConfig` only logs the rejection).
- **Call: QUICK-PART (S).** Quick slice: a failed save shows `toast.error('Could not save auto-organize rules')`. UI only, the write path does not change.
- **DEFER part:** `loadError`, the banner, Reveal file / Retry and blocking `saveConfig` change the loader and the write path of a vault file (`.kokobrain/auto-organize-rules.json`), which holds the owner's rules. open-itens 031 (and 079, 082) is the same fix; it is the highest-value DEFER in this slice because it protects the rule set, so schedule it as its own ticket with a real-file test.
- **Behaviour change:** in `saveConfig`, the `.catch` also calls `toast.error(...)` with a fixed toast id so a burst of debounced saves shows one toast.
- **Files:** `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`.
- **Test seam:** mock the side-effect service `saveAutoOrganizeConfig` (rejecting) and `svelte-sonner`; real `autoOrganizeStore`, `settingsStore`, `vaultStore` (set a path).
- **Acceptance:** see ticket A.

### P28. Controls labelled by a neighbouring span
Premise true. `SettingItem.svelte:25-27` renders `<span>`s; the control column (`:37`) is an unnamed div. 93 `<SettingItem>` uses in 19 files. `TroubleshootingSection.svelte:59,116` already hand-add `aria-label`; the rest do not. `PropertyField.svelte:124-132` wraps the checkbox and a `String(value)` span in one `<label>`, so the checkbox is named "true".
- **Call: QUICK-PART (S).**
- **Behaviour change (SettingItem):** the label and description spans get ids from `$props.id()`. After mount, when the control column holds exactly one control that has no `aria-label` / `aria-labelledby` (a `role=switch` button, an `input`, or a `role=combobox` trigger), SettingItem sets `aria-labelledby` to the label id and `aria-describedby` to the description id on it. A click on the row's text block (label or description) clicks the single `role=switch` in the column. Rows with several controls (Input + Browse, theme rows) are left alone, so no wrong control is ever toggled. No caller changes. Alternative the builder may prefer: a Svelte context read by the shadcn `Switch`; rejected here because `components/ui/` is generated.
- **Behaviour change (Auto Organize rows):** add `aria-label` to the controls that have none: rule name input ("Rule name"), the rule enable Switch ("Enable rule"), the three icon buttons ("Move rule up", "Move rule down", "Delete rule"), the destination input ("Move to folder"), the Excluded folders input ("Folder to exclude") and each folder chip's remove button ("Remove <folder> from excluded folders").
- **DEFER part:** the `PropertyField` checkbox named by its key. `PropertyField.svelte` and its test are edited by shell-sidebars-ux 04, 10 and 11 (all `todo`, chained). Add the one-line `aria-label={property.key}` after 11 lands.
- **Files:** `src/lib/core/settings/sections/SettingItem.svelte`, `src/tests/lib/core/settings/SettingItem.test.ts` (+ its harness), `AutoOrganizeRuleRow.svelte`, `AutoOrganizeSection.svelte` and their tests.
- **Test seam:** real mounted components with the real bits-ui Switch (no mocks). Builder must confirm in jsdom that bits-ui does not overwrite the added attributes on re-render.
- **Risk:** the effect mutates a child's attributes; keep it idempotent and only set when absent.
- **Acceptance:** see tickets B and C.

### P51. The Settings title scrolls out of view
Premise true. `SettingsPanel.svelte:122` the `<nav>` is `overflow-y-auto` and contains the h-14 band (`:125`) and the group list.
- **Call: DEFER (S).** Only reason: file overlap with `mvp-claude`. The overlapping hunks (lines ~12-60 imports and maps) do not touch the nav template at 122-146, so it rebases cleanly; if the owner waives the rule for disjoint hunks this is a ready QUICK ticket (F below). Also note the prototype title says "and the active nav item" while review.md only mentions the title; the ticket should pin the band and keep the list scrolling.
- **Files:** `src/lib/app/SettingsPanel.svelte`, `src/tests/lib/core/settings/settings-headings.test.ts` or a new SettingsPanel test; E2E `e2e/specs/settings.spec.ts` heights stay as they are (the band keeps h-14).

### P52. No search across the 19 settings sections
Premise true (`SettingsPanel.svelte:122-146`, `settings.logic.ts:255-300`). review.md says "If wanted".
- **Call: DEFER (S).** New feature that needs the owner's yes, a keyword list per section, and edits `SETTINGS_SECTION_GROUPS` right where mvp-claude adds the Claude Code entry (real conflict risk) plus `SettingsPanel.svelte`.

### P53. Dependent settings never disabled
Premise true. `PeriodicNotesSection.svelte:58-63` Auto-pin has no `disabled`; `autoOpenDailyNote` and `refreshDailyNoteIfDateChanged` return at once when `autoOpen` is false (`periodic-notes.service.ts:93-95, 130-132`). In `TroubleshootingSection.svelte`: heartbeat and profiling need a log session (`appendLog` writes only when `isLogSessionActive()`, which either "Save debug log to file" or "Save Tauri log to file" starts); mod run messages are written only when `debugModRunMessages && debugLogToFile` (`mods-host.service.ts:445`), so that one needs the frontend log option specifically.
- **Call: QUICK (S).** Review says Todoist and Sentry stay out; keep that.
- **Behaviour change:** `Switch disabled` on Auto-pin while `daily.autoOpen` is falsy; on Save mod run messages while `!debugLogToFile`; on Heartbeat and Profile decoration plugins while `!(debugLogToFile || debugTauriLogToFile)`. Stored values are never changed. Descriptions keep their "requires ..." text. The switch stays disabled even when its stored value is true (the parent switch is the way out, so the user is never stuck).
- **Files:** `PeriodicNotesSection.svelte`, `TroubleshootingSection.svelte`, `src/tests/lib/core/settings/TroubleshootingSection.test.ts`, new `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`.
- **Test seam:** real `settingsStore`; mock only Tauri / log services already mocked by the existing Troubleshooting test.
- **Acceptance:** see ticket C.

### P54. Number fields apply unclamped values on every keystroke
Premise true. `EditorSection.svelte:98-100, 119-121, 140-142, 163-165` write `Number(value)` on input (empty gives 0, so font size 0 or content width 0 reach `MarkdownEditor`); `AutoOrganizeSection.svelte:134-137` writes the clamped debounce on every keystroke, so clearing the field snaps it to 0.5; `FileHistorySection.svelte:38-41` does the same for Retention days (not in P54's evidence, but the same bug and open-itens 201).
- **Call: QUICK (S).**
- **Behaviour change:** `oninput` writes only when the parsed value is finite and in the field's range (font size 8-32, line height 1-3, paragraph spacing 0-2, content width 0 or 400-2000, debounce 500-30000 ms, retention 1-365); otherwise it writes nothing. `onchange` clamps and writes the clamped value and puts it back in the field (Svelte skips the DOM write when the bound value did not change); an empty or non-numeric commit writes nothing and restores the stored value. Valid typed values still preview live, so the earlier "raw for live preview" intent is kept.
- **Existing tests that change on purpose:** `EditorSection.test.ts` asserts the store holds the raw `999` / `1` / `9` after typing ("Raw while typing is deliberate"). Those assertions become "unchanged until commit"; the commit assertions stay. State this in the commit message, it is a changed contract, not a weakened check.
- **Files:** `EditorSection.svelte`, `FileHistorySection.svelte`, `AutoOrganizeSection.svelte` (debounce block only), `settings.logic.ts` only if a shared `inRange` helper is wanted (not touched by mvp-claude in that area; `clamp*` helpers live at lines 54-70), tests `EditorSection.test.ts`, new `FileHistorySection.test.ts`, `AutoOrganizeSection.test.ts`.
- **Test seam:** real stores and components, `type()` / `commit()` helpers as in `EditorSection.test.ts`.
- **Acceptance:** see ticket D.

### P66. Type archive rules invisible, gated by a master switch that is off by default
Premise true. `settings.store.svelte.ts:110-112` default `autoOrganize.enabled: false`; `auto-organize.service.ts:211` returns when disabled, so `toggleActiveNoteArchived` (`lifecycle.service.ts:88-92`) marks the note and nothing moves it; lifecycle rules come only from `generateLifecycleRules` (`type-lifecycle-rules.ts:22-62`).
- **Call: QUICK-PART (S).**
- **Behaviour change:** in `AutoOrganizeSection`, under the Enable row, when `!settingsStore.autoOrganize.enabled` and at least one entry of `typeDefinitionsStore.typeMetadataMap` has `archiveTo`, show a warning block "Auto Organize is off" with "N of your types set an archive folder. While this is off, Archive marks a note as archived but does not move it." and an "Enable Auto Organize" button that runs the exact toggle handler (`updateAutoOrganize({ enabled: true })` + `toggleAutoOrganizeHook(true)`; extract the handler so the switch and the button share it). No block when enabled or when no type sets `archiveTo`.
- **DEFER part:** the read-only "From your types" group listing generated rules (layout and wording need a design pass; M).
- **Files:** `AutoOrganizeSection.svelte`, `AutoOrganizeSection.test.ts`.
- **Test seam:** real `typeDefinitionsStore.setTypeMetadataMap`, real `settingsStore`; mock only `toggleAutoOrganizeHook`'s service module (side-effect registration).
- **Acceptance:** see ticket A.

### P67. Rules run only on save; no apply-to-existing, no record
- **Call: DEFER (L).** "Apply to N notes" moves and renames many vault notes through the move/rename and link-rewrite paths (`docs/agents/indexing-watcher-rules.md`) and adds Undo toasts. Owner's data, large, risky.

### P68. Auto Organize copy describes "move" and "first match"
Premise true. `AutoOrganizeSection.svelte:112` ("Automatically move notes to folders based on rules when saved") and `:151-154` ("The first matching rule determines the destination folder"). Real semantics, `auto-organize.service.ts:283-290` and `auto-organize.logic.ts:171`: first matching rule renames, first with a destination moves, first with a mod action runs it; every matching rule sets its properties and creates its notes; lifecycle rules are appended after the user rules. `help/documentation/22-auto-organize.md:43` already says this correctly, so no docs edit is needed.
- **Call: QUICK (S).** Copy only.
- **Behaviour change:** toggle description becomes "After a save, applies the rules below and the archive rules of your types: notes are moved, renamed or updated automatically." (prototype wording). Help paragraph becomes "Rules run top to bottom after a save. The first matching rule wins for rename, move to folder and run mod action. Set properties and create note apply from every matching rule. Your types' archive rules run last. Conditions use the same syntax as Collection filters, e.g. `file.hasTag('archive')`." The prototype's effect table is optional and left out.
- **Files:** `AutoOrganizeSection.svelte`, `AutoOrganizeSection.test.ts`. Check `src/tests/lib/core/settings/settings-copy.test.ts` (it scans settings copy) still passes; no em-dashes.
- **Acceptance:** see ticket A.

### P69. Destination field hides its template variables; typo creates a literal folder
Premise true. `AutoOrganizeRuleRow.svelte:401-407` has only a placeholder; `auto-organize.logic.ts:936-971` `resolveDestination` keeps an unknown `{var}` literally (`vars[key] ?? match`) and the service then `mkdir`s it (`auto-organize.service.ts` move block).
- **Call: QUICK-PART (S).**
- **Behaviour change:** new pure `unknownTemplateVariables(template: string): string[]` in `auto-organize.logic.ts` plus an exported `TEMPLATE_VARIABLES` list (`folder`, `parent`, `basename`, `type`, `status`, `year`, `month`), using `Object.hasOwn` semantics. The Row shows, under "Move to folder", a muted line "Variables: {folder} {parent} {basename} {type} {status} {year} {month}" while the field has no unknown variable, and a destructive-styled line "{yaer} is not a variable, so a folder literally named {yaer} would be created" when it has one. The same unknown-variable line also appears under Create note path and Rename (Name mode), because they call the same `resolveDestination`. Warning only, nothing is blocked or rewritten.
- **DEFER part:** the Insert variable menu, live preview of the resolved folder and folder suggestions (M; preview needs a sample note and design).
- **Observation, not for this ticket:** `vars[key]` in `resolveDestination` would resolve `{constructor}` or `{toString}` to a function string. The new helper must not repeat it; do not change `resolveDestination` in this ticket.
- **Files:** `auto-organize.logic.ts`, `AutoOrganizeRuleRow.svelte`, `auto-organize.logic.test.ts`, `AutoOrganizeRuleRow.test.ts`.
- **Test seam:** pure function test plus a test that every name in `TEMPLATE_VARIABLES` resolves through the real `resolveDestination` to something that is not the literal `{name}` (guards drift); mounted Row with real stores.
- **Acceptance:** see ticket B.

### P70. Each rule is a flat, always-expanded form
- **Call: DEFER (L).** Collapse/expand state, per-effect visibility, "Add action" and focus handling rebuild `AutoOrganizeRuleRow.svelte` (550 lines); P69 and P152 should land first because P70 moves their markup.

### P152. Property rows keyed by index
Premise true by Svelte semantics: `AutoOrganizeRuleRow.svelte:427` and `:468` use `{#each ... (i)}`, so after a remove the component at index `i` keeps its `exprError` and `refusedExpr` (`AutoOrganizeRuleProperty.svelte` state) while receiving the next property. A later mode change then saves the stale `refusedExpr` as that property's expression.
- **Call: QUICK (S).**
- **Behaviour change:** rows are keyed by a stable client-side id kept in a module-level `WeakMap<RuleProperty, string>` in the Row. A row gets an id on first render; `setProperties` / `setCreateProperties` carry the old row's id over to the edited object, so editing does not remount (drafts survive), while removing a row drops only its id. Ids are never persisted (the objects saved to JSON are unchanged).
- **Files:** `AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleRow.test.ts`.
- **Test seam:** mounted Row with real stores; no mocks.
- **Acceptance:** see ticket B.

### P79. The Todoist status chip is not actionable
Premise true. `TodoistSyncStatus.svelte:17-30` is a `<span>` with the error only in `title`; the log opens only from the palette (`commands.ts:275-284`, `showSyncLog()` in `sync-log.service.ts:19-30`). Owner context: no external sync in use (memory: owner-feature-usage), so this is the lowest value item; open-itens 072 (the Todoist visibility Issue) is already wontfix.
- **Call: QUICK-PART (S).** Quick slice: render the chip as a `<button type="button">` that calls `showSyncLog()`, keep `data-todoist-sync-status`, text and title, add `aria-label` from the label text.
- **DEFER part:** "Sync now" button and last error at the top of `TodoistSyncLogDialog.svelte` (M, dialog restructure).
- **Files:** `TodoistSyncStatus.svelte`, `src/tests/lib/features/todoist-sync/TodoistSyncStatus.test.ts`.
- **Test seam:** mock `todoist_read_log` via the Tauri `call`; real `todoistSyncStore`, assert `todoistSyncStore.logOpen` becomes true. Never mock the store.
- **Recommendation:** do not ticket separately; fold into a later status-bar or Todoist batch, or skip.

## Candidate quick tickets

### A. Auto Organize section: honest copy, archive-off hint, save-failure toast, named controls (P68, P66 part, P08 part, P28 part)
One component: `AutoOrganizeSection.svelte` (+ `AutoOrganizeSection.test.ts`). Size S. Acceptance criteria:
1. Failing test first: the Enable row description and the rules help text mention that the first match wins for rename, move and mod action, that every match applies for set properties and create note, and that type archive rules run last (fails on today's "determines the destination folder" copy).
2. Failing test: with `enabled=false` and a type whose `archiveTo` is set, the "Auto Organize is off" block shows the count and its Enable button turns `settingsStore.autoOrganize.enabled` on and removes the block; with `enabled=true`, or no type with `archiveTo`, no block renders.
3. Failing test: with a vault path set and `saveAutoOrganizeConfig` rejecting, adding a rule calls `toast.error('Could not save auto-organize rules')` once.
4. Failing test: the Excluded folders input and each chip remove button have an accessible name that includes the folder.
5. `pnpm check` and `pnpm vitest run` pass; no change to `auto-organize.service.ts` or the config file format.
Absorbs for the owner's list: nothing in open-itens fully (031 stays open for the loader part).

### B. Auto Organize rule row: variable help, stable property rows, named controls (P69 part, P152, P28 part)
Files: `AutoOrganizeRuleRow.svelte`, `auto-organize.logic.ts` (one pure function and a constant), tests. Size S. Acceptance criteria:
1. Failing test first (`auto-organize.logic.test.ts`): `unknownTemplateVariables('{folder}/{yaer}')` is `['yaer']`, `'{folder}/_archive/{year}'` is `[]`, `'plain'` is `[]`, `'{constructor}'` is `['constructor']`; and each `TEMPLATE_VARIABLES` name resolves via the real `resolveDestination` to a value that is not the literal `{name}`.
2. Failing test (`AutoOrganizeRuleRow.test.ts`): typing `{yaer}` into Move to folder shows the unknown-variable message naming it, a valid template shows the variables list, and the saved `destination` is unchanged either way.
3. Failing test: a rule with two set-property rows where row 0 shows a refused-expression error; removing row 0 leaves row 1 with no error and its own key and value.
4. Failing test: after an edit of a row's key, the row's input keeps focus/draft (no remount) and the saved JSON of the rule contains no id field.
5. Failing test: the rule name input, enable switch and the move up, move down and delete buttons have accessible names.
6. Gate: `pnpm check` and `pnpm vitest run`. Note shell-sidebars-ux 16 (todo) adds one assertion to the same test file; keep edits additive.

### C. Settings rows: named controls and dependent switches (P28 SettingItem part, P53)
Files: `SettingItem.svelte`, `PeriodicNotesSection.svelte`, `TroubleshootingSection.svelte`, tests. Size S. Acceptance criteria:
1. Failing test first (`SettingItem.test.ts`): a row with a Switch child gives the switch `aria-labelledby` = the label's id and `aria-describedby` = the description's id; clicking the label text toggles the switch; a row with two controls gets no automatic naming and no click-through.
2. Failing test: a control that already has `aria-label` keeps it.
3. Failing test (new `PeriodicNotesSection.test.ts`): Auto-pin is disabled while Auto-open is off, enabled after it is on, and stored `autoPin` is untouched.
4. Failing test (`TroubleshootingSection.test.ts`): Save mod run messages is disabled unless `debugLogToFile`; Heartbeat and Profile decoration plugins are disabled unless `debugLogToFile || debugTauriLogToFile`; each enables when its parent turns on.
5. `ClaudeCodeSection.test.ts` on `mvp-claude` must still pass after merge (SettingItem applies to it automatically); `pnpm check` and `pnpm vitest run` pass.
Ordering note: open-itens 202 (a `hint` prop on `SettingItem`) and 203 (cards) also edit `SettingItem.svelte`; abandoned, but if either is revived it conflicts here.

### D. Settings number fields write only valid values, clamp on change (P54, absorbs open-itens 201)
Files: `EditorSection.svelte`, `FileHistorySection.svelte`, `AutoOrganizeSection.svelte` (debounce block), tests. Size S. Acceptance criteria:
1. Failing test first (`EditorSection.test.ts`): typing `''` or `'1'` into Font size leaves the store at the previous value (fails today: becomes 0 and 1); typing `'14'` stores 14.
2. Failing test: committing `'999'` stores 32 and shows `32` in the field; committing `''` stores nothing and restores the stored value; Content width accepts `0` (no limit) and `800`, rejects `5` on input and clamps it to 400 on commit.
3. Failing test (new `FileHistorySection.test.ts`): from the default 7, typing `''` keeps 7, typing `'30'` stores 30, committing `'400'` stores 365 and shows `365`.
4. Failing test (`AutoOrganizeSection.test.ts`): from 3000 ms, typing `''` or `'0'` keeps 3000; typing `'2'` stores 2000; committing `'45'` stores 30000.
5. The existing "raw while typing" assertions in `EditorSection.test.ts` are rewritten to the new contract and the commit says so; heading typography inputs and other sections are untouched.
6. Gate: `pnpm check` and `pnpm vitest run`. Marks open-itens 201 `wontfix` with a pointer (it still names the old `auto-move/AutoMoveSection.svelte` path).

### E. Todoist chip opens the sync log (P79 part), optional
File `TodoistSyncStatus.svelte` + test. Size S, lowest value for this owner. Criteria: failing test that clicking the chip sets `todoistSyncStore.logOpen`; the chip is a `button`; text, title and `data-todoist-sync-status` unchanged; hidden while sync is off. Recommend leaving it out of this sweep.

### F. Settings title stays pinned (P51), blocked only by the mvp-claude overlap
File `SettingsPanel.svelte` + test. Size S. Criteria: failing test that the "Settings" `h2` is not inside the nav's scrolling element (the scrolling element is a sibling below the band); the group list still scrolls; `e2e/specs/settings.spec.ts` height assertions still pass. Launch after mvp-claude merges, or on an explicit owner waiver.

## Overlaps found

- **open-itens 201** (retention days and debounce clamp on commit): fully covered by ticket D (it also names `FileHistorySection.svelte`). Mark `wontfix` with a pointer to the quick ticket; its auto-move paths are stale.
- **open-itens 031, 079, 082** (auto-move config load failure never saved over the file, edit before Settings closes, failed move toast): the DEFER part of P08 is the same work as 031. Not covered by ticket A; leave open. 233 (move collision numbering) is already built (`moveToFreeName` with the toast, service line ~315).
- **open-itens 199, 200** (focus into the Settings drawer, modal scrim) edit `SettingsPanel.svelte`; no conflict with these tickets, but ticket F and they touch the same file.
- **open-itens 202, 203** (SettingItem hint prop, cards): both edit `SettingItem.svelte`; ordering with ticket C only.
- **open-itens 072** (Todoist sync errors visible): already `wontfix`; P79's quick slice does not revive it.
- **shell-sidebars-ux 04, 10, 11** (todo, chained): own `PropertyField.svelte`; the P28 checkbox name must wait for them. **shell-sidebars-ux 16** (todo): adds one assertion to `AutoOrganizeRuleRow.test.ts`; additive, no conflict with ticket B.
- **frontmatter-rules:** all done except 05 (needs-triage, blocked by 06); the rule row it built is the current baseline, no conflict.
- **mvp-claude:** `SettingsPanel.svelte`, `settings.logic.ts` and `help/documentation/19-settings.md` overlap (P51, P52). Tickets A to D avoid every file the branch changes.
- **Cross-slice:** settings-b (P80 Todoist root project row, P81 and others) also uses `SettingItem` layout props; ticket C changes only attributes and a click handler, not layout, so it should not clash.
