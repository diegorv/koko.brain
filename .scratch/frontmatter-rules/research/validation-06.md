# Validation 06: scout-11 (Settings UI and persistence) and scout-12 (mods)

Both reports exist and were read in full. Every load-bearing claim below was checked against the code at HEAD (`2e2cc5b60`, working tree clean outside `.scratch/frontmatter-rules/`). Read-only; nothing was run, so "throws" and "renders" statements are from reading the code.

Verdict: both reports are mostly accurate. Four claims are wrong or wrong in a way that matters, several are understated, and both miss facts a designer needs (listed under Missed and Corrections).

## Refuted

### R1. scout-11 F4.2: "a rule entry that is `null` ... would throw inside `findMatchingRule` at `if (!rule.enabled)` ... The service's timer wrapper catches it"

Wrong location, wrong catcher, and only half right for the "lacks `expression`" case.

- A `null` rule never reaches `findMatchingRule`. The after-save observer first reads `autoMoveStore.enabledRules` (`auto-move.service.ts:100`), which is `rules.filter((r) => r.enabled)` (`auto-move.store.svelte.ts:17-19`). That throws a `TypeError` on `null` synchronously, inside the observer, before any timer is set. It is caught by `notifyAfterSave`'s per-observer `try/catch` (`core/editor/editor.hooks.ts:85-91`), which calls `error('HOOKS', ...)`. `error()` reports to Sentry, so this fires on every save of every note, not once.
- The same `null` entry also breaks the Settings section: `{#each autoMoveStore.rules as rule, i (rule.id)}` (`AutoMoveSection.svelte:161`) reads `rule.id` on `null`.
- A rule that lacks `expression` but has `enabled: true` does not throw at `rule.enabled`. It reaches `evaluateExpression(undefined, ...)` inside the `try` (`auto-move.logic.ts:24-31`), so it goes to `onError` and is logged per save. In the UI, `rule.expression.trim()` (`AutoMoveRuleRow.svelte:114`) throws during render.
- Consequence for the design: the per-entry normalizer scout-11 asks for is right, and needed more than it says. A malformed entry today degrades into a Sentry error per save plus a broken Settings section, not a quiet log.

### R2. scout-11 F3: "An unknown method or unknown identifier is not caught by either; at runtime `findMatchingRule` catches the throw"

Half wrong. Unknown identifiers never throw.

- `resolveIdentifier` returns `ctx.record.properties.get(canonicalPropertyName(name)) ?? null` (`collection/expression/evaluator.ts:143-150`). A typo such as `stauts == 'done'` evaluates to `false` silently, and `!stauts` evaluates to `true`, so a typo can make a rule match every note. Nothing reaches `onError`.
- `formula.x` with `formulas: {}` also returns `null` silently (`evaluator.ts:217-222`), not an error.
- Unknown file methods do throw (`evaluator.ts:586`, `Unknown file method`), and unknown plain functions throw at runtime (`:468`) and are caught statically by Collection's `validateExpression` (`:306-315`).
- Consequence: neither validator nor runtime error reporting protects against misspelled property names. For a feature that writes frontmatter on match, a silent always-true rule is a data risk (it stamps every note). Key suggestions from `getAllKnownProperties` (scout-11 F3) are the only existing defense.

### R3. scout-12 section 8 risk 2 and section 2: "create, rename, move, restore do not fire [`notifyAfterSave`]" taken as universal for create

Not universal. The silent deep-link create path writes the file and calls `notifyAfterSave(fullPath, created)` (`features/deep-link/deep-link.service.ts:334-337`). Other deep-link write paths also fire it (`deep-link.service.ts:277, 296, 313`; `app/deep-link-actions.ts:78, 216`), and the guide's own table says deep links that write fire `onNoteSaved` (`help/documentation/mods/07-events-and-reactivity.md`, "Which writes fire it" table). The main creator (`core/note-creator/note-creator.service.ts:107`) and `fs.service.ts:209` only call `markRecentSave`, not `notifyAfterSave`, so for them the claim holds.

Consequence: a "create" trigger added next to the existing after-save trigger would evaluate a deep-link-created note twice (once as create, once as save). Dedupe by path and content, or define which wins.

### R4. scout-12 question 4: "Should rule definitions live in `.kokobrain/settings.json` (like Auto Move)"

Wrong premise. Auto Move rules and excluded folders live in `.kokobrain/auto-move-rules.json` (`auto-move.service.ts:18-19, 34-36`; `auto-move.types.ts:29`; `help/documentation/19-settings.md`, Auto Move section: "This file is separate from `settings.json`"). Only `autoMove.enabled` and `autoMove.debounceMs` are in `settings.json` (`settings.types.ts:287-292, 408`). The question itself (in-`.kokobrain/` file vs a vault note git can see) is still valid.

