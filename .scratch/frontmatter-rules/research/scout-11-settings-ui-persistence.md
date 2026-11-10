# Scout 11: Settings UI and persistence patterns to reuse

Area: what an "action editor" (set property / set icon / set color, each with fill-missing vs always-set) can reuse from the existing Settings UI and `.kokobrain/*.json` persistence, and what it needs new. Read-only research, nothing was run. Paths are relative to the repo root.

## 1. Summary

- The Auto Move settings section is a thin, copyable template: one flat list of rule rows, each row a bordered card with header controls (name, enable switch, up, down, delete), an expression input with inline validation, and one field row. Adding an "actions" sub-list to the row is the main new UI.
- `IconPicker.svelte` is directly reusable for the icon and color actions, but its color-only mode needs `onColorsChange`, which `AutoMoveRuleRow` does not pass today, so a rule cannot hold colors without an icon.
- `PropertyField.svelte` is bound to a note's `Property` and to right-sidebar theme classes. It is not a good drop-in for a Settings action editor. The reusable parts are the `PropertyType` model and the typed-value helpers in `core/frontmatter/properties.logic.ts`.
- Expression validation in Auto Move is weaker than what Collection already ships (parse-only vs parse plus unknown-function check). The row also shows a green check for a persisted invalid expression until the user edits it (found below, F3).
- `auto-move-rules.json` has no version field, no shape validation of rule entries, and no broken-file backup. A bigger action schema raises the stakes on all three.
- The settings section registry has 5 hardcoded touch points plus 2 hardcoded test lists. Extending Auto Move costs zero registry work; a new section costs those touch points.

## 2. Findings with evidence

### F1. Settings section registry (cost of a new section)

A new section must be added in all of these. The `Record<SettingsSection, ...>` types make a missing entry a compile error.

1. `SettingsSection` union: `src/lib/core/settings/settings.types.ts:359`.
2. `SETTINGS_SECTION_GROUPS` (sidebar grouping and label): `src/lib/core/settings/settings.logic.ts:255-300`. Auto Move sits in the `Vault` group at `:279`.
3. `sectionIcons` record: `src/lib/app/SettingsPanel.svelte:44-64` (Auto Move uses `FolderOutputIcon`, `:54`).
4. `sectionComponents` record: `src/lib/app/SettingsPanel.svelte:71-91`, exported for test exhaustiveness.
5. Hardcoded expectations in tests: `src/tests/lib/core/settings/settings.logic.test.ts:372` (full id list in order) and `:382` (Vault group ids), plus `src/tests/lib/app/SettingsPanel.test.ts:23` (derives ids from the groups).
6. Docs: `help/documentation/19-settings.md:9` lists the groups and sections by name; `:236-245` documents Auto Move and states the file is `.kokobrain/auto-move-rules.json`, "separate from `settings.json`".

