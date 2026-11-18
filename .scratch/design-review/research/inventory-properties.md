# Inventory: Properties and type definitions (UI facts)

Scope: `src/lib/features/properties`, `src/lib/features/type-definitions`, `src/lib/core/frontmatter` (UI-facing parts). Facts only, no proposals. Paths relative to repo root. Read-only pass.

## 1. Components

Total .svelte lines in scope: 941 (6 files).

| File | Lines | Renders | shadcn/ui primitives | Custom markup |
|---|---|---|---|---|
| `src/lib/features/properties/PropertiesView.svelte` | 293 | Right-sidebar "Properties" section: `type` dropdown, property rows, "Add property" row, "Relationships" block (Belongs To / Related To / Has Many) | `Separator` (`ui/separator`, L7), `DropdownMenu` Root/Trigger/Content/Item (L8, L170-202). Wrapper `SidebarSection` from `core/layout` (L11, L156) | Type trigger `<button>` (L174-177); add-property `<input>` (L225-231); "Add property" `<button>` (L234-240); relationship link rows `<button>` + `<div>` (L261-284); empty text `<p>` (L158, L160-162); `<h3>` "Relationships" (L245) |
| `src/lib/features/properties/PropertyField.svelte` | 202 | One property row: type icon, key input, value control (checkbox / text-number-date input / list chips), remove button | `Input` (`ui/input`, L10, used L135-143 only) | Key `<input>` (L113-119); boolean `<label>`+native checkbox (L124-132); list add `<button>` (L147-153); remove `<button>` (L158-164); list chips `<div>` (L168-201); per-item remove `<button>` (L175-181); add-item `<input>` (L187-197) |
| `src/lib/features/properties/RelationshipSearch.svelte` | 94 | Plus button that opens a file-search popover for a relationship | `Popover` Root/Trigger/Content (L4, L41-94) | Trigger `<button>` (L44-50); search `<input>` (L55-61); result `<button>` rows (L66-72); "No files found" `<p>` (L88-90) |
| `src/lib/features/properties/NoteInfo.svelte` | 55 | Read-only "Info" block: Modified, Created, Words, Size | none | `<h2>` "Info" (L44); row `div`s with `data-testid` (L48-53) |
| `src/lib/features/type-definitions/ViewDialog.svelte` | 221 | New/Edit view dialog: name input, filter panel (FilterPanel from `features/collection`), Cancel/Save | `Dialog` (L3, L167-221), `Input` (L4, L179-190), `Button` (L5, L217-218) | Error `<span>`/`<p>` (L192, L195, L199, L212). Filter panel is a feature component, not in this scope |
| `src/lib/features/type-definitions/TypeNameDialog.svelte` | 76 | Generic name dialog (new/rename type): one input, helper text, Cancel/Confirm | `Dialog` (L2, L55-76), `Input` (L3, L64), `Button` (L4, L72-73) | Error `<span class="text-xs">` (L66); "Saved as" `<span>` (L68) |

Non-component TS in these folders that render or shape user-visible text: `type-definitions/type-definitions.logic.ts` (copy at L157-159, L189, L192-193), `type-definitions/type-definitions.service.ts` (toasts L182, L187, L195, L244), `type-definitions/type-sidebar.logic.ts` (notes L441, L461, L486, L597-642), `core/frontmatter/frontmatter-write.service.ts` (toast copy L48-52, L64-72), `properties/bookmark-migration.service.ts` (toasts L57, L95, L105, L111), `properties/note-info.logic.ts` (labels L30-33, placeholder L4).

Shadcn UI primitives mounted but not in scope: `ui/popover/popover-content.svelte:20`, `ui/dialog/dialog-content.svelte:30`, `ui/dialog/dialog-overlay.svelte:16`, `ui/dropdown-menu/dropdown-menu-content.svelte:24` (all use `animate-in`/`animate-out`, dialog content adds `duration-200`).

## 2. States (empty / loading / error / disabled)