### R5. scout-12 section 1 point 2 and section 3.2: "mods have no `import`"

Misleading as a reason. `28-mods.md:711` says "No `import`, one file per mod; bundle packages with your own build". The owner's 12 mods are TypeScript built into `main.js` from a separate source repo (per the owner's memory note; not read here). So a mod could bundle a vendored copy of the expression engine. That would be a second copy of the engine, which the owner's one-engine preference rules out just as firmly, so the conclusion stands; the stated reason does not.

## Confirmed key claims

scout-11:

- Registry touch points for a new section: `SettingsSection` union (`settings.types.ts:359`), `SETTINGS_SECTION_GROUPS` with Auto Move in Vault (`settings.logic.ts:255-300`, `:279`), `sectionIcons` and `sectionComponents` records (`app/SettingsPanel.svelte:44-64, 71-91`), hardcoded id lists in `src/tests/lib/core/settings/settings.logic.test.ts:372` and Vault ids at `:384`, derived ids in `src/tests/lib/app/SettingsPanel.test.ts:23`, and the groups listed in prose at `help/documentation/19-settings.md:9`.
- `parseSettings` merges `autoMove` by spread over defaults (`settings.service.ts:155-157`), so an optional nested settings field needs no migration.
- Section copy "first matching rule determines the destination folder" (`AutoMoveSection.svelte:150-153`); reorder by swapping and replacing the array (`:71-87`); add/remove/reorder/exclusions save immediately, `updateRule` saves debounced 500 ms (`:42-47, 61-64`).
- `updateRule` is a shallow merge (`auto-move.store.svelte.ts:34-36`); per-rule unknown fields survive; unknown top-level keys are dropped because `setConfig` copies only `rules`/`excludedFolders` (`:22-26`) and `saveAutoMoveConfig` writes only those two (`auto-move.service.ts:78-81`).
- Green-check bug: `expressionError` is `$state(null)` and recomputed only in `handleExpressionChange` (`AutoMoveRuleRow.svelte:37-43`), so a persisted invalid expression shows `CircleCheckIcon` until edited (`:114-121`). An empty expression shows nothing (`:114, :125`).
- Auto Move's `validateExpression` is parse-only (`auto-move.logic.ts:87-95`); Collection's checks unknown plain functions (`evaluator.ts:294-315`); `FilterRow.svelte:44` derives the error and treats blank as unfinished.
- Eval context is `{ record, formulas: {} }` (`auto-move.logic.ts:25`).
- Corrupt `auto-move-rules.json` resets the store to empty with no backup and no toast (`auto-move.service.ts:61-64`); the next UI edit overwrites the file. `settings.json` has the backup-then-toast precedent (`settings.service.ts:60-65, 210-226`).
- No schema version in any `.kokobrain` config; the only versioned format is the theme package (`core/settings/theme-package.logic.ts:6, 19`).
- Config loads only at vault init (`app-lifecycle.service.ts:303`), hook registered later (`:443-445`). The Rust watcher drops events inside dot-folders (`src-tauri/src/vault/watcher.rs:66-78`, `is_inside_hidden_dir`), so a hand edit while the app runs is not reloaded.
- `onDestroy` clears the save timer without flushing (`AutoMoveSection.svelte:25-27`).
- `IconPicker` props and color-only mode (`IconPicker.svelte:17-36, 143-149`); `AutoMoveRuleRow` passes no `onColorsChange` (`:156-165`); the three other callers do (`NoteRowMenu.svelte:291`, `TypesNavigator.svelte:506`, `FilesNavigator.svelte:420`); colors are reset on open, untracked (`IconPicker.svelte:120-131`).
- `setFrontmatterIcon` upserts `_icon` and removes `_color`/`_title_color` when the passed color is undefined (`frontmatter-icon.service.ts:26-31, 57-67`).
- `PropertyField.svelte` imports `settingsStore` (`:12, :171`); `PropertyType` (`properties.types.ts:2`); helpers at `properties.logic.ts:634, 651, 674, 703, 719`; `canonicalizeKey` at `utils/frontmatter-aliases.ts:29`.
- `components/ui/` holds exactly: button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip.
- `examples-scoping.test.ts:231-235` requires `PATH_PREDICATE_RE` (`:54-55`) in each rule expression of any file ending in `auto-move-rules.json` under `help/examples/`.

scout-12:

