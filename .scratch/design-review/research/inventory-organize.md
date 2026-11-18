# Inventory: Auto-organize and inbox (src/lib/features/auto-organize)

Scope: UI facts only. Logic, service and store are cited only where they change what the UI shows.
Tests (not UI): src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts, AutoOrganizeRuleRow.test.ts, auto-organize.store.test.ts and others.
Entry point: src/lib/app/SettingsPanel.svelte:11 (import), :81 (`'auto-organize': AutoOrganizeSection`), :54 (nav icon FolderOutputIcon).

## 1. Components

Non-UI files in the area (no markup): auto-organize.logic.ts (971 lines), auto-organize.service.ts (777), auto-organize.store.svelte.ts (59), auto-organize.types.ts (116), type-lifecycle-rules.ts (62).

- **AutoOrganizeSection.svelte** (218 lines). Settings pane body.
  - Renders: h2 "Auto Organize" (:108); enable toggle via SettingItem (:110-121); debounce number input via SettingItem (:123-140); "Rules" h3 with Add rule button (:143-149); explanatory paragraph (:151-154); rule list or empty box (:156-174); "Excluded folders" h3, paragraph, add-input + Add button, chip list (:177-217).
  - shadcn/ui: Switch (:3, :114), Input (:4, :127, :184), Button (:5, :145, :192).
  - Custom markup: SettingItem from core/settings/sections (:10, a custom wrapper, not shadcn); chips are a custom `<span>` with a raw `<button>` (:205-214); empty box is a plain `<div>` with dashed border (:157); `<code>` inline (:153); `<datalist>` none here.
  - Icons: lucide PlusIcon (:6), XIcon (:7).
- **AutoOrganizeRuleRow.svelte** (549 lines). One rule card, one per rule.
  - Renders: header row with name Input, enable Switch, up/down/trash ghost icon buttons (:287-324); Filter row using the shared collection FilterPanel plus "Add expression" button (:327-362); "Then" label (:365); Rename row with source Select and text Input (:368-397); Move to folder row with Input and icon-picker button (:401-422); Set properties rows (:425-440); Create note block (path Input, template Input, property rows, "Open it" switch) (:444-496); Run mod action Select and optional input (:500-525); "does nothing" hint (:528-531); native datalist (:534-537); IconPicker (:541-549).
  - shadcn/ui: Input, Switch, Button, Select (:3-6).
  - Custom or feature components: FilterPanel (collection/toolbar, :23, :333); IconPicker, IconRenderer (file-icons, :12-13); the "Then" and label `<span>`s (:329, :365, :368, :401, :425, :443, :499) are plain spans, not labels.
  - Icons: Trash2, ChevronUp, ChevronDown, Image, Plus (:7-11).
- **AutoOrganizeRuleProperty.svelte** (378 lines). One property row, used both for "Set properties" (Row:428) and "Create note" properties (Row:469, allowRemove=false).
  - Renders: key Input (with datalist), source Select (value/expression), type Select (text/yes-no, :248-262), value cell that switches by editor kind (expr Input :266, Switch :274, icon Button :281, color Button :290, disabled JSON Input :298, items Input :305, text Input :314), mode Select (:323-341), delete button (:343-351), error or preview `<p>` (:354-358), refused-key note (:360-364), IconPicker (:366-378).
  - shadcn/ui: Input, Switch, Button, Select.
  - Custom: IconPicker, IconRenderer (file-icons); an unstyled `<span>` swatch for color (:291-294).
- Components rendering shadcn-only primitives in the area: none. No Tooltip, Dialog, Popover, DropdownMenu, Badge or Checkbox is imported anywhere in the area (grep of imports: Section:3-5; Row:3-6; Property:4-7).

## 2. States

Empty:
- Rules empty: rendered (Section.svelte:156-158), copy "No rules configured. Click \"Add rule\" to create one." in a dashed box.
- Excluded folders empty: nothing rendered; the whole chip block is conditional (Section:202). No empty-state text (:177-217).
- Match count: hidden when `countMatchingNotes` returns null (Row:354-361 gated on `matchCount !== null`; logic:147-157 returns null for invalid expression). No message says why the count is missing.
- Property lists (Row:427, Row:468): no empty copy; just the "Add property" button.
- Filter with no rows: `filterDraft` becomes `''` (Row:82), matches nothing, no hint.

Loading:
- No loading state anywhere in the area. `autoOrganizeStore.isConfigLoaded` (store:6, :15, :25) has no consumer under src/lib outside the store (grep). Config is loaded at app start from app-lifecycle.service.ts:313. Section therefore shows "No rules configured" before the config arrives (the empty box is not gated on load).
- Count and preview compute with a 300 ms delay (Row:66-67, :90-96) with no pending indicator; stale count until then (Row:354 shows only when `countedFilter === filterDraft`, so the count row disappears while typing, see Row:354).