### Empty
- `PropertiesView.svelte:208`: the property list block only renders when `properties.length > 0`. With zero properties nothing is shown except "Add property" (L234-240). No empty hint.
- `PropertiesView.svelte:187-200`: type dropdown with no defined types renders an empty menu. No message.
- `PropertiesView.svelte:165`: the `type` row only renders when a `_type` property exists. No affordance to add one from this component.
- `PropertiesView.svelte:255`: each relationship block renders nothing when it has no links. No "None" text.
- `RelationshipSearch.svelte:88-90`: "No files found" only when query is non-blank. With empty query, the popover shows an empty list (no hint). Results capped at 20 (L25).
- `NoteInfo.svelte:48-53` with `entry === null`: rows fall back to placeholder `--` (`note-info.logic.ts:30-33`, `PLACEHOLDER = '--'` at L4). Not distinguishable from a real empty value.

### "Not available" / "No file open" (visible states)
- `PropertiesView.svelte:157-158`: "No file open" (no further guidance).
- `PropertiesView.svelte:159-162`: "Not available" for non-markdown tabs, no explanation of why or what is available.
- `NoteInfo.svelte:41`: renders nothing (entire block hidden) when the active tab is not a note. The two Properties states are shown in the same section, the Info block is hidden.

### Loading
- `PropertiesView.svelte:105-119`: re-parse is debounced 300 ms (L110-116) with no indicator.
- `NoteInfo.svelte:18-38`: async load of vault entries; no loading state, shows `--` until resolved.
- `ViewDialog.svelte:51`, `:78`, `:113`: `loading` flag is set and `blocked` includes it (L65), so Save is disabled. The template has no spinner or loading text. FilterPanel is rendered (L199-215) with the pre-load (empty) groups while loading.

### Error
- `PropertiesView.svelte:121-135` and `properties.service.ts:92`: frontmatter write errors surface only as a toast (`toastFrontmatterWriteError`, `core/frontmatter/frontmatter-write.service.ts:64-72`). No inline error in the field.
- `PropertiesView.svelte:137-142`: `addNewProperty` returns false on empty or duplicate key (`properties.service.ts:184-194`). The component silently keeps the input open with the typed text. No message.
- `PropertiesView.svelte:129-131`, `PropertyField.svelte:52-58`: rename uses `renameProperty`; a refused rename gives no component-level feedback (service path not traced further).
- `NoteInfo.svelte:29-33`: on read failure `entry = null` and error is logged via `error('NOTE-INFO', ...)`. The user sees `--` values with no message.
- `ViewDialog.svelte:191-193`: inline name error (`data-view-dialog-name-error`), shown only after typing (`typed`, L41, L191).
- `ViewDialog.svelte:194-196`: submit error `role="alert"`.
- `ViewDialog.svelte:198-200`: load error `role="alert"`; replaces the filter panel (L198 vs L200).
- `ViewDialog.svelte:211-213`: "Every filter needs a value" (blank operator value).
- `TypeNameDialog.svelte:63-69`: validation error shown only when `value.trim().length > 0` (`showError`, L30). No submit error display.
- `TypeNameDialog.svelte:40-45`: `open = false` runs before `await onConfirm(name)`, so the dialog closes before the operation resolves. Failures are only toasts from the service (`type-definitions.service.ts:182-244`).

### Disabled
- `ViewDialog.svelte:217`: Cancel disabled while saving.
- `ViewDialog.svelte:218`: Save/Create disabled when `blocked || saving` (L65).
- `TypeNameDialog.svelte:73`: Confirm disabled when `error !== null`. No disabled state while saving (no saving flag in this file).
- `PropertiesView.svelte`, `PropertyField.svelte`, `RelationshipSearch.svelte`: no disabled state anywhere (no `disabled` attribute or prop). Type dropdown, add, remove are always enabled.

## 3. Interaction