- `MOD_APP` (`plugins/mods/mod-app.service.ts:26-68`) has `updateNoteFrontmatter` but no `setIconForPath`, no `evaluateExpression`/`parse`; `kb-api.ts` contains no "expression" (0 matches).
- `onNoteSaved` passes only the vault-relative path and runs each callback in its own `setTimeout(0)` after the synchronous observers (`mods-host.service.ts:554-579`).
- Mods-enabled flag is per vault path in `localStorage` (`mods-enabled.store.svelte.ts:12-19, 45-51`); moving the vault turns mods off (ADR-0036 line 60); host start is deferred into a `setTimeout(0)` (`app-lifecycle.service.ts:531-545`).
- `updateNoteFrontmatter` is the shared write path, requires a pure `mutate`, says callers must serialize per path, and skips the write only when `next === base` (`core/frontmatter/frontmatter-write.service.ts:95-97, 128-129`); the closed-note branch calls `notifyAfterSave` (`:161`), the tab branch saves through `saveFileByPath` which calls it (`core/editor/editor.service.ts:196`).
- Mod `onNoteSaved` errors go to the debug log only, never Sentry (`28-mods.md:656`; `07-events-and-reactivity.md` § Errors).
- `ctx.app` has no compatibility promise (`28-mods.md:514`).
- Recipe 20 (`14-cookbook.md:2568-2653`) skips the active note and stamps it on tab change; notes moved while pending fail at the old path.
- Auto Move's observer is moved to the end of the observer array by a settings toggle: unsubscribe splices it out and re-registration pushes it (`editor.hooks.ts:52-59`; `auto-move.service.ts:134-146`).
- Layer direction: `plugins/mods` imports `features/collection` (`mod-app.service.ts:9`), which is allowed; `features -> plugins` is a flagged rule (`src/tests/lib/architecture/layer-rules.test.ts:113-131`).
- The recommendation (built-in feature, no mod-contributed actions in v1, mods not on the critical path) holds against the code.

## Missed

1. **Icon store refresh after a raw frontmatter write is already handled.** scout-11 left this open (F7, section 7). `fileIconsStore` is a note-change consumer (`file-icons.service.ts:298-305`, `registerFileIconsNoteChangeConsumer`), and `notifyAfterSave` runs `applyNoteChange({ kind: 'upsert', source: 'save' })` (`editor.hooks.ts:81`), which calls `updateFrontmatterIconForFile` (`file-icons.service.ts:240-272`). So a rule that writes `_icon`/`_color`/`_title_color` through a plain `updateNoteFrontmatter` mutate updates the sidebar icon with no extra store call. `setIconForPath`'s explicit `updateFrontmatterIcon` (`:130-132`) is an immediate update ahead of that path, not the only one.
2. **A colors-only writer already exists.** `setIconColors` / `setFrontmatterIconColors` (`file-icons.service.ts:152-165`, `frontmatter-icon.service.ts:74-76`) write `_color` and `_title_color` and leave `_icon` alone. scout-11 F7's "cannot be expressed" is right only for per-key modes: these helpers still remove whichever color is undefined, and they toast on refusal (`frontmatter-icon.service.ts:38-50`), which would toast on every autosave from a rules observer. A rules feature should write its own per-key mutate and keep the quiet lossy pre-check Auto Move uses (`auto-move.service.ts:203-207`).
3. **Empty destination moves to the vault root today.** scout-11 section 5 says "empty destination means no move" as if current. It is only Issue 01's spec (behavior 1). Today `resolveDestination('')` returns `''` (`auto-move.logic.ts:128-129`) and the note is moved to the vault root (`auto-move.service.ts:167-196`). A new rule starts with `destination: ''` and `expression: ''` (`AutoMoveSection.svelte:49-56`). Any "actions-only" rule on Auto Move depends on Issue 01's change landing first.
4. **A new rule with an empty expression errors on every save.** `parse('')` likely throws (`parser.ts:162`, "Unexpected end of expression"; not executed), inside the `try`, so `onError` logs `error('AUTO-MOVE', ...)` (Sentry) on each save until the user types an expression.
5. **Record times are fake at evaluation.** Auto Move builds the record with `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`auto-move.service.ts:154`) and no size (`collection.logic.ts:22-28` defaults `size = 0`). So `file.mtime`, `file.ctime` and `file.size` in a rule mean "now", "now" and 0 at save time, while a Settings "N notes match" preview built from `collectionStore.propertyIndex` would see real values. A preview and the trigger would disagree for any rule using those fields.
6. **Key aliasing differs between conditions and actions.** Parsed frontmatter keys are canonicalized (`properties.logic.ts:297`, all aliases in `utils/frontmatter-aliases.ts:6-23`, including `icon`, `color`, `title_color`, `archived`, `favorite`), and `buildNoteRecord` stores those canonical keys (`collection.logic.ts:35-39`). The expression engine aliases only `type` (`evaluator.ts:92-99`). So in a condition `organized == false` silently resolves to `null` (see R2) while `_organized == false` works, but an action key `organized` is canonicalized to `_organized` on write (Issue 01 rule 4). The editor should normalize or warn on both sides, not only on actions.
7. **Properties-panel edits already hit the caret bug.** The panel writes the active note through `syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')` (`features/properties/properties.service.ts:101-107`), the same replace path Issue 001 describes. A rule write right after a panel edit adds a second rewrite of the same kind; it is not a new class of bug. scout-12 constraint 4 says deferral "is not viable" for the property-change trigger; true for "immediately", but the bug is already present for the panel edit itself, so 001 gates the panel today too.
8. **Background tabs get a shifted caret too.** Recipe 20 notes that a background tab gets its old offset back "a few characters off" (`14-cookbook.md`, recipe 20 notes), and Issue 001's acceptance has a background-tab case. Skipping only the active note does not make a rules write caret-safe; it makes it less visible.
9. **Pending-save loss also on section switch.** `SectionContent` is `$derived(sectionComponents[activeSection])` (`SettingsPanel.svelte:103`), so switching sections unmounts `AutoMoveSection` and runs the non-flushing `onDestroy`, not only closing Settings. The enable switch and icon picks also go through the debounced `updateRule` path (`AutoMoveRuleRow.svelte:46, 73` -> `AutoMoveSection.svelte:61-64`), so they are not "structural immediate saves" as scout-11 F4.5 implies. The edit stays in the store and the next save of anything writes it; it is lost only if nothing saves before quit or vault switch.
10. **No checkbox, radio group or textarea in `components/ui/`.** Per-rule trigger checkboxes (scout-11 Q2) need either `Switch`/`Select` or a new shadcn-svelte component generated via the CLI.
11. **New file names escape the examples guard.** `examples-scoping.test.ts:231` matches by the `auto-move-rules.json` suffix only. A separate rules file in `help/examples/` would not be checked for a path predicate unless the test is extended. That matters more for a feature that writes frontmatter than for one that moves files, since an unscoped example rule copied into a real vault would stamp every note.
12. **Auto Move already re-enters itself after each icon write.** The icon write fires `notifyAfterSave` on the new path, which schedules another Auto Move evaluation 3 s later; it converges because the second write hits `next === base`. Any rule action that writes frontmatter adds one more debounced evaluation per applied note, in the same way. With Issue 01's chaining rule 6, the design relies on this.
13. **Mods have more UI routes than dialogs.** `08-custom-ui.md` lists rail buttons, a native `<dialog>`, mounting into app regions and `railRegistryStore` navigators (raw). The conclusion (no Settings section, hand-built UI) stands; "dialogs only" in scout-12's table understates it.

