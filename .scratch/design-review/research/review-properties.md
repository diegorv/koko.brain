# Design review: Properties and type definitions

Scope: src/lib/features/properties, src/lib/features/type-definitions, UI parts of src/lib/core/frontmatter. Evidence: code read in full (PropertiesView, PropertyField, RelationshipSearch, NoteInfo, ViewDialog, TypeNameDialog, properties.service, SidebarSection, AppShell mount) and screenshots editor-live-preview-light.png, narrow-1024x700-editor-light.png, rail-types-light.png, editor-empty-state-light.png, settings-types-light.png.

Not verified: behavior in a running app (keyboard focus return, contrast ratios, how bits-ui handles focus), whether typing a value such as `true` into a text property is re-inferred as boolean on the next parse.

## Clear opportunities

### 1. Key rename and add-property fail silently, and the key input shows text that was never written
- PropertyField.svelte:52-58 calls `onRename` and ignores the result; PropertiesView.svelte:129-131 drops `renameProperty`'s boolean (properties.service.ts, returns false for a duplicate or a refused commit). The key `<input>` (L113-119) is uncontrolled, so after a refused rename it keeps the typed text while the store still holds the old key. Clearing the key and blurring leaves an empty field with a "key" placeholder while the property still exists.
- Value edits already handle this (`refusals` re-key, L33, L122); keys do not.
- PropertiesView.svelte:137-142 `addNewProperty` returns false on empty or duplicate key and the input just stays open, no message.
- Proposal: on refusal revert the key input to `property.key` and show an inline message under the row ("A property named X already exists"); same inline message under the add-property input, with `aria-invalid`. Add Enter (commit) and Escape (revert) to the key input.

### 2. A note without a type cannot be given one from the panel, and new properties are always text
- PropertiesView.svelte:165 renders the type row only when `_type` exists. rail-types-light.png (an untyped Daily note) shows only "Add property" and no way to pick a type. The type dropdown (L186-201) is the only place the type can change, and it is hidden exactly when it is needed.
- `addProperty` creates `type: 'text'` (properties.logic.ts:703-705) and the row's type icon (PropertyField.svelte:110) is not interactive, so the UI offers no way to make a list, number, date or checkbox property.
- Proposal: always show the type row; when empty show a "Set type" placeholder that opens the same dropdown (with a "No type" item and a "New type..." entry). Make the type icon of each row a button that opens a small type menu (Text, Number, Date, Checkbox, List), and let "Add property" ask for key plus type.

### 3. Icon-only buttons and inputs have no accessible names
- Zero `aria-label` in scope. Icon-only: PropertyField.svelte:147-153 (Add item), :158-164 (Remove property), :175-181 (Remove item), PropertiesView.svelte:278-284 (Remove, does not say which link), RelationshipSearch.svelte:44-50 (Add link). Name comes from `title` only, which is not reliably exposed.
- Inputs with placeholder only: key (PropertyField.svelte:113), value (:135), add-item (:187), add-property (PropertiesView.svelte:225), search (RelationshipSearch.svelte:55), ViewDialog.svelte:179, TypeNameDialog.svelte:64. The value input is not associated with its key. TypeNameDialog/ViewDialog error text has no `aria-describedby` (TypeNameDialog.svelte:66, ViewDialog.svelte:192); TypeNameDialog has no `aria-invalid`.
- Proposal: add `aria-label` including the key or target ("Remove property due", "Remove link Roadmap from Belongs to", "Value of due", "Add link to Related to"), link errors with `aria-describedby`, mark the checkmark entity (PropertiesView.svelte:197) `aria-hidden`.

### 4. Keyboard users cannot pick a relationship target
- RelationshipSearch.svelte:33-38 handles Escape only. Results are `<button>`s selected by `onmousedown` with `preventDefault` (L66-72) and the popover has `trapFocus={false}` (L53). No arrow navigation, no Enter-to-select, no active-row highlight. With an empty query the list is empty and no hint is shown (L63-90 renders only results or "No files found" when the query is non-blank).
- Proposal: copy the Quick Switcher pattern: ArrowUp/Down moves an active row, Enter selects, Tab closes; with an empty query show recently opened notes; keep selection on click, not mousedown.