### Keyboard
- `PropertiesView.svelte:144-152` (add property): Enter adds, Escape cancels. No `onblur` (L225-231): blur leaves the input open with its text.
- `PropertyField.svelte:52-58` and `:117`: key rename commits on blur only (`onblur`). No Enter or Escape handling on the key input.
- `PropertyField.svelte:64-82` and `:138` (`oninput`): value commits on every keystroke, through `onUpdate` (write per keystroke). Number ignores empty and non-numeric (L73-77).
- `PropertyField.svelte:98-103` and `:190-197` (list add): Enter adds, Escape cancels (L194), blur adds then closes (L196). Enter on list-add does not close the input; the next blur commits.
- `RelationshipSearch.svelte:33-38`: Escape closes. No arrow-key navigation and no Enter selection. Selection is `onmousedown` with `preventDefault` (L68-71), not `onclick`. Keyboard-only users cannot pick a result.
- `ViewDialog.svelte:159-164`: Enter in the name input submits (`submit()`). Escape and outside click go through Dialog, guarded by `saving` (L102-103).
- `TypeNameDialog.svelte:47-52`: Enter confirms (`confirm()`), no guard on pending work.

### Focus management
- `PropertiesView.svelte:47-50`: `$effect` focuses the add-property input on bind.
- `PropertyField.svelte:37-39`: `$effect` focuses the list add-item input.
- `RelationshipSearch.svelte:41`: `queueMicrotask` focuses the search input on open. `trapFocus={false}` (L53).
- `ViewDialog.svelte:170-173`: `onOpenAutoFocus` overridden to focus the name input.
- `TypeNameDialog.svelte`: no `onOpenAutoFocus` override (default Dialog focus).
- No focus return logic in the components of this scope.

### Hover-only affordances (opacity-0 until hover or focus-within)
- `PropertyField.svelte:148`: list add button (`group-hover` / `group-focus-within`).
- `PropertyField.svelte:159`: property remove button.
- `PropertyField.svelte:176`: list item remove button.
- `PropertiesView.svelte:279`: relationship link remove button (`group-hover/rel`, `group-focus-within/rel`).
- Buttons stay in the tab order at opacity 0 and reveal on focus-within. Touch or no-hover pointers have no way to see them.

### Drag and drop, context menus, tooltips
- Drag and drop: none in scope (no `draggable`, `ondrag*`, drop handlers).
- Context menus: none in scope.
- Tooltips: no shadcn `Tooltip` used in scope. Only native `title` attributes: `PropertiesView.svelte:281` ("Remove"), `RelationshipSearch.svelte:47` ("Add link"), `PropertyField.svelte:151` ("Add item"), `:161` ("Remove property"), `:178` ("Remove item"), `NoteInfo.svelte:51` (value, full text).

### Click handlers on non-buttons
- None found in scope on `div`, `span`, `p`, `li`, `label` or headings. The boolean `<label>` (PropertyField.svelte:124) wraps a native checkbox, no handler.

## 4. Accessibility

### Icon-only buttons (no `aria-label` anywhere in scope; grep count 0)
- `PropertyField.svelte:147-153`: Plus, `title="Add item"`, no aria-label.
- `PropertyField.svelte:158-164`: X, `title="Remove property"`, no aria-label.
- `PropertyField.svelte:175-181`: X, `title="Remove item"`, no aria-label.
- `PropertiesView.svelte:278-284`: X, `title="Remove"`, no aria-label, no target name (title does not say which link).
- `RelationshipSearch.svelte:44-50`: Plus, `title="Add link"`, no aria-label.
- Text-bearing buttons (type trigger L174-183, "Add property" L234-240, file results L66-72) have visible text.

### Inputs without a programmatic label (placeholder only)
- `PropertyField.svelte:113-119`: key input (`placeholder="key"`, `data-property-key`). The key name is the value, no label.
- `PropertyField.svelte:135-143`: value input (placeholder "--"). Name not associated with the row's key.
- `PropertyField.svelte:187-197`: add-item input (placeholder "Add item...").
- `PropertiesView.svelte:225-231`: add-property input (placeholder "Property name...").
- `RelationshipSearch.svelte:55-61`: search input (placeholder "Search notes...").
- `ViewDialog.svelte:179-190`: name input (placeholder "View name"); dialog title only.
- `TypeNameDialog.svelte:64`: input (placeholder "Type name"); dialog title only.
- Error text is not linked to inputs: `TypeNameDialog.svelte:66` and `ViewDialog.svelte:192` have no `aria-describedby`. Only `ViewDialog.svelte:189` sets `aria-invalid`. `TypeNameDialog` has no `aria-invalid`.