## Corrections a designer must know

1. Normalize every rule entry on load (drop `null`, require string `id`/`expression`, boolean `enabled`, validate action `kind`/`mode`). Today a malformed entry becomes a Sentry error per save via `editor.hooks.ts:89` and a broken Settings render (R1).
2. Misspelled property names in a condition are silent and can match everything (`!typo` is `true`). For a frontmatter-writing rule this is the main data risk; key suggestions or an "unknown property" warning against `getAllKnownProperties` are the only cheap guard (R2).
3. Do not trust "create does not fire after-save": silent deep-link creates do. A create trigger needs dedupe with the save trigger (R3).
4. Rules data today is `.kokobrain/auto-move-rules.json`, not `settings.json`; it is unversioned, loaded once per vault open, not watched, and overwritten from memory on the next UI save (R4, confirmed F4).
5. Writing icon/color keys through a plain `updateNoteFrontmatter` mutate is enough for the sidebar to update (Missed 1). Avoid the icon helpers in an observer: they toast per refusal and couple the three keys (Missed 2).
6. Actions-only rules on the Auto Move file require Issue 01's "empty destination means no move" first; today such a rule moves notes to the vault root (Missed 3).
7. `file.mtime`/`file.ctime`/`file.size` are not real at trigger time; either fix the record or document that rules must not use them (Missed 5).
8. Alias handling must be the same for the condition and the actions, or `organized` works as an action key and silently fails as a condition key (Missed 6).
9. Issue 001 gates the property-change trigger regardless of deferral, and skipping the active note does not protect background tabs (Missed 7, 8).
10. Nothing from the mods system is on the critical path; any new trigger that writes on create/move/rename changes the documented "Which writes fire it" table in `07-events-and-reactivity.md` and can start loops in save-reacting mods (scout-12 section 7.4, confirmed).

## Not verified

- No component was mounted and no test was run; the render crashes in R1 and the empty-expression throw in Missed 4 are from reading code.
- The owner's mods source repo (`~/kokobrain-vaults/kokobrain-mods-src`) is outside the working directory and was not read, so whether an existing mod already stamps frontmatter on save is still unknown.
- Did not re-read `help/documentation/22-auto-move.md`, ADR-0019 or the private `@kokobrain/mod-core` contract.
