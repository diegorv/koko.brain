# Verdict: settings-a (Settings shell, Auto Organize, Todoist chip)

Slice: P08 P28 P66 P67 P68 P69 P70 P152 P51 P52 P53 P54 P79. Refutes `scout-settings-a.md` at HEAD `085b23c5d` (origin/main is the same commit; origin/mvp-claude at `361cbc32c`). Read-only; every path:line below was re-read at HEAD.

mvp-claude overlap re-checked with `git diff --name-only origin/main...origin/mvp-claude`: it changes `src/lib/app/SettingsPanel.svelte`, `src/lib/core/settings/settings.logic.ts`, `settings.store.svelte.ts`, `settings.types.ts`, `settings.service.ts`, `AppShell.svelte`, `commands.ts`. No file under `features/auto-organize/`, `core/settings/sections/`, `features/todoist-sync/`, `plugins/periodic-notes/` or `e2e/specs/{settings,auto-organize-flows,vault-mods}.spec.ts` is on that list. Scout's overlap claim holds.

## Summary

| id | scout | final | changed | one line |
|---|---|---|---|---|
| P08 | QUICK-PART | QUICK-PART | no | Toast on a failed save only; the loader guard (open-itens 031) stays DEFER |
| P28 | QUICK-PART | QUICK-PART | yes (scope cut) | Only explicit `aria-label`s in the Auto Organize section and rule row (plus the switches ticket C touches). The `SettingItem` auto-naming and row click-through move to DEFER |
| P51 | DEFER | DEFER | no | `SettingsPanel.svelte` is on the mvp-claude diff |
| P52 | DEFER | DEFER | no | Owner's "if wanted", and `SETTINGS_SECTION_GROUPS` is edited by mvp-claude |
| P53 | QUICK | QUICK-PART | yes | Auto-pin, Heartbeat and Profile decoration plugins only, and disabled only while off. The "Save mod run messages" consent is DEFER (deliberate separate-consent contract, unit test and E2E assert it) |
| P54 | QUICK | QUICK | no (refined) | Retention days writes on commit only (it feeds `cleanup_history`); absorbs open-itens 201 |
| P66 | QUICK-PART | QUICK-PART | no (refined) | Hint text only, no "Enable" button (the button would also start every enabled user rule) |
| P67 | DEFER | DEFER | no | Bulk move/rename of vault notes plus Undo |
| P68 | QUICK | QUICK | no | Copy only; also the Excluded folders line, which says "moved" but excludes every effect |
| P69 | QUICK-PART | QUICK-PART | no | Variables line plus unknown-variable warning; Insert menu, preview, suggestions DEFER |
| P70 | DEFER | QUICK-PART | yes | Missed slice: "a new rule opens with the name focused" is focus handling, ships alone |
| P152 | QUICK | QUICK | no (implementation corrected) | The scout's `WeakMap<RuleProperty>` key breaks on Svelte deep-state proxies; use a parallel id array |
| P79 | QUICK-PART | DEFER | yes | Clickable status bar items were explicitly left for later (P176 validation, shell-sidebars-ux 02); owner uses no external sync |

No DONE and no DROP: every premise re-checked true at HEAD (evidence per proposal below).

## Per proposal