### Boolean control
- `PropertyField.svelte:124-132`: checkbox wrapped in `<label>` whose text is `String(property.value)` (`true`/`false`, L131). Accessible name is the raw value, not the property key.

### Roles and headings
- `role="alert"`: `ViewDialog.svelte:195`, `:199`.
- `ViewDialog.svelte:189`: `aria-invalid` on the name input.
- Heading levels: `SidebarSection` title is `<h2>` (`core/layout/SidebarSection.svelte`, header markup), `NoteInfo.svelte:44` is `<h2>` "Info", `PropertiesView.svelte:245` is `<h3>` "Relationships".
- Type dropdown checkmark is a text entity `&#10003;` (`PropertiesView.svelte:197`) with no `aria-hidden` or label.

### Focus-visible styles
- `PropertyField.svelte:139`: value Input sets `border-none shadow-none focus-visible:ring-0`, which removes the shadcn focus ring (`ui/input/input.svelte` default has `focus-visible:ring-[3px]`). No replacement focus style. Value controls have no visible keyboard focus indicator.
- `PropertyField.svelte:114`: key input `outline-none focus:text-right-sidebar-fg`. Focus changes text color only.
- `PropertiesView.svelte:227`: add input `outline-none focus:border-ring`. Focus changes border only.
- `RelationshipSearch.svelte:59`: search input `outline-none`, no focus style.
- Buttons in scope set no `focus-visible` class. Their focus style is whatever the browser/base styles give. Shadcn Button (`ui/button`) has `focus-visible:ring-[3px]`, but the scope's icon buttons are plain `<button>`.

### Contrast/semantics notes
- Muted text tokens used for labels: `text-right-sidebar-muted-fg` (PropertiesView L169, L224, L250; PropertyField L114, L152, L173, L186), `text-tab-text-inactive/60` (PropertiesView L235), `text-right-sidebar-muted-fg/30` placeholder (PropertyField L191), `opacity-50` on unlinked relationship rows (PropertiesView L273). Contrast not measured.

## 5. Styling

### Raw color values
- No hex, rgb, or hsl literal in any scope component or scope `.ts` file. The only `#` match is the `&#10003;` entity (`PropertiesView.svelte:197`).
- Inline dynamic color: `PropertyField.svelte:173` `style="color: {tagColor ?? ''}"` (from `getTagColor`, settings-driven). `PropertiesView.svelte:268` and `RelationshipSearch.svelte:76` use `iconColorStyle(...)` (`file-icons.logic.js`). `PropertyField.svelte:140` sets `--date-input-fg: var(--right-sidebar-fg)` inline.

### Hard-coded font sizes (arbitrary px, not theme tokens)
- `RelationshipSearch.svelte:59` `text-[13px]` (input).
- `RelationshipSearch.svelte:79` `text-[13px]` (file name).
- `RelationshipSearch.svelte:81` `text-[11px]` (path).
- `RelationshipSearch.svelte:89` `text-[13px]` (empty text).
- Token sizes in use (`src/app.css:94-102`): `--text-meta` 12px, `--text-row` 14px, `--text-title` 15px. Scope uses `text-meta` (ViewDialog L192, L195, L199, L212; PropertiesView L158, L160, L168 dimensions), `text-row` (PropertiesView, PropertyField), `text-title` (NoteInfo L44).
- `TypeNameDialog.svelte:66` and `:68` use Tailwind `text-xs`, not the `text-meta` token used for the same error role in `ViewDialog.svelte:192`.
- `PropertyField.svelte:134-139`: `md:text-row` is explicitly added so cn() drops shadcn's `md:text-sm` (comment at L134). Input font sizes are overridden through class merging.