Error:
- Save failure: Section catches and only logs (Section:33-39 `error('AUTO-ORGANIZE', ...)`). Service rethrows after logging (service.ts:182-200; catch at :196-199). No toast, no inline error in Section.
- Load failure: service logs and resets to defaults silently (service:132-135). The UI shows an empty rule list with no message. The next user edit calls saveConfig (Section:59, :78, :96), which writes the reset config over the file. Not verified in a running app.
- Per-row validation errors, all inline `<p class="text-meta text-destructive">` with no icon, no role, no aria-live:
  - Expression refused: Property:354-355 (`data-expr-error`), refused draft kept in the field (Property:73, :115-117).
  - Blank filter value: Row:352-353 (`BLANK_VALUE_ERROR`, logic:25 "Every filter needs a value").
  - Rename refused: Row:393-395, copy from logic:586-593 (e.g. "The name cannot be empty").
  - Create path refused: Row:451-456 "The path must end in .md and must not start with /. It is not saved."
  - Create template refused: Row:463-467 "The template must be inside the vault: no .. and not starting with /. It is not saved."
  - Mod action not loaded: Row:519-523 "No loaded mod lists this action in its ruleActions, so the rule skips it."
  - Refused key (`_type` etc.): Property:360-364.
  - Rule does nothing: Row:527-531 (hint, destructive color).
- Excluded-folder duplicate: silently ignored (Section:93), no message. Empty input: Add disabled (Section:195).
- Typed rename or path that is refused is not saved and not reverted: the field keeps the typed text while the rule keeps the old value (Row:198-199, :244-245, Property:115-117).

Disabled:
- Add button in excluded folders disabled when input is blank (Section:195).
- Up/down buttons disabled at list ends (Row:302, :311). The move up/down handlers also guard the index (Section:75, :84).
- JSON value cell is a disabled Input with a `title` only (Property:297-303). The reason is only in the tooltip text.
- Switch and Select have no disabled path in the area. `Input` has `disabled:` styles from the shadcn base only.

Not shown at all:
- No "saved" or "saving" indicator for any write.
- No progress or busy state for the 500 ms debounced save (Section:42-47).
- No state for an active run (no indicator that a rule ran on a note).

## 3. Interaction

Keyboard:
- Excluded-folder input: Enter adds (Section:188-190). No other keyboard handling in the area. No Escape handling, no keyboard way to reorder, add or delete rules.
- Rule name, destination, rename, key and value Inputs: no onkeydown. Commit is on `change` (blur or native Enter) for most fields (Row:390, :449, :461; Property:229, :271, :309, :318; Row:516).
- Arrow keys: none in area. Select (bits-ui) handles its own keys.

Focus management:
- No `focus()`, no `autofocus` in the area (grep). After "Add rule" (Section:145, :49-60) the new row is appended and not focused or scrolled into view. After "Add expression" (Row:347, :161-165) no focus move. After "Add property" (Row:435-438) no focus move.
- Property rows and create-note property rows are keyed by index (Row:427 `(i)`, Row:468 `(i)`). Local `$state` in the row (Property:67 exprError, :73 refusedExpr, :65 pickerOpen) follows the index, not the property, so deleting a middle row can attach an error or open picker state to the next property. Not verified in a running app.
- Rule list is keyed by id (Section:162 `(rule.id)`), which is correct.

Hover-only affordances:
- No `group-hover`, `opacity-0` reveal or hover-only control found in the area.
- Chip remove button (Section:207-211) is always visible, `size-3` icon, hover color only (`hover:text-foreground`, Section:208). Hit area is the icon.

Drag and drop:
- None. Reorder is by chevron buttons (Row:298-315; Section:72-88). The store comment says "for drag reorder" (store:43), which is stale.

Context menus: none in the area.

Tooltips:
- Only native `title` attributes: Row:412 (icon button), Property:281 ("Pick icon"), :290 ("Pick color"), :302 (JSON disabled field), :347 ("Delete row"), :357 (preview reason, `title={preview.reason}`).
- No shadcn Tooltip used.