### 5. Value and key fields have no visible keyboard focus
- PropertyField.svelte:139 `focus-visible:ring-0 border-none shadow-none` removes the shadcn ring and adds none back; :114 key input only changes text color on focus; RelationshipSearch.svelte:59 and PropertiesView.svelte:227 use `outline-none` with weak or no replacement. The plain `<button>`s in scope set no focus-visible style, while the Types navigator buttons in the same app use `focus-visible:ring-[3px] focus-visible:ring-ring/50` (TypesNavigator.svelte:221).
- Proposal: one shared focus style for panel controls (a 2px inset ring in `--ring`, or a subtle filled `bg-right-sidebar-accent` plus ring on focus-visible) applied to inputs, chips and icon buttons.

### 6. The panel is tall and pushes everything else off screen
- Properties is a static `SidebarSection` (PropertiesView.svelte:156, no `open` binding) while Table of contents, Backlinks and Outgoing links are collapsible (editor-live-preview-light.png: Table of contents at y=636, Info starts at y=755 with only 6 properties).
- The Relationships block always renders heading plus three labelled rows even when all are empty (PropertiesView.svelte:243-290; screenshot rows at y=511-593), about 100 px of empty chrome on every note.
- Proposal: make Properties collapsible with its state remembered; render empty relationships as a single "Add relationship" row (menu: Belongs to / Related to / Has many, then the note search) and show a relationship group only when it has links.

## Moderate

### 7. Narrow right sidebar truncates property names to one letter
- narrow-1024x700-editor-light.png: keys read "t...", "d...", "o...", values "P...", "activ". Row layout is icon + key `flex-[2]` + value `flex-[3]` + an always-reserved remove button (PropertyField.svelte:108-164; the type row reserves a dead `w-[16px]` spacer, PropertiesView.svelte:203). The pane allows `minSize={3}` (AppShell.svelte:271).
- Proposal: use a container query on the panel: below about 220 px stack key above value; take the remove button out of the flow (absolute, shown on hover or focus) so it does not eat width; enforce a sensible pane `minSize` or collapse to the stacked layout.

### 8. Type-name dialog closes before the work finishes and reports errors only as a long toast
- TypeNameDialog.svelte:40-45 sets `open = false` and then awaits `onConfirm`; Confirm has no pending state and Enter is unguarded. Failures come from toasts (type-definitions.service.ts:182, :187, :195, :244), after the dialog is gone, so the typed name is lost. The taken-name toast (type-definitions.logic.ts:158) is a multi-sentence message with `_type: Type` jargon. Renaming a type that updates many notes gives no progress.
- Proposal: keep the dialog open with a busy Confirm and inline error text until `onConfirm` resolves; shorten the taken-name message to one sentence with the fix on a second line; for rename show "Updating N notes..." in the dialog.

### 9. ViewDialog shows no loading state and disables Save with no reason
- ViewDialog.svelte:51-65, :78, :113: `loading` disables Save, but the template has no spinner or text; FilterPanel renders with empty groups until the read resolves (L198-215), so Edit view can look like a view with no filters. The disabled Save during `blankValue` is explained, during load or load error it is not (error only replaces the panel).
- Proposal: show a skeleton or "Loading view..." in place of FilterPanel while `loading`, and a small caption next to Save when it is disabled ("Fix the name" or "Every filter needs a value"). Use `text-meta` for TypeNameDialog's messages too (it uses `text-xs`, L66, L68).