### Sizes and spacing (arbitrary and mixed)
- Arbitrary: `PropertiesView.svelte:203` `w-[16px]`; `flex-[2]`/`flex-[3]` (PropertiesView L169, L176; PropertyField L113, L139); `sm:max-w-lg` (ViewDialog L169), `sm:max-w-md` (TypeNameDialog L56); `w-64` (RelationshipSearch L53); `max-h-48` (L62).
- Input heights: `PropertyField.svelte:139` overrides shadcn default `h-9` with `h-6`. `PropertiesView.svelte:176` `h-6`, `PropertiesView.svelte:227` `h-6`, `RelationshipSearch.svelte:59` `h-8`.
- Remove icon size varies: `PropertyField.svelte:163` X `size-3` (property remove), `PropertyField.svelte:180` X `size-2.5` (item remove), `PropertiesView.svelte:283` X `size-2.5` (relationship remove). Add icons: `PropertyField.svelte:152` Plus `size-3`, `PropertiesView.svelte:224` `size-3.5`, `PropertiesView.svelte:238` `size-3.5`, `RelationshipSearch.svelte:49` `size-3`.
- Row/gap: rows use `px-2 py-1.5` (PropertyField L106, PropertiesView L166, L235), relationship rows `px-1 py-0.5` (PropertiesView L259), dialogs `gap-1.5`.

### Custom CSS
- No `<style>` blocks and no CSS files in scope.
- Utility class `section-label` defined in `src/app.css:140` (`@utility section-label`), used at `PropertiesView.svelte:245` and `:250`.

### Transitions and motion
- Transition classes in scope: `transition-colors` and `transition-opacity` (PropertiesView L166, L176, L235, L259, L279; PropertyField L106, L148, L159, L176; RelationshipSearch L46, L67). No explicit duration in scope (Tailwind default).
- No `animate-*` class in scope.
- `prefers-reduced-motion` / `motion-reduce`: none in scope and none in `src/app.css` (grep returned no matches).
- Mounted shadcn overlays animate: `ui/dialog/dialog-content.svelte:30` (`animate-in`/`animate-out`, `duration-200`), `ui/popover/popover-content.svelte:20`, `ui/dropdown-menu/dropdown-menu-content.svelte:24`.

### Theme tokens used
- Right sidebar: `text-right-sidebar-fg`, `-muted-fg`, `-primary`, `bg-right-sidebar-accent`, `bg-right-sidebar-accent/50`, `text-right-sidebar-fg/70`, `/80`, `/30`, `/60`. Defined in `src/app.css:185-189` (light) and `:249-253` (dark).
- Other: `text-tab-text-inactive`, `text-tab-text-inactive/60`, `bg-input-bg`, `border-input`, `border-border`, `border-divider`, `bg-accent`, `hover:bg-accent`, `text-muted-foreground`, `text-destructive`, `bg-destructive/10`, `rounded-xs`, `rounded-md`.
- Token inconsistency in `src/app.css` dark block: `--divider: #383a4f` (L237), `--right-sidebar-bg: #2a2e3d` and `--right-sidebar-fg: #F8F8F2` (L249-250) use hex, while neighboring tokens use `oklch(...)` (L233-235, L251-253). `--tab-text-*` (L259-260) and `--input-bg` (L266) are hex too. `src/app.css` has 135 hex literals in total (whole app).
- `z-index`: none in scope.

## 6. Copy

Case and style
- Section/group titles: "Properties" (PropertiesView.svelte:156), "Relationships" (L245), "Info" (NoteInfo.svelte:46). Title-case relationship labels: "Belongs To", "Related To", "Has Many" (PropertiesView.svelte:54-56), next to sentence-case controls ("Add property", "Remove property").
- Type row key is lowercase `type` (PropertiesView.svelte:169) while the other keys are shown as stored. Keys in the rest of the UI are written in the file's case.
- NoteInfo labels "Modified", "Created", "Words", "Size" (note-info.logic.ts:30-33), capitalized single words.
- Sort phrase "Sorted by the default: modified, newest first" (type-sidebar.logic.ts:486) uses lowercase "modified" and a colon style.