Commit model (inconsistent by field):
- Rule name: per keystroke to store, debounced disk save (Row:288-293 via Section:62-65 and :42-47).
- Destination folder: per keystroke, debounced save (Row:402-407).
- Filter: commits on `change` of the wrapper and on `handleFiltersChange` when not typing (Row:331, :147-171).
- Rename text: local draft per keystroke (Row:389), commit on `change` (Row:390); blank removes the rename (Row:236-241).
- Create path and template: commit on `change` (Row:449, :461).
- Property key, value, expression: commit on `change` (Property:229, :271, :318); mode and source change save immediately (Property:138-150, :235, :326).
- Run action: select saves immediately (Row:257-260); action input on `change` (Row:516).
- Debounce delay number input: per input event, store-only (Section:127-139). No `saveConfig` call in this handler, so disk persistence depends on the settings store (settings.store.svelte.ts:306-311 assigns in-memory state only; persistence not traced).
- Debounce input clamps each event through `clampDebounce` (Section:29-31, :136). The `value` attribute is re-derived from the store (Section:133). Typing an intermediate value such as "0." may be rewritten under the cursor. Not verified in a running app.

Native pointer targets:
- Section:207 chip remove is a raw `<button>` with no `aria-label`.
- No click handler on a non-button element in the area. The filter wrapper uses `oninputcapture` and `onchange` on a `<div>` (Row:331).

Drag-to-drop, paste, and file input: none.

## 4. Accessibility

Icon-only buttons:
- Up (Row:298-306): no `aria-label`, no `title`.
- Down (Row:307-315): no `aria-label`, no `title`.
- Trash (Row:316-323): no `aria-label`, no `title`. Destructive color only.
- Chip remove X (Section:207-211): no `aria-label`, no `title`.
- Row icon button (Row:407-421): `title` only ("Icon: pack:name" or "Set file icon").
- Property delete (Property:343-351): `title="Delete row"` only.
- Property icon/color buttons (Property:281, :290) have visible text, so they are labelled by content.

Form controls without an accessible name:
- Section debounce number Input (Section:127-139): no label; the SettingItem `label` is a `<span>` (SettingItem.svelte:26), not associated.
- Section excluded-folder Input (Section:184-191): placeholder only.
- Section enable Switch (Section:114-120): no `aria-label`; the SettingItem span is not a label.
- Row name Input (Row:288-293): placeholder only.
- Row enable Switch (Row:294-297): no `aria-label`.
- Row destination Input (Row:402-407): placeholder only.
- Row "Then" block and "Move to folder", "Filter", "Set properties", "Create note", "Run mod action" labels are `<span>` elements (Row:329, :365, :368, :401, :425, :443, :499) not tied to controls.
- Labelled with aria-label: Row:376 (Rename source), :386 (Rename to), :446 (Create note path), :458 (template), :488 (Open it switch), :502 (Mod action), :513 (action input); Property:225 (key), :238 (source), :254 (type), :267 (expression), :275 (value switch), :299, :306, :315 (value), :328 (mode).
- Property value text Input (Property:314-319) has aria-label; the `Input` for JSON (Property:298-303) has aria-label too.

Roles and live regions:
- Errors and counts are `<p>` with `data-*` attributes; no `role="alert"`, no `aria-live`, no `aria-describedby` linking errors to their inputs (Row:353, :356-358, :394, :452, :464, :520, :528; Property:355, :357, :361).
- Rule list (Section:161) and chip list (Section:203) have no list roles. Chip list is `<div>`/`<span>`.
- Headings: h2 (Section:108), h3 (Section:144, :178). Rule card has no heading; "Then" is a `<span>` with `font-medium` (Row:365), not a heading.

Focus-visible:
- shadcn Button, Input, Select trigger and Switch carry `focus-visible:ring-[3px]` and `focus-visible:border-ring` (button.svelte:7; input.svelte:29, :44; select-trigger.svelte:22; switch.svelte:18).
- Custom chip remove button (Section:207-211) and the swatch-only spans have no focus style of their own.
- `<datalist>` backed inputs (Property:225-230) get no custom style.

aria-invalid: never set in the area. Error text is color only plus the `<p>`. shadcn Input/Button/Select define `aria-invalid:` styles (input.svelte:30, :45) that this area never triggers.

Color-only meaning: destructive red (`text-destructive`) is the only signal for errors and the "does nothing" hint (Row:527-531). Preview result is muted gray (Property:357).

Contrast: not measured. Muted text is `text-muted-foreground` (app.css, light `--muted-foreground: oklch(0.529 0.07 265)` at app.css light-mode block; dark value not checked).

## 5. Styling

Raw colors:
- Hex, rgb, hsl in area: none in the three `.svelte` files.
- Inline style: Property.svelte:293 `style="background-color: {property.value || 'currentColor'}"` (user-chosen color written into an inline style).