If the feature has its own on/off switch it also needs a field in `AppSettings` (`settings.types.ts:389-425`, Auto Move's is `autoMove: AutoMoveSettings` at `:287-292` and `:408`), a default in `DEFAULT_SETTINGS`, and a merge line in `parseSettings` (`src/lib/core/settings/settings.service.ts`, the `autoMove: { ...DEFAULT_SETTINGS.autoMove, ...parsed.autoMove }` block). Nested defaults merge by spread, so adding an optional field to an existing settings object is backward compatible with no migration.

### F2. How Auto Move's UI is built (reusable skeleton)

- Section: `src/lib/features/auto-move/AutoMoveSection.svelte` (217 lines).
  - Uses `SettingItem` (`src/lib/core/settings/sections/SettingItem.svelte`) for the enable switch (`:109-120`) and the debounce input (`:122-139`).
  - Rules list is `{#each autoMoveStore.rules ... (rule.id)}` (`:161`) with callbacks `onupdate/onremove/onmoveup/onmovedown`. Reordering swaps array entries and replaces the whole array (`:71-87`).
  - Copy at `:150-153` says "Rules are evaluated top-to-bottom. The first matching rule determines the destination folder." This sentence is wrong for a set-properties feature if all matching rules apply (see section 5).
  - Excluded-folders chip list with a free-text Input and Add button (`:175-216`). No folder picker, no validation of the entered path. Reusable as is if the new feature wants the same exclusion concept (the matcher is `isInExcludedFolder`, `auto-move.logic.ts:41`, case-insensitive prefix).
- Row: `src/lib/features/auto-move/AutoMoveRuleRow.svelte` (165 lines), single-purpose: header row (`:64-101`), expression row (`:104-128`), destination plus icon-button row (`:131-153`), `IconPicker` mounted at the bottom (`:156-165`).
- Store: `src/lib/features/auto-move/auto-move.store.svelte.ts`: `rules`, `excludedFolders`, `isConfigLoaded`, getter `enabledRules`, methods `setConfig/addRule/updateRule(id, Partial)/removeRule/reorderRules/setExcludedFolders/reset`. `updateRule` is a shallow merge (`:34-36`), so a nested `actions` array is replaced as a whole by the row; the row must build the next array itself.
- Existing test pattern to copy for a new row: `src/tests/lib/features/auto-move/AutoMoveRuleRow.test.ts` (jsdom, `mount`, a `ResizeObserver` polyfill because bits-ui ScrollArea needs it, selectors by `button[title=...]`).

Size risk: the row is 165 lines with one field. A trigger selector, an actions list with per-action mode, and per-action editors would make it several times larger. Plan to split into sub-components (action list, one action row), not to grow the row.

### F3. Expression validation UX (verified gaps)

- Auto Move validation is `validateExpression` in `auto-move.logic.ts:87-95`: empty check plus `parse()` only. It does not detect unknown plain functions.
- Collection has a stricter `validateExpression` in `src/lib/features/collection/expression/evaluator.ts:306-315`: parse plus `findUnknownFunction` against `PLAIN_FUNCTIONS` (`:294-298`). It explicitly does not check method names (`file.hasTag`, `x.lower()`). `FilterRow.svelte:19,41-47` already uses it, and treats a blank raw row as unfinished rather than invalid.
- An unknown method or unknown identifier is not caught by either; at runtime `findMatchingRule` catches the throw and reports through an `onError` callback that the service wires to `error('AUTO-MOVE', ...)` (`auto-move.logic.ts:17-35`, `auto-move.service.ts:159-161`). The user sees nothing in the UI.
- Evaluation context is `{ record, formulas: {} }` (`auto-move.logic.ts:25`), so `formula.*` identifiers are not usable in rules; the editor gives no hint of this.
- BUG in the row (verified by reading): `expressionError` is `$state(null)` and is only recomputed inside `handleExpressionChange` (`AutoMoveRuleRow.svelte:37-43`). On load, a persisted invalid expression has `expressionError === null`, and the template (`:114-119`) shows the green `CircleCheckIcon` whenever the expression is non-empty and `expressionError` is null. So a rule with a broken expression shows a green check until the first edit. Also an empty expression shows no error at all (`:114`, `:125` both gate on `rule.expression.trim()`), though the rule never matches. The new editor should derive the error from `rule.expression` (`$derived`) instead of storing it on change. I did not run the component to confirm the rendering; this is from the template logic.
- Not present and would be new: a property-key autocomplete, a "N notes match" preview, a test-against-note button. Building blocks exist: `getAllKnownProperties(index)` (`collection/toolbar/filter.logic.ts:223`), `inferPropertyType(property, index)` (`:244`), and the live index `collectionStore.propertyIndex` (used by `CollectionView.svelte:215,633`). `buildNoteRecord` (used at `auto-move.service.ts:154`) can build a record from raw content for a preview. The Collection filter builder (`FilterRow`, `FilterPanel`) is a visual operator/value builder with a raw-text fallback; it is toolbar-popover UI, not a Settings component, and Auto Move deliberately uses only the raw string input. Reusing it for the rule condition would diverge from Auto Move's raw-expression UX; flag as an owner choice, not a default.

### F4. Persistence of `.kokobrain/*.json` configs (verified)

Three different patterns exist in the repo:

| File | Loader | Saver | On corrupt file | Version |
|---|---|---|---|---|
| `settings.json` | `settings.service.ts` `loadSettings` / `parseSettings` (merge over defaults, then `normalizeSettings`) | effect-driven debounced writer `settings-persistence.svelte.ts` (500 ms, skips unchanged content, flush on quit) | copies bytes to `settings.broken-<stamp>.json`, toasts, then writes defaults (`resetBrokenSettingsFile`) | none |
| `auto-move-rules.json` | `auto-move.service.ts:42-65` | explicit `saveAutoMoveConfig` (`:70-88`), debounce lives in the component | catch sets empty defaults in the store, logs, no toast, no backup (`:61-64`) | none |
| `recent-icons.json`, `folder-order.json` | `file-icons.service.ts`, `fs.service.ts:41-67` | explicit | empty fallback | none |

Facts that matter for a new rules file or for extending the Auto Move file:

1. No schema version anywhere in these configs. The only versioned artifact is the theme package (`src/lib/core/settings/theme-package.logic.ts:6,19,94-107`, `schemaVersion`, rejects higher). Back-compat has been done by "optional field, absent means default", which Issue 01 also relies on (rule 9: a missing or non-object `defaultProperties` is none).
2. No entry validation on load: `loadAutoMoveConfig` only checks `Array.isArray(parsed.rules)` (`:56-58`). A rule entry that is `null` or lacks `expression` would throw inside `findMatchingRule` at `if (!rule.enabled)` (`auto-move.logic.ts:24`), which is outside its try block. The service's timer wrapper catches it (`auto-move.service.ts:119-122`) and logs. I did not execute this; it is from code reading. An actions array with `kind` discriminators will need a per-entry normalizer on load (drop or flag unknown kinds), because a hand-edited or future-version file will otherwise reach the apply code unchecked.
3. Corrupt JSON is destructive: on a parse failure the store is set to empty rules (`:61-64`). The next edit in the Settings UI calls `saveAutoMoveConfig` (`AutoMoveSection.svelte:33-39`) and overwrites the broken file with the empty config. Unlike `settings.json`, no `.broken-<stamp>` copy is made. The owner's hand-edited rules (the `examples-scoping.test.ts:231` test shows rules files are authored by hand in help examples) would be lost silently. A bigger schema makes hand edits more likely. Cheap mitigation is to copy the `resetBrokenSettingsFile` approach (byte copy, then toast), which is existing precedent in `settings.service.ts`.
4. Load happens once, at vault init: `loadAutoMoveConfig` is called only from `src/lib/app/lifecycle/app-lifecycle.service.ts:303` (step 3, in parallel with icons and trash), before the hook is registered at `:443-445`. `.kokobrain/` is dot-prefixed and ignored by the watcher (ADR-0019, `docs/adr/0019-kokobrain-in-vault-data-dir.md`, anchor `src/lib/core/filesystem/fs.watcher.ts`), so a hand edit while the app runs is not picked up and the next UI save overwrites it. State this limit in docs; per the owner's memory note, do not add core watcher behavior for this.
5. Pending-save loss on section close: `AutoMoveSection.svelte:25-27` clears the debounce timer in `onDestroy` without flushing. The store already holds the edit, but disk does not, if the user types in a rule field and closes Settings within 500 ms. Text inputs go through `saveConfigDebounced` (`:61-64`); structural edits (add, remove, reorder) save immediately. Small, visible, recoverable glitch; flag, and in a new editor flush on destroy instead of clearing (one line).
6. Writes are a plain `writeTextFile` with `JSON.stringify(config, null, 2)` (`:82`); vault mods use a different atomic write command (`src/lib/contracts/commands.ts:129`). Not recommending a change.
7. Alternative persistence for rule state: effect-based persistence like `settings-persistence.svelte.ts` serializes the whole object inside an `$effect.root` and skips unchanged writes. It removes the per-callsite `saveConfig()` calls and the unmount-loss bug, but it is a bigger pattern than Auto Move uses. Worth it only if the new action editor has many mutation sites.

### F5. IconPicker, what it offers and what it lacks for an action editor

`src/lib/features/file-icons/IconPicker.svelte` props (`:17-36`): `open` (bindable), `currentPack/currentName/currentColor/currentTextColor`, `onSelect(pack, name, color?, textColor?)`, optional `onColorsChange(color?, textColor?)`, `onRemove`, `onClose`.

- Icon action: reuse as is, wiring identical to `AutoMoveRuleRow.svelte:45-52,156-165`. The result shape is already `AutoMoveIcon` (`auto-move.types.ts:2-11`), which maps to frontmatter `_icon = "pack:name"`, `_color`, `_title_color` (`frontmatter-icon.service.ts:12-29,60-67`; ADR-0027 line 24).
- Color-only action: the picker supports it only when `onColorsChange` is passed and no `currentPack` is set (`IconPicker.svelte:143-149`). `AutoMoveRuleRow` passes neither `onColorsChange`, so today a rule can carry colors only together with an icon. The other callers (`NoteRowMenu.svelte:21`, `FilesNavigator.svelte:48`, `TypesNavigator.svelte:32`) import `setIconColors` for this path.
- Colors apply while the dialog stays open (swatch click calls `applyColors`, `:264,292`), so each swatch click fires a rule update and a save. With the debounced save this is fine.
- The swatch row (9 presets plus a native `<input type="color">`, hex only) is inline in the dialog (`:51-61,254-310`), not a separate component. An inline "color" action editor that avoids opening a full 550 px icon dialog would need either extracting the swatches or a new small component. `ThemeColorRow.svelte` (hex text field plus color input with `isValidHex/normalizeHex`) is another existing color control, themed for the theme editor.
- The dialog resets its internal color state on open (`:122-131`) and reads colors untracked, so the action row should hold the source of truth in the rule and pass `current*` props, as `AutoMoveRuleRow` does.
- The row never calls `trackRecentIcon`; other callers do (`FilesNavigator.svelte`, `NoteRowMenu.svelte`). Minor inconsistency.

### F6. PropertyField and property typing

- `src/lib/features/properties/PropertyField.svelte` (202 lines) props: `property: Property`, `onUpdate(key, value, type?) => boolean`, `onRename`, `onRemove`. It renders by `property.type`: boolean checkbox, text/number/date `Input`, list as chips with an add input (`:122-155,168-201`). The key is an inline editable input (`:113-119`).
- Constraints for reuse in Settings: (a) it imports `settingsStore` for tag colors (`:12,171`); (b) it is styled with right-sidebar tokens (`text-right-sidebar-*`, `bg-right-sidebar-accent`), so it would look off in the Settings panel; (c) the type comes from the detected value, there is no type chooser (new properties are `addProperty` text with empty value, `core/frontmatter/properties.logic.ts:703-708`); (d) `onUpdate` returning false triggers a refusal remount (`:33,60-62,122`), a note-write concept that does not exist for a rule config.
- Reusable building blocks instead: `PropertyType = 'text' | 'list' | 'number' | 'date' | 'boolean'` (`core/frontmatter/properties.types.ts:2`), `setPropertyByBindTarget` (canonical-key upsert that infers number/boolean from the JS type, `properties.logic.ts:651-667`), `typedOptionValue` (string to boolean/number only when it round-trips, `:674-681`), `updatePropertyValue` (`:719-728`), `yamlScalar` (`:634`).
- Issue 01 specifies string-only values ("Values are written as text properties", `.scratch/auto-move-default-properties/issues/01-...md`, behavior 3) with a plain key/value pair list. That is the cheapest editor. Typed values (boolean `_archived: true`, numbers, lists such as tags) need a type selector per action plus a value control per type; that is new UI, built from the five-type model above.
- Value templates: `resolveDestination` supports `{folder} {parent} {basename} {type} {status} {year} {month}` (`auto-move.logic.ts:102-130`, no day, no `{today}`). If property values need dynamic parts (a date stamp, `[[{basename}]]`), a value-template resolver is new work or a shared extension of that function. Owner question below.
- Property key input: suggestions from `getAllKnownProperties` (`filter.logic.ts:223`) include the `file.*` pseudo-properties, which are not writable frontmatter keys. Filter them out in an action key picker. Key canonicalization (`organized` to `_organized`) is done by `canonicalizeKey` (Issue 01 rule 4); the editor should show or normalize the canonical form to avoid two rules fighting over `organized` and `_organized`.

### F7. Fill-missing vs always-set, UI and apply-path constraints

- Today's icon apply is "always set, all three keys": `setIconForPath` -> `setFrontmatterIcon` upserts `_icon` and, through `withIconColors`, removes `_color` and `_title_color` when the passed color is undefined (`frontmatter-icon.service.ts:25-29,60-67`). So an always-set icon action with no colors wipes a note's existing colors. A per-action mode on a separate color action cannot be expressed through `setIconForPath`; the apply path needs a per-key mutate (via `updateNoteFrontmatter` with a custom `mutate`) rather than the three-key helper. Also `setIconForPath` updates `fileIconsStore` after the write (`file-icons.service.ts:127-133`); a raw mutate would have to refresh the store or rely on reindex. I did not trace how `fileIconsStore.frontmatterIcons` refreshes after an arbitrary frontmatter write; scout 05 covers icons.
- Lossy frontmatter is guarded before the icon write in the service (`auto-move.service.ts:203-207`, quiet skip) and by `FrontmatterWriteError`/`toastFrontmatterWriteError` in the icon service (`frontmatter-icon.service.ts:36-58`). An action editor needs no UI for this, but its docs should say writes are skipped for lossy frontmatter.
- UI for the per-action mode: `components/ui/select` and `components/ui/switch` exist (`src/lib/components/ui/` has button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip). A two-value control per action ("Only if missing" / "Always") fits an action row. Default should probably be fill-missing as in Issue 01 (the field name `defaultProperties` was chosen so it would not suggest an overwrite). The mode label must be explicit that "missing" includes empty values (Issue 01 rule 4: absent, null, empty string, empty list).
- "Nothing is reverted when a rule stops matching" is a copy item: say it once in the section description, otherwise users will expect the Auto Move-like feel of state following the rule.

## 3. Reuse vs new, for the action editor

Reuse as is:
- Section shell, `SettingItem`, list-of-rows layout, header controls (name, enable switch, up/down/delete), keyed `{#each}` by `rule.id`.
- `generateRuleId` (`auto-move.logic.ts:135`).
- Expression input plus inline error text; swap in Collection's stricter `validateExpression` and derive the error reactively (F3).
- `IconPicker` for icon and color picking with `AutoMoveIcon` as the value shape (F5).
- Excluded-folders chip list and `isInExcludedFolder`.
- Persistence skeleton: `.kokobrain/<file>.json`, load with defaults, explicit save with a 500 ms debounce for text inputs, `exists`/`mkdir`/`writeTextFile` (`auto-move.service.ts:70-88`).
- Test scaffolding from `AutoMoveRuleRow.test.ts` and `auto-move.service.test.ts`.

Reuse with adaptation:
- `PropertyType` plus typed-value helpers, not `PropertyField` itself (F6).
- `IconPicker` color-only mode via `onColorsChange`, or extract the swatch row (F5).
- `getAllKnownProperties`/`inferPropertyType` for key suggestions and value-type hints, filtered to writable keys.
- `resolveDestination` variable set as the value template vocabulary, if templated values are wanted.
- `resetBrokenSettingsFile` approach for a safe corrupt-file path.

New:
- Action list sub-component with add/remove/reorder and a discriminated union, for example `{ kind: 'setProperty', key, value, valueType?, mode } | { kind: 'setIcon', icon, mode } | { kind: 'setColor', color?, textColor?, mode }` (shape is a proposal for the owner, not an existing type).
- Per-action mode control and its copy.
- Per-entry normalizer on load for actions (unknown `kind`, bad `mode`, non-string key).
- A per-key apply mutate for `_icon/_color/_title_color` independent of `setIconForPath` (F7).
- Trigger selection UI (see Q2), because the existing only setting is the global save debounce (`AutoMoveSettings.debounceMs`, `settings.types.ts:287-292`; the debounce input at `AutoMoveSection.svelte:122-139`). "On property change, immediately" does not fit a debounce delay that is documented as "Seconds to wait after save before evaluating rules (0.5-30)".
- Optional: "N notes match" preview and a "does nothing" hint (Issue 01 asks for the latter inline, in the same style as the expression error, without blocking save).

## 4. Constraints a design must respect

1. All Settings UI strings, comments and code in English; tabs for indentation; imports ordered per CLAUDE.md; JSDoc on exported items.
2. Components are tested by mounting with real stores; do not mock `.logic.ts` or stores (CLAUDE.md Quick Reference 1). New logic (normalizer, mode semantics, "missing" check) belongs in a `.logic.ts` with happy, empty/null and error cases.
3. Layer rules: `features/auto-move` already imports `features/file-icons`, `features/collection`, `features/type-definitions` and `core/*`. A new feature folder that imports `features/auto-move` and `features/file-icons` is feature-to-feature (allowed); anything in `core/` importing it would be a new `layer-rules.test.ts` violation (`src/tests/lib/architecture/layer-baseline.json`, which only shrinks).
4. Any section addition forces the hardcoded id lists in `settings.logic.test.ts:372,382` to change; extending Auto Move does not.
5. The existing `examples-scoping.test.ts:231` parses `auto-move-rules.json` examples in `help/` and requires a path predicate in every rule's `expression` (`PATH_PREDICATE_RE`). Any new rule file shape that appears in help examples, or any change to `auto-move-rules.json` examples, interacts with this test. I only read the JSON branch (`:231-235`); I did not check the regex or whether a new filename would be scanned.
6. Per-rule `defaultProperties` from Issue 01 and a new `actions` list would overlap. Issue 01 is `ready-for-agent` and not shipped (git status shows only `.scratch/frontmatter-rules/` untracked; the Issue files exist at `2e2cc5b60`). Deciding before Issue 01 ships avoids a migration of a released field. If it ships first, `defaultProperties` maps losslessly to `setProperty` actions with mode fill-missing (string values only), so a one-way load-time migration is feasible, but then the file must carry a version or the loader must accept both shapes forever.
7. Blocker 001 (caret follows its text when frontmatter is rewritten) applies to any action that writes to the active note, regardless of which UI creates the rule. This is not a UI concern but it gates shipping.
8. Hand-edited JSON is a supported path (help examples, owner's own vault); the editor and loader should tolerate unknown fields and not drop them on save. Today `saveAutoMoveConfig` writes only `rules` and `excludedFolders` from the store (`:78-81`), and `setConfig` copies only those two keys (`auto-move.store.svelte.ts:22-26`), so unknown top-level keys are dropped on the next save. Per-rule unknown fields survive because rules are stored as objects (`rules: [...config.rules]`), as long as the row only merges partials.

## 5. Recommendation inputs (UI and persistence view only)

This area does not decide the architecture question; it prices each option.

- Extend Auto Move (same file, same section): cheapest UI and persistence. Zero registry changes, one rule list, one validation UX, one exclusion list, one config file, and help docs `22-auto-move.md` and `19-settings.md:236-245` extend in place. Costs: the section copy and the "first match wins" model would have to explain that a rule can also carry actions and when several rules apply; the debounced-after-save setting and a per-rule trigger would sit beside each other; a rule with a destination and a rule with only actions become the same card with an optional move (this is what Issue 01 already specifies: empty destination means no move).
- Separate feature (own section and file): clean mental model for "frontmatter rules" with all-match semantics and its own triggers, but duplicates the rule card, row header, expression validation, ID generation, config load/save, broken-file handling, excluded folders and test scaffolding unless extracted. That is the duplication the owner said to avoid. Also costs the 5 registry touch points and 2 hardcoded tests.
- Shared rule core used by both: the rule card, expression field, validation and load/save normalizer would be extracted to a shared module (for example under `features/auto-move/` or a new `features/rules/` that both sections import) and each feature keeps its own list and action set. The UI win is that fixing F3 (green-check bug, unknown-function check) and F4 (corrupt-file backup) happens once. Cost: a refactor of `AutoMoveRuleRow`/`AutoMoveSection`, which the Surgical Changes rule discourages without a request; sequencing it after a decision.

## 6. Questions only the owner can answer

1. One section or two? If the feature is a new section, should it also be visible as a new nav entry, and in which group (Vault next to Auto Move, or Notes)?
2. Triggers: per rule (checkboxes: save, property change, create, move, rename) or global per feature? The debounce delay today is global and only meaningful for save; "property change immediately" needs an explicit no-debounce path and a loop guard that the UI may need to explain.
3. Do all matching rules apply their actions (so up/down order only resolves conflicts, later wins or first wins?), or does first-match-wins stay? This changes the section copy at `AutoMoveSection.svelte:150-153` and what the up/down arrows mean.
4. Typed values: is string-only (Issue 01) enough, or are booleans, numbers, dates and lists needed for property actions (for example `_archived: true`, `tags`)?
5. Value templates: should a property value support variables such as `{basename}`, `{folder}`, `{year}`, a date stamp? If yes, reuse `resolveDestination`'s set or define a shared one.
6. Color without icon: should a rule be able to set only `_color` or `_title_color`? That needs `onColorsChange` wiring and the per-key apply path (F7).
7. Is silently losing a hand-edited, invalid `auto-move-rules.json` on the next UI edit (F4.3) acceptable, or should the loader back it up as `settings.json` does?
8. Should the new editor show the generated lifecycle rules (`type-lifecycle-rules.ts`) read-only? They are invisible in the UI today (`AutoMoveSection` lists only `autoMoveStore.rules`), and a shared rule core would make the question visible.

## 7. Not verified

- No component was mounted or run; the green-check bug (F3) and the null-rule throw (F4.2) come from reading code.
- Did not trace how `fileIconsStore.frontmatterIcons` refreshes after a non-`setIconForPath` frontmatter write (scout 05's area).
- Did not read `docs/agents/indexing-watcher-rules.md` or `live-preview-rules.md` (no Settings UI code touches those paths); the ADR-0019 watcher claim comes from the ADR text and its cited anchor, not a re-read of `fs.watcher.ts`.
- Did not read `help/documentation/22-auto-move.md` in full, nor the `PATH_PREDICATE_RE` definition in `examples-scoping.test.ts`.