Placeholders and ellipses
- "Property name..." (PropertiesView.svelte:230), "Add item..." (PropertyField.svelte:190), "Search notes..." (RelationshipSearch.svelte:60) use "...".
- "View name" (ViewDialog.svelte:188) and "Type name" (TypeNameDialog.svelte:64) have no ellipsis.
- "key" (PropertyField.svelte:118) lowercase. "--" used as empty placeholder (PropertyField.svelte:142; PropertiesView.svelte:181; note-info.logic.ts:4).

Titles (native tooltips) and buttons
- "Remove" (PropertiesView.svelte:281) vs "Remove property" (PropertyField.svelte:161) vs "Remove item" (PropertyField.svelte:178). "Add link" (RelationshipSearch.svelte:47) vs "Add item" (PropertyField.svelte:150).
- Dialog heading "Edit view" / "New view" (ViewDialog.svelte:176) vs TypeNameDialog title prop "New type" (doc comment L12). Confirm labels "Save" / "Create" (ViewDialog.svelte:218), "Create" (doc L11 for TypeNameDialog).

Empty and status text
- "No file open" (PropertiesView.svelte:158), "Not available" (L161) with no reason.
- "No files found" (RelationshipSearch.svelte:89), no period, sentence case.
- "Every filter needs a value" (ViewDialog.svelte:212), no period.
- "Saved as "{savedName}"" (TypeNameDialog.svelte:68), quoted name, no period.

Error messages (user-visible)
- Validation: "Name cannot be empty" (type-definitions.logic.ts:189), "A view with this name already exists" (L193).
- Generic action error: `Could not ${action}: ${reason}` (fs.logic.ts:148-152), used by ViewDialog (L87, L93, L131, L151). Reason may be a raw `Error.message`.
- Type service toasts: `Could not create the "X" type` (type-definitions.service.ts:182, :195), a multi-sentence message with a period (service L244: "Type renamed, but updating member notes failed. Some notes may still reference ...").
- Type-name taken: multi-sentence message ending with "rename it." (type-definitions.logic.ts:158).
- Frontmatter write toasts: `${basename}: ${reason}` with reasons "The vault changed before the note was saved" and "The note was moved or deleted" (frontmatter-write.service.ts:50-51). No trailing period, unlike the type-service toasts.
- Bookmark migration toasts: "Kokobrain will try again next time the vault opens." (bookmark-migration.service.ts:57), sentence with period.
- Technical wording exposed through copy: `Ignored key _rail_view: ...` (type-sidebar.logic.ts:441), `Ignored key ${rule.key}: expected ${rule.expected}, got ${JSON.stringify(value)}` (L461), "The .view file's YAML does not parse: ..." (L597, L619, L640), "is not a mapping of keys" (L599, L621, L642). Note whether these reach the UI was not traced.
- Error text style differs: `text-xs` (TypeNameDialog) vs `text-meta` (ViewDialog) for the same role.

Terminology
- "type" (type-definitions, `_type` key), "view" (`.view` files), "note" (files), "property" (frontmatter key). "Type" and "View" are both used as dialog nouns; "Type name" vs "View name" follow the same pattern.
- Verb choice on the confirm button: "Save" for edit, "Create" for new (ViewDialog.svelte:218). TypeNameDialog takes the label as a prop, so the copy is set by each caller (not traced).

## 7. Known unknowns (not verified in this pass)
- Whether `RelationshipSearch` results can be reached by keyboard at all (no arrow handling found; not tested in a running app).
- Whether `LOSSY_FRONTMATTER_MESSAGES` copy (frontmatter-write.service.ts:48-49) is user-facing copy in the same style (not read).
- Contrast ratios of muted tokens (not measured).
- Keyboard and focus behavior of the bits-ui Dialog/Popover/DropdownMenu default focus return (only the overrides above were read).