### 10. List properties: chips cannot be edited, reordered or committed predictably
- PropertyField.svelte:168-201: chips are static spans with a hover-only remove button; the only way to change an item is delete and re-add. Enter in the add-item input keeps it open, blur adds and closes (L192-196), and the add button itself appears only on hover (L148). An empty list shows nothing but the key until hover.
- Proposal: click a chip to edit it in place, drag to reorder, keep the add input open after Enter, and show a visible "+" chip at the end of the list (empty list: "Add item" chip) instead of a hover-only icon.

### 11. Checkbox property is labelled with its value, not its key
- PropertyField.svelte:124-132: a native checkbox plus text `String(property.value)` ("true"/"false"). The accessible name is the value, and the visual text repeats what the checkbox already shows.
- Proposal: drop the text or render a switch; name it with the key (`aria-label` or `aria-labelledby` on the key input).

### 12. Info rows cut off their own date values and hide failures behind "--"
- editor-live-preview-light.png: "Modified November 10, 2026, 1..." and "Created November 10, 2026, 1..." truncate (NoteInfo.svelte:51 `truncate`, format in note-info.logic.ts:13-19). A read failure sets `entry = null` and shows `--`, indistinguishable from an unknown timestamp (NoteInfo.svelte:29-33).
- Proposal: use a shorter format ("Nov 10, 2026, 10:12") with the full text in the tooltip, or let the value wrap; show "Unavailable" with a retry affordance instead of `--` when the read failed.

### 13. Empty and unavailable states give no reason or next step
- PropertiesView.svelte:157-162: "No file open" and "Not available" (no explanation which file types are unsupported) with the three panel headers kept (editor-empty-state-light.png). The type dropdown with no defined types renders an empty menu (L186-201). Properties with zero entries show only "Add property" (L208, L234).
- Proposal: "Properties are available for Markdown notes" for other file types; "No types yet. Create one in Types" with a link when the dropdown is empty; when the whole sidebar has nothing to show, collapse to a single hint.

## Polish

### 14. Date values use the system locale format
- editor-live-preview-light.png shows `due 01/12/2026` (native `<input type="date">`, PropertyField.svelte:136) next to ISO dates in the note body ("2026-11-14"). The panel and the editor's meta-bind date show a day/month order that reads either as 1 December or 12 January.
- Proposal: show ISO (`2026-12-01`) in the panel value, or a custom date picker with the month spelled out.

### 15. Mixed sizes, tokens and copy
- Arbitrary font sizes `text-[13px]`, `text-[11px]` (RelationshipSearch.svelte:59, :79, :81, :89) next to `text-row` and `text-meta` tokens; `text-xs` vs `text-meta` for the same error role (TypeNameDialog.svelte:66 vs ViewDialog.svelte:192).
- Remove icon sizes `size-3` / `size-2.5` / `size-2.5` (PropertyField.svelte:163, :180; PropertiesView.svelte:283); input heights `h-6` vs `h-8` (RelationshipSearch.svelte:59).
- Title Case relationship labels "Belongs To", "Related To", "Has Many" (PropertiesView.svelte:54-56) vs sentence case elsewhere; tooltips "Remove" / "Remove property" / "Remove item" and "Add link" / "Add item"; placeholders with "..." vs "View name" / "Type name" without.
- Proposal: one size scale (token for the 13/11 px text), one remove-icon size, sentence case ("Belongs to"), one verb pattern ("Remove property", "Remove link").

### 16. Header and row alignment details
- Info (NoteInfo.svelte:43-47) is an `<h2>` with an icon and no chevron, starting at x=1227 while the collapsible sections start at x=1221 (editor-live-preview-light.png); "Relationships" is an `<h3>` inside a Properties `<h2>` (PropertiesView.svelte:245). The type row key is lowercase "type" while the rest use stored keys, and the "Add property" label is a faint `text-tab-text-inactive/60`, the add-item placeholder is 30% alpha (PropertyField.svelte:191).
- Proposal: align Info with the other section headers (chevron slot, same x), raise the "Add property" and placeholder contrast to the muted token without alpha.