Hard-coded sizes and offsets:
- Arbitrary font sizes: none (`text-[` absent in area).
- Arbitrary spacing: `ml-[6.5rem]` used to align with the label column (Row:346, :353, :355), which equals `w-24` (6rem) plus `gap-2` (0.5rem). Fragile: any change to the label width needs the offset changed.
- Label column width `w-24` repeated: Row:329, :368, :401, :425, :443, :499; Section does not use it.
- Widths: Row Input `w-24` (Section:129 number input), `w-36` key (Property:224), `w-32` source (Property:238), `w-24` type (Property:254), `w-28` mode (Property:328), `w-32` rename source (Row:376), `min-w-48 basis-48` value (Property:264), `w-24` number input (Section:128). Not tied to tokens.
- Sizes: `size-7` icon buttons (Row:300, :309, :318, :411; Property:345); `size-3.5` icons (Row:305, :314, :322, :349, :418 etc.); `size-3` (Section:211; Row:349); `h-7` (Row:346).
- Spacing: gap-1, gap-1.5 (Section:203), gap-2, gap-3 (Row:355), p-3 (Row:285), p-6 (Section:157), mt-6 (Section:143, :177), mb-2 (Section:178, :183), mb-3 (Section:179), mb-4 (Section:108, :143 uses `mb-2` no), `px-2 py-1` (Section:205).
- Radius: rounded-lg (Section:157; Row:285), rounded-md (Section:205), rounded-xs (Section:153 code).
- Border dashed: Section:157.

Text tokens:
- `text-label` = 11px (app.css:92-93), used Section:205.
- `text-meta` = 12px (app.css:94-95), used across Row and Property and Section.
- `section-label` utility (app.css:140-141): 11px, semibold, uppercase, tracked, muted. Used Section:144, :178.
- `text-lg` (Section:108), `text-sm` via shadcn Input (input.svelte:28) and Select trigger (select-trigger.svelte:22).
- `font-mono` on the expression Input (Property:268).
- `font-medium` on Row:365 "Then" and the rule name Input (Row:289).

Theme tokens used in area: text-muted-foreground, text-foreground, text-destructive (and hover:text-destructive, Row:319), bg-muted (Section:153, :205), border-border (Row:285, Section:157), bg-setting-item-bg (Row:285), text-settings-text (SettingItem:26, not in area), bg-background (not in area directly).
- `--setting-item-bg` defined at app.css:265 (dark-ish block, `#20212d`). Light value not located in this scout.
- `--destructive` defined at app.css:170 and :231 (oklch).

Z-index: none in area. Select content z-50 comes from shadcn (select-content.svelte:30).

Transitions and animation:
- Section:208 `transition-colors` (chip remove).
- Row and Property: none.
- shadcn: Switch `transition-all` (switch.svelte:18) and thumb `transition-transform` (:26); Button `transition-all` (button.svelte:7); Input `transition-[color,box-shadow]` (input.svelte:28); Select content animate-in/out with `zoom-in-95`, `slide-in-from-*` (select-content.svelte:30).
- Durations: Tailwind defaults (150 ms for transition-colors and transition-all; not overridden in area).
- prefers-reduced-motion: no rule found in app.css or in the area (grep for `reduce` and `prefers-reduced` in app.css: no hits). Select animations and Switch thumb motion are not gated.

Custom CSS files in area: none. Shared CSS is app.css only.

## 6. Copy

Title and label case:
- h2 "Auto Organize" (Section:108) title case; toggle label "Enable Auto Organize" (Section:111) title case; "Debounce delay" (Section:124) sentence case; "Move to folder", "Set properties", "Create note", "Run mod action", "Rename", "Filter" (Row) sentence case or single word.
- Section h3 "Rules" and "Excluded folders" are uppercased by CSS (`section-label`, app.css:141). Source text is sentence case.

Button labels:
- "Add rule" (Section:146), "Add" (Section:198), "Add expression" (Row:350), "Add property" (Row:437), "Add note property" (Row:483). "Add" vs "Add X" is inconsistent; "Add note property" is the only one naming its target.
- Icon button titles: "Pick icon" (Property:281), "Pick color" (Property:290), "Set file icon" (Row:412), "Delete row" (Property:347). "Set file icon" vs "Pick icon" for the same action.
- "Open it" switch label (Row:489) is ambiguous (open what, when).

Select labels and option text:
- Mode options lowercase: "if missing", "always", "remove", "add to list" (Property:51-56). Other option sets are capitalized: "Value", "Expression" (Property:58), "Text", "Yes/no" (Property:57), "Name", "Expression" (Row:218). Mixed case within the same row.
- Rename source choice "Name" vs "Expression" (Row:380-381); the same concept is "Property value" "Value" in another control.