### P08. Unreadable config reset then overwritten; save failures silent. QUICK-PART (unchanged)
- Premise true: `auto-organize.service.ts:132-135` (catch sets `DEFAULT_CONFIG`), `:186-200` (save writes the store, rethrows), `AutoOrganizeSection.svelte:33-39` (`.catch` only calls `error()`).
- Refutation attempt: the toast adds no write and does not change when `saveConfig` runs (`addRule`, `removeRule`, reorder, exclusions call it directly at `:59,69,78,87,96,103`; `updateRule` via the 500 ms debounce `:42-47`). A burst of failures would stack toasts, so the fixed toast `id` matters. No E2E asserts on this path. Holds.
- Test seam correction: prefer mocking the Tauri boundary (`@tauri-apps/plugin-fs` `writeTextFile` rejecting) so the real `saveAutoOrganizeConfig` throws, over mocking the service module; mock `svelte-sonner` (DOM service, as `AppearanceSection.test.ts` does). Assert the toast and that `autoOrganizeStore.rules` still holds the added rule (never the mock call alone).
- DEFER part: `loadError`, banner, Reveal/Retry, blocking `saveConfig`. It changes the loader and write path of `.kokobrain/auto-organize-rules.json` (owner's rules). Same work as open-itens 031 (ready-for-agent), which stays open.

### P28. Controls labelled by a neighbouring span. QUICK-PART (scope cut, changed)
- Premise true: `SettingItem.svelte:25-29` renders two `<span>`s; control column `:37-39` is unnamed. 93 `<SettingItem>` uses in 19 files under `src/lib`; only a handful of children carry `aria-label` (`LabsSection.svelte:44`, `LayoutSection.svelte:75`, `TroubleshootingSection.svelte:59,116`).
- Why the scout's `SettingItem` part is not QUICK:
  1. Shared component, 93 rows with heterogeneous controls (Switch, Input, Select trigger, Input + Browse popover, theme rows, Button-only rows such as "Open log folder" `TroubleshootingSection.svelte:82-89`), and mvp-claude's new `ClaudeCodeSection.svelte` (and its 229-line test) inherits whatever it does at merge.
  2. An `$effect` that writes `aria-labelledby` onto "the single control" after mount misses controls rendered later or swapped by an `{#if}` (e.g. the Browse popover appears only after `list_system_fonts` resolves, `EditorSection.svelte:18-24,54`). Doing it robustly needs a MutationObserver. The scout's harness test (one static control in `SettingItemHarness.svelte`) would pass while real rows stay unnamed.
  3. The click-through widens the hit area of switches that start data-writing features: "Enable Auto Organize" (moves and renames notes on save, `auto-organize.service.ts:211`), "Automatic snapshots" and "Snapshot backup" (`FileHistorySection.svelte:16-55`), Todoist sync. For an owner whose data must not be rewritten unexpectedly, a click on description text that turns on Auto Organize is a behaviour change worth an owner nod.
  4. The review itself sizes P28 at M.
- QUICK slice kept: explicit `aria-label`s, no shared component. `AutoOrganizeSection.svelte`: Enable switch (`:114`), Debounce input (`:127`), Excluded folder input (`:184`), each chip remove button (`:207`, "Remove <folder> from excluded folders"). `AutoOrganizeRuleRow.svelte`: rule name input (`:288-293`), rule enable switch (`:294-297`), move up, move down, delete (`:298-323`), Move to folder input (`:402-407`), icon button already has a `title` but no name (`:408-414`, give it `aria-label` equal to its title). E2E safe: `auto-organize-flows.spec.ts:27` uses the placeholder and `:44` `getByRole('switch').nth(1)`, neither depends on names. `settings-controls.test.ts:24` RAW_BUTTONS stays 1 (the chip button is still the only raw one).
- DEFER part: `SettingItem` naming and click-through (M, design: label element vs context vs per-row labels; owner nod on click-through). The `PropertyField` checkbox name (`PropertyField.svelte:124-132`) waits for shell-sidebars-ux 04, 10, 11 (all ready-for-agent, own that file).

### P51. Settings title scrolls out of view. DEFER (unchanged)
- Premise true: `SettingsPanel.svelte:122` `nav ... overflow-y-auto` holds the h-14 band `:125-127`. The file is on the mvp-claude diff (hunks at imports and maps, disjoint), and the rule excludes it. Promote after mvp-claude merges.

### P52. No search across settings sections. DEFER (unchanged)
- Owner "if wanted"; edits `SETTINGS_SECTION_GROUPS` (`settings.logic.ts:255-300`), where mvp-claude adds its entry (`@@ -289` hunk), plus `SettingsPanel.svelte`.

### P53. Dependent settings never disabled. QUICK-PART (changed)
- Premise true: `PeriodicNotesSection.svelte:58-63` Auto-pin has no `disabled`; `periodic-notes.service.ts:93-94,130-131` return when `autoOpen` is off. `TroubleshootingSection.svelte:65-80` Heartbeat and `:93-103` Profile decoration plugins have no `disabled`.
- Refutation 1, the mod-run consent switch: it is a deliberate separate consent (mods-observability Issue 02, `eea4ae3cd`). `src/tests/lib/core/settings/TroubleshootingSection.test.ts:41-60` asserts it toggles on with `debugLogToFile` false, and `e2e/specs/settings.spec.ts:73-100` turns it on while "Save debug log to file" is off and persists it. Disabling it changes that contract and needs more than a selector update in the E2E. Worse, the scout's rule ("stays disabled even when its stored value is true") would block revoking a privacy consent while the log option is off, so turning the log on later would immediately persist raw run text the user wanted to stop. DEFER, owner decision.
- Refutation 2, "disabled even when on": Heartbeat and profiling cost work while on (`boot.ts:38` profiling reads the toggle per call; heartbeat starts as soon as a log session starts, `TroubleshootingSection.svelte:44-46,149-151`). A disabled on-switch traps the user. Rule for this ticket: `disabled={!value && !parentOn}`, so a switch that is on can always be turned off.
- Kept: Auto-pin disabled while it is off and `daily.autoOpen` is off; Heartbeat and Profile decoration plugins disabled while off and neither `debugLogToFile` nor `debugTauriLogToFile` is on. Stored values never change. No E2E touches these three (grep of `e2e/specs` for Heartbeat, Profile decoration, Auto-pin is empty). Give these three switches `aria-label` equal to their row label while editing them.

### P54. Number fields apply unclamped values on every keystroke. QUICK (refined)
- Premise true: `EditorSection.svelte:98-100,119-121,140-142,163-165` write `Number(value)` on input; `AutoOrganizeSection.svelte:134-138` clamps on input (no `onchange`); `FileHistorySection.svelte:38-41` clamps on input.
- Refutation: Retention days feeds `cleanup_history` at vault open (`app-lifecycle.service.ts:296-300`), which deletes snapshots. Today clearing the field persists 1. The scout's "write on input when in range" still persists 1 while the user types "14". There is nothing to preview, so Retention days writes on commit only. Debounce follows open-itens 201 (in range on input, clamp on change). Editor fields keep live in-range writes (live preview intent, `EditorSection.test.ts:87`).
- The existing `EditorSection.test.ts:84-91` assertion "Raw while typing is deliberate" (store holds 999) changes to the new contract; the commit assertions stay. The review approved the contract change; say so in the commit.
- Out: `HeadingTypographyEditor.svelte`, `OneOnOneSection`, `EventCalendarSection` number fields (not in P54's evidence; open-itens 201 lists them as unchanged).
- Do not add helpers to `settings.logic.ts` (mvp-claude edits it); keep range checks local, reuse the existing `clamp*` exports read-only.

### P66. Type archive rules invisible, master switch off by default. QUICK-PART (refined)
- Premise true: `settings.store.svelte.ts:110-112` default off; `auto-organize.service.ts:211,231` return when off; `lifecycle.service.ts:87-93` only flips `_archived`; `type-lifecycle-rules.ts:27-28` rules come only from `archiveTo`.
- Refutation of the "Enable Auto Organize" button: the button runs the same handler as the switch, which also starts every enabled user rule (`registerAutoOrganizeHook` evaluates `enabledRules` plus lifecycle rules, `:213-215,296-297`). A hint about archive folders whose button silently starts move/rename rules is a data surprise. The switch sits right above the hint, so the hint is text only.
- Kept: when `!settingsStore.autoOrganize.enabled` and at least one `typeDefinitionsStore.typeMetadataMap` entry has `archiveTo`, a `<p>` under the Enable row: "N of your types set an archive folder. While Auto Organize is off, Archive marks a note as archived but does not move it." It must use `text-meta` and `px-4` (`settings-text.test.ts:47-55,73-83`) and no em dash (`settings-copy.test.ts:60`). Layer: features to features, the service already imports `typeDefinitionsStore`, so no new cycle.
- DEFER part: the read-only "From your types" rule list (M, layout pass).

### P67. Rules run only on save; apply-to-existing and record. DEFER (unchanged)
- Bulk moves and renames through the move/rename and link paths (`docs/agents/indexing-watcher-rules.md`), plus Undo toasts after automatic moves (`auto-organize.service.ts` move block). No safe slice: every part writes vault files.

### P68. Copy says "move" and "first match". QUICK (unchanged)
- Premise true: `AutoOrganizeSection.svelte:112` and `:151-154`; real order in `auto-organize.service.ts:292-330` and its doc comment `:283-291`. `help/documentation/22-auto-organize.md:43` is already right. No test asserts the old strings (grep of `src/tests`, `e2e`).
- Addition the scout missed: `:179-181` "Notes inside these folders will never be automatically moved." The hook returns before any effect for an excluded folder (`auto-organize.service.ts:220-223`), so rename, set properties, create note and mod action are also skipped. New text: "Rules never run on notes inside these folders."

### P69. Destination field hides its template variables. QUICK-PART (unchanged)
- Premise true: `AutoOrganizeRuleRow.svelte:400-407` placeholder only; `auto-organize.logic.ts:953-962` keeps unknown `{var}`; also used by Rename name (`:654`) and Create note path (`:428`).
- Refutation attempts: the line is display only; the destination still saves per keystroke as today (`:406`), nothing new is written. The helper must use the same `/\{(\w+)\}/g` as `resolveDestination` (`:962`) or the warning drifts. Rename already refuses `{basename}` (`renameProblem`, `:591`), so the variables line belongs under Move to folder only; Rename and Create note path show only the unknown-variable warning.
- Observation (not this ticket): `vars[key]` resolves `{constructor}` to a function string and would create a folder named after it. A `resolveDestination` fix touches the move path; separate ticket.
- DEFER part: Insert menu, live preview, folder suggestions (M).

### P70. Each rule is a flat, always-expanded form. QUICK-PART (changed)
- Collapse/expand, per-effect visibility and "Add action" stay DEFER (L, restructures the 549-line row; land P69 and P152 first).
- Missed slice: "A new rule opens expanded with the name focused." Today `addRule` (`AutoOrganizeSection.svelte:49-60`) adds a disabled rule and focus stays on the "Add rule" button. Focusing the new rule's name input is focus handling, writes nothing, and does not block the collapse work later. Put it in ticket B.

### P152. Property rows keyed by index. QUICK (implementation corrected)
- Premise true: `AutoOrganizeRuleRow.svelte:427` and `:468` `(i)` keys; `AutoOrganizeRuleProperty.svelte:67-75` per-instance `exprError` / `refusedExpr`; `setMode` and `commitKey` save `draftExpr` (`:120-137`), so after a delete the next row can save the deleted row's refused expression. That is a wrong value written into the rules file, which the fix removes.
- Refutation of the scout's design: `autoOrganizeStore.rules` is deep `$state` (`auto-organize.store.svelte.ts:4`), and `updateRule` assigns a new object (`:34-36`). Svelte 5.57.3 wraps a raw object in a new proxy when it is read back (`node_modules/svelte/src/internal/client/proxy.js:40-49,249`), so the edited `next` object handed to `setProperties` is never `===` the proxy the derived `properties` returns. A `WeakMap<RuleProperty, string>` keyed on `next` misses, the edited row gets a new key, remounts, and loses its refused draft and error (the very state `commitKey` keeps on purpose, `AutoOrganizeRuleProperty.svelte:127-132`). Use a parallel `$state` id array in the Row, appended in add, spliced in remove, untouched on edit, and rebuilt when the length changes from outside (config reload).

### P79. Todoist status chip not actionable. DEFER (changed)
- Premise true: `TodoistSyncStatus.svelte:17-30` span, error only in `title`. But the review's P176 validation says "Clickable items are left for later" for the status bar, and shell-sidebars-ux 02 (resolved) recorded "No clickable status bar items (excluded by the review's validation)". The chip lives in that status bar (`AppShell.svelte:309-311`, a file on the mvp-claude diff, though the chip file itself is not). Making one status item clickable reverses a recorded decision; owner call. The owner also uses no external sync, so the value is the lowest in this slice.

## Final quick tickets

### A. Auto Organize section: honest copy, archive-off hint, save-failure toast, named controls
- **ids:** P68, P66 (part), P08 (part), P28 (part)
- **Touches:** `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`
- **What to build:**
  1. Copy (P68). Enable row description: "After a save, applies the rules below and the archive rules of your types: notes are moved, renamed or updated automatically." Rules help: "Rules run top to bottom after a save. The first matching rule wins for rename, move to folder and run mod action. Set properties and create note apply from every matching rule. Your types' archive rules run last. Conditions use the same syntax as Collection filters (e.g. `file.hasTag('archive')`)." Excluded folders line: "Rules never run on notes inside these folders."
  2. Archive-off hint (P66 part). Text only, no button, under the Enable row, shown only when Auto Organize is off and at least one type sets `archiveTo` (count them from `typeDefinitionsStore.typeMetadataMap`). `<p class="px-4 text-meta text-muted-foreground">`.
  3. Failed save (P08 part). `saveConfig`'s `.catch` also calls `toast.error('Could not save auto-organize rules', { id: 'auto-organize-save' })`. The service and the file format do not change.
  4. Names (P28 part). `aria-label` on the Enable switch ("Enable Auto Organize"), Debounce input ("Debounce delay"), Excluded folder input ("Folder to exclude") and each chip remove button ("Remove <folder> from excluded folders").
- **Acceptance criteria:**
  - [ ] Failing test first: the rendered text contains "The first matching rule wins for rename, move to folder and run mod action", "apply from every matching rule", "archive rules run last" and "Rules never run on notes inside these folders", and no longer contains "determines the destination folder" or "never be automatically moved".
  - [ ] Failing test: with `enabled=false` and `typeDefinitionsStore.setTypeMetadataMap` holding two types with `archiveTo` and one without, the hint reads "2 of your types set an archive folder"; with `enabled=true`, or no type with `archiveTo`, there is no hint. The section renders no new button.
  - [ ] Failing test: with `vaultStore` path set and Tauri `writeTextFile` mocked to reject, clicking "Add rule" calls `toast.error` with "Could not save auto-organize rules" once, and `autoOrganizeStore.rules` still holds the new rule.
  - [ ] Failing test: the Enable switch, Debounce input and Excluded folder input have those accessible names; after adding folder "_templates", its remove button is named "Remove _templates from excluded folders" and clicking it empties `autoOrganizeStore.excludedFolders`.
  - [ ] `settings-copy.test.ts`, `settings-text.test.ts` and `settings-controls.test.ts` pass unchanged; `auto-organize.service.ts` is not in the diff.
  - [ ] Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh auto-organize-flows.spec.ts` still passes.

### B. Auto Organize rule row: variables, stable property rows, named controls, focus a new rule
- **ids:** P69 (part), P152, P28 (part), P70 (part)
- **Touches:** `src/lib/features/auto-organize/auto-organize.logic.ts` (one pure function and one constant), `AutoOrganizeRuleRow.svelte`, `AutoOrganizeSection.svelte` (pass a focus prop for the rule just added; two or three lines), `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts`, `AutoOrganizeRuleRow.test.ts`, `AutoOrganizeSection.test.ts`
- **Blocked by:** A (same Section file and test).
- **What to build:**
  1. `TEMPLATE_VARIABLES` (`folder`, `parent`, `basename`, `type`, `status`, `year`, `month`) and `unknownTemplateVariables(template): string[]` in `auto-organize.logic.ts`, matching with the same `/\{(\w+)\}/g` as `resolveDestination` and checking membership with `includes` (never an object lookup). `resolveDestination` does not change.
  2. Under Move to folder: a `text-meta text-muted-foreground` line listing the variables, replaced by a `text-meta text-destructive` line "{yaer} is not a variable, so a folder named {yaer} would be created" while the field holds an unknown one. Under Create note path and Rename (Name mode): only the unknown-variable line. Warning only; nothing is blocked, trimmed or rewritten.
  3. Property rows keyed by a stable id from a parallel `$state` id array in the Row (append on add, splice on remove, unchanged on edit, rebuilt when the array length changes from outside). Ids are never written to the rule. Same for create-note property rows.
  4. `aria-label` on the rule name input ("Rule name"), rule enable switch ("Enable rule"), move up, move down, delete ("Move rule up", "Move rule down", "Delete rule"), Move to folder input ("Move to folder") and the icon button (its existing title).
  5. After "Add rule", the new rule's name input has focus (Section passes the new id; the Row focuses its name input on mount when told to).
- **Acceptance criteria:**
  - [ ] Failing test first (`auto-organize.logic.test.ts`): `unknownTemplateVariables('{folder}/{yaer}')` is `['yaer']`; `'{folder}/_archive/{year}'`, `'plain'` and `''` give `[]`; `'{constructor}'` gives `['constructor']`; and for every name in `TEMPLATE_VARIABLES`, the real `resolveDestination('{name}', record, vault)` does not return the literal `{name}`.
  - [ ] Failing test (`AutoOrganizeRuleRow.test.ts`, real stores): typing `{folder}/{yaer}` into Move to folder shows the warning naming `{yaer}` and the saved `destination` is exactly `{folder}/{yaer}`; a valid template shows the variables line and no warning.
  - [ ] Failing test: a rule with two set-property rows where row 0 shows a refused expression; remove row 0; the remaining row shows no error, and changing its mode saves its own expression (assert `autoOrganizeStore.rules[0].properties`), never row 0's refused text. Fails today with the `(i)` keys.
  - [ ] Failing test: after a refused expression on a row, a key change on that row keeps its error and draft visible (no remount), and `JSON.stringify(autoOrganizeStore.rules)` contains no id field added by the Row.
  - [ ] Failing test: the rule name input, enable switch, move up, move down and delete buttons and the Move to folder input have the names above.
  - [ ] Failing test (`AutoOrganizeSection.test.ts`): clicking "Add rule" leaves `document.activeElement` on the new rule's "Rule name" input.
  - [ ] Edits to `AutoOrganizeRuleRow.test.ts` stay additive (shell-sidebars-ux 16 adds one assertion there).
  - [ ] Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh auto-organize-flows.spec.ts` still passes.

### C. Dependent settings switches disable while their parent is off
- **ids:** P53 (part)
- **Touches:** `src/lib/core/settings/sections/PeriodicNotesSection.svelte`, `src/lib/core/settings/sections/TroubleshootingSection.svelte`, `src/tests/lib/core/settings/TroubleshootingSection.test.ts`, new `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`
- **What to build:** Auto-pin: `disabled={!autoPin && !autoOpen}`. Heartbeat and Profile decoration plugins: `disabled={!value && !(debugLogToFile || debugTauriLogToFile)}`. A switch that is on is never disabled, so it can always be turned off. Stored values never change. "Save mod run messages to file" is not touched. Add `aria-label` equal to the row label on these three switches.
- **Acceptance criteria:**
  - [ ] Failing test first (`PeriodicNotesSection.test.ts`, real `settingsStore`): with Auto-open and Auto-pin off, the Auto-pin switch is disabled; turning Auto-open on enables it; with Auto-pin stored on and Auto-open off, it is enabled, clicking it turns `autoPin` off, and then it is disabled.
  - [ ] Failing test (`TroubleshootingSection.test.ts`): with both log options off, Heartbeat and Profile decoration plugins are disabled; turning on either "Save debug log to file" or "Save Tauri log to file" enables both; a stored-on Heartbeat with both logs off is enabled and can be turned off.
  - [ ] The existing consent test (`TroubleshootingSection.test.ts:41-60`) passes unchanged.
  - [ ] Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh settings.spec.ts vault-mods.spec.ts` still passes.

### D. Settings number fields write only valid values and clamp on commit
- **ids:** P54 (absorbs open-itens 201)
- **Touches:** `src/lib/core/settings/sections/EditorSection.svelte`, `src/lib/core/settings/sections/FileHistorySection.svelte`, `src/lib/features/auto-organize/AutoOrganizeSection.svelte` (debounce block only), `src/tests/lib/core/settings/EditorSection.test.ts`, new `src/tests/lib/core/settings/FileHistorySection.test.ts`, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`
- **Blocked by:** A (same Section test file); run after B if B is in flight.
- **What to build:** Editor fields (font size 8-32, line height 1-3, paragraph spacing 0-2, content width 0 or 400-2000): `oninput` writes only a finite in-range value; `onchange` clamps with the existing `clamp*` helpers, writes, and sets `e.currentTarget.value` to the stored value; an empty or non-numeric commit writes nothing and restores the field. Debounce: same, in range 500-30000 ms on input (open-itens 201). Retention days: no write on input; `onchange` clamps to 1-365 and writes, empty commit restores. `min`, `max`, `step` and descriptions unchanged; no edit to `settings.logic.ts`.
- **Acceptance criteria:**
  - [ ] Failing test first (`EditorSection.test.ts`): from the stored font size, typing `''` or `'1'` leaves the store unchanged (fails today: 0 and 1); typing `'14'` stores 14; committing `'999'` stores 32 and the field shows `32`; committing `''` leaves the store and shows the stored value. Content width: typing `'5'` leaves the store, committing it stores 400; `0` and `800` are stored.
  - [ ] Failing test (`FileHistorySection.test.ts`, real `settingsStore`): from 7, typing `''`, `'1'` or `'30'` leaves 7; committing `'30'` stores 30; committing `'400'` stores 365 and shows `365`; committing `''` keeps 30 and shows `30`.
  - [ ] Failing test (`AutoOrganizeSection.test.ts`): from 3000 ms, typing `''` or `'0'` leaves 3000; typing `'2'` stores 2000; typing `'45'` leaves 2000, committing it stores 30000.
  - [ ] The "Raw while typing is deliberate" assertion (`EditorSection.test.ts:87-88`) is rewritten to the new contract, stated in the commit; all commit-clamp tests and the heading typography tests pass unchanged.
  - [ ] Gate: `pnpm check` + `pnpm vitest run`.
- **Overlap:** open-itens 201 gets `wontfix` with a pointer to this ticket (its paths name the old `auto-move/AutoMoveSection.svelte`; this ticket is stricter for Retention days).

## Deferred

- P08 (rest): loader keeps rules and blocks saves on a parse failure, banner with Reveal/Retry; write path of the rules file, same as open-itens 031 (keep open).
- P28 (rest): `SettingItem` names every control and row click toggles its switch; shared by 93 rows and mvp-claude's new section, fragile auto-wiring, click-through needs an owner nod. `PropertyField` checkbox name waits for shell-sidebars-ux 04/10/11.
- P51: pin the Settings title band; `SettingsPanel.svelte` is on the mvp-claude diff, ready once it merges.
- P52: settings search; owner "if wanted", and edits `SETTINGS_SECTION_GROUPS` with mvp-claude.
- P53 (rest): disable "Save mod run messages to file" while the frontend log is off; reverses mods-observability Issue 02's separate-consent contract (unit test and E2E), owner decision.
- P66 (rest): read-only "From your types" rule group; needs a layout pass (M).
- P67: "Apply to N notes" and Undo toast after automatic moves; bulk vault writes (L).
- P69 (rest): Insert variable menu, live destination preview, folder suggestions (M). Also a separate `resolveDestination` own-key fix for `{constructor}`-style names (move path).
- P70 (rest): collapsible rule cards with effect summary and "Add action" (L).
- P79: Todoist chip as a button and Sync now in the log; clickable status bar items were left for later (P176), and owner uses no external sync.

## Overlaps to record

- open-itens 201: fully covered by ticket D; mark `wontfix` with a pointer.
- open-itens 031 (and 079, 082): not covered; stay open (P08 rest).
- open-itens 202, 203 (`SettingItem` hint prop, cards): no quick ticket edits `SettingItem.svelte` any more, so no conflict.
- open-itens 072: already wontfix; P79 deferred.
- shell-sidebars-ux 16 (ready-for-agent): one additive assertion in `AutoOrganizeRuleRow.test.ts`; ticket B stays additive. shell-sidebars-ux 04/10/11 own `PropertyField.svelte`.
- frontmatter-rules 05 (needs-triage): evaluates rules after move and rename in the service; tickets A and B do not touch the service.