Placeholders:
- "Rule name" (Row:291).
- "Empty: do not rename, e.g. title" (Row:388); "Empty: do not rename, e.g. {year}-{month} Meeting" (Row:388).
- "Empty: do not move" (Row:405).
- "Empty: do not create, e.g. {folder}/{basename} follow-up.md" (Row:448).
- "Template note, e.g. _system/templates/Follow-up.md (empty: no template)" (Row:460): lowercase "empty:" in parentheses, while the other placeholders start with capital "Empty:".
- "Expression, e.g. file.basename" (Property:270); "Items, comma-separated" (Property:308); "Property" (Property:230); "Value" (Property:318); "_templates" (Section:190) is a folder example with no "e.g.".

Terminology drift:
- "Filter" (Row:329), "Expression" (Row:153 in Section, "Collection filters"), "Rules" vs "rule" vs "this rule".
- "mod action", "Mod action" (Row:502), "Run mod action" (Row:499), "rule actions" in code. Error copy exposes the identifier: "No loaded mod lists this action in its ruleActions" (Row:520-522). Suffix "(not loaded)" (Row:131).
- "Move to folder" (Row:401) vs "Destination" (not visible, code only) vs "Move" in Section:112 copy.
- "Would create N notes now" and "Matches N notes now" (Row:356-358). "now" repeats, and "Would create" uses the conditional tense for the count.
- "Create note" section (Row:443) vs "Add note property" (Row:483) vs "Create note path" (aria only).
- "Open it" vs "Open" elsewhere.

Descriptions and help text:
- Enable description: "Automatically move notes to folders based on rules when saved" (Section:112). Scope drift: the rule model also renames, sets properties, creates notes and runs mod actions (Row:401-496; logic types). The copy names only the move.
- Debounce description: "Seconds to wait after save before evaluating rules (0.5–30)" (Section:125). The number input shows no unit next to the value; the range uses an en dash.
- Rules help: "Rules are evaluated top-to-bottom. The first matching rule determines the destination folder." (Section:152). "destination folder" is out of date with the other actions (Section:152 vs Row:401 et al.).
- Excluded folders help: "Notes inside these folders will never be automatically moved." (Section:180).
- Empty rules: "No rules configured. Click \"Add rule\" to create one." (Section:158). Straight quotes in the UI copy.
- Rule hint: "This rule does nothing: set a new name, a folder to move to, a property to set, a note to create or a mod action to run." (Row:529-531). Lists the five outcomes but not the rename/icon consequences.
- JSON tooltip: "Numbers and lists are edited in .kokobrain/auto-organize-rules.json" (Property:302). Exposes an internal file path; no UI path to edit JSON.
- Refused key: "A rule never sets or removes {key}: Todoist routes tasks by it." (Property:362). Implementation detail in user copy.

Error copy:
- "The path must end in .md and must not start with /. It is not saved." (Row:453)
- "The template must be inside the vault: no .. and not starting with /. It is not saved." (Row:465). "It is not saved" repeats in both and is the only explanation of the state.
- logic copy: "Expression cannot be empty" (logic:520, :922); "Filter is not a list of conditions" (logic:45); "Filter has no conditions" (logic:47); "Rename needs a name or an expression" (logic:586); "Set a name or an expression, not both" (logic:588); "The name cannot be empty" (logic:590); "Invalid expression" fallback (logic:927). Mix of sentence fragments and full sentences; only some end in a period, and none is shown with its key.
- Preview: "Result for {basename}: {value}" (Property:177), "no value" when failed (Property:175).

Tone and voice:
- Mostly imperative ("Add rule", "Set a name..."), with some explanatory sentences. "Empty:" placeholders read as instructions. No obvious sycophancy or filler.
- Term "note" vs "file": Section:112 "notes"; Row copy "file" in filter examples (Section:153 `file.hasTag`). Consistent enough, but the Row placeholder "file.basename" (Property:270) is a developer expression.

Unit and punctuation:
- En dash in range (Section:125). Ellipsis: none. Em dashes: none in the area.

## Notable tests (orientation only)
- src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts, AutoOrganizeRuleRow.test.ts (component tests exist for both).
- src/tests/fixtures/AutoOrganizeRuleRowHarness.svelte (harness).
- src/tests/help/auto-organize-doc-examples.test.ts and auto-organize-switch-back.test.ts (doc-linked behavior).

## Not checked by this scout
- No browser run; all "not verified" items are reading-only.
- ui-ux-pro-max search script not run.
- Light-mode values for `--setting-item-bg` and `--muted-foreground` dark variant not confirmed.
- Persistence path for the debounce delay (settings store) not traced.
