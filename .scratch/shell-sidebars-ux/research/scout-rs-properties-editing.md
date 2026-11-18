# Scout: Properties panel editing cluster (P45, P44, P122)

Checked against HEAD `ab143a411` (main). Read-only: no tests, builds or git state changes. Haiku raw notes (`research/raw/P45.md`, `P44.md`, `P122.md`) were used as leads; every load-bearing claim below was re-read in the code. Where I corrected a raw note it says so.

Prototype: `.scratch/design-review/prototypes/right-sidebar.html` (P45 card at :417, handlers :885-990, helpers :664-735, demo :1039-1051; P44 card :453-458, demo :1169-1178, `commitKey` :853-865; P122 card :473-478, `chipsHtml` :680-696, demo :1264-1279). Screens: no screenshot shows the type row, the add form or a refused key. `screens/right-sidebar-default-light.png` is the only real-app reference for chips (MANIFEST.md:26).

## Code map (what runs today)

The whole surface is one folder, `src/lib/features/properties/`. `propertiesStore.properties` is read only inside this folder (codemap: 15 readers, all `PropertiesView.svelte` and `properties.service.ts`); nothing outside the feature consumes it. It is written only by `setProperties` (`properties.service.ts:97` commit, `:201` parse) and `reset` (`:207`).

| File | Role |
|---|---|
| `PropertiesView.svelte` (293 lines) | Panel. `typeProperty` = `_type` entry (:91), type dropdown block (:165-206, rendered only `{#if typeProperty}`), `sortedProperties` (:97-101, hides lifecycle, relationship and `_type` keys), `handleUpdate/Rename/Remove/AddProperty` (:121-152), add row (:221-241), Relationships (:243-290) |
| `PropertyField.svelte` (202 lines) | One row: type icon (:110, inert), key `<input>` (:113-119), value area in `{#key refusals}` (:122-155), remove button (:158-164), list chip block (:167-201) |
| `properties.service.ts` | `commitChanges` (:83-109, the single write path), `updateProperty` (:124, map-only, never appends), `upsertProperty` (:136, appends, returns void), `renameProperty` (:159), `addNewProperty` (:184), `removePropertyByKey` (:175) |
| `core/frontmatter/properties.logic.ts` | Pure: `addProperty` (:703, text only), `updatePropertyValue` (:719, `properties.map`, never appends, keeps value shape), `renamePropertyKey` (:735), `convertToProperty` (:173, type is INFERRED from the YAML value on every parse), `serializeProperties` (:605), `rebuildContent` (:677), `normalizeTypeCasing` (:811) |
| `core/frontmatter/properties.types.ts` | `PropertyType = 'text' \| 'list' \| 'number' \| 'date' \| 'boolean'` (:2), `Property` (:5-12) |
| `utils/frontmatter-aliases.ts` | `canonicalizeKey` (:29): exact lookup, no case folding. `type` -> `_type` |
| `features/type-definitions/type-definitions.store.svelte.ts` | `sortedTypes` (:48), the list behind the note-type dropdown |
| `utils/date.ts` | `formatNow('YYYY-MM-DD')` (:15), usable for a "today" default |
| `properties.store.svelte.ts` | `properties`, `sourcePath`, `setProperties`, `reset`. No change expected |

Callers (codemap `callers`): `addNewProperty` 1 (`PropertiesView.svelte:138`), `renameProperty` 1 (`:130`), `upsertProperty` 1 (`:74`, relationships), `updateProperty` 3 (`:76`, `:87`, `:126`), `addProperty` 2 (`properties.service.ts:192`, `file-icons/frontmatter-icon.service.ts:23`). So changing the service signatures touches one component only.

Two facts that shape every ticket here:

1. The `type` of a property is never stored. `convertToProperty` (:173-204) re-infers it on each parse: array -> list, boolean, number, ISO date string (`ISO_DATE_REGEX`, :40) -> date, everything else text. `serializeProperties` (:609-625) writes a non-list value as `doc.set(p.key, p.value)`, so a `number` or `date` property whose value is `''` is written `key: ""` and re-parses as text. The panel keeps the chosen type only until the next parse. (Raw P45 note missed this.)
2. The commit path is `commitChanges` -> `propertiesStore.setProperties` + `syncExternalContentToEditor`, and the skip flag stops the panel's own re-parse once. Tests exercise it with the real `propertiesStore` and `editorStore`, mocking only Tauri (`properties.service.test.ts`, `properties-refusal-toast.test.ts`); `PropertiesView.test.ts` additionally mocks `editor.service.js` (a side-effect service, allowed), so view tests assert on `propertiesStore` state and the mock's call args, not on tab content.

## P45. Untyped notes cannot get a type, new properties are always text

**Still real: yes.** Two concepts hide behind the word "type" and the review mixes them:

- the NOTE type (`_type`, the dropdown at the top, values from type definitions), and
- the PROPERTY type (text, number, date, checkbox, list: how one value is edited and written).

Prototype: "Set type" = note type; "row icon opens a type menu" and "Add property: name plus a type" = property type. Tickets must keep the two apart, including in labels ("Change property type").

Current behaviour:
- `PropertiesView.svelte:165` `{#if typeProperty}` wraps the whole type row. An untyped note shows no row. Type row icon (:168) is a plain `<Blocks>`.
- Trigger label is `{typeName || '--'}` (:181); no "Set type" string exists in `src/`.
- Menu items call `handleUpdate('_type', t.name)` (:190) -> `updateProperty` (`properties.service.ts:124-133`) -> `updatePropertyValue` (`properties.logic.ts:719-727`), a `properties.map` that skips absent keys. For an untyped note this commits an UNCHANGED list. Confirmed in code; a "Set type" built on `handleUpdate` would do nothing visible. The append path is `upsertProperty` (:136-151), which returns `void` (fine, the type menu needs no refusal UI).
- Choosing the type that is already set also commits an unchanged list today. That is exactly the no-op-commit trigger of open-itens 008 (skip flag armed with `newContent === content`). The new menu should not commit when the chosen name equals `typeName`.
- Property row icon: `PropertyField.svelte:110` is `<IconComponent>` from `typeIcons` (:42-50); `Props` (:15-21) has no type callback, and `onUpdate`'s optional third parameter `type` (:18) is never passed by the component. The service accepts it already (`updateProperty(key, value, type)`).
- Add: `addProperty` (`properties.logic.ts:703-705`) hard-codes `{ value: '', type: 'text' }`; `addNewProperty(key)` (:184-194) takes no type; add row is one input (`PropertiesView.svelte:221-233`).

What the prototype wants:
- Type row always present. Untyped: dashed "Set type" button with chevron; typed: name with dot. Menu `role="menu"` with a check on the current type (`typeRow`, :668-678; CSS `.p-type.ph` :180-181).
- Row icon becomes a button (`title="Change property type"`, `aria-label="Change type of {key}, now {type}"`, `aria-haspopup="menu"`) opening a "Property type" menu of the five `PropertyType`s (`ptMenu/pickPt`, :894-906). `pickPt` also converts the value shape (list wraps to array; boolean coerces; others join arrays).
- Add form: name input, a `role="radiogroup"` of five type chips, Add and Cancel buttons (`addProp`, :726-733; `addCommit` :941-951). Enter in the name field commits.
- The prototype is in-memory only; its type list is sample data. `newValue(t)` is `[]`, `false`, or `""` (:871), which does NOT persist for number and date (see fact 1).

Design points a ticket must settle:
1. Write path for Set type: `upsertProperty('_type', name)` (needs no new service function). Position: it appends at the end of the frontmatter; `event-calendar-event.logic.ts:346-347` prepends `_type`. Default: append (reuse as is).
2. Untyped includes `_type: ""` (empty value). Today that shows `--` and `PropertiesView.test.ts` ("shows the empty placeholder for an empty value", the last test of the file) asserts it. Default: show "Set type" for both absent and empty, and change that test's expectation in the same commit (a deliberate copy change, not a weakened check).
3. Empty `availableTypes` (no type definitions): menu would be empty. Needs an inline "No types defined" row; the free-form `_type` values still exist in the vault (docs `25-types-and-relationships.md:16` says types are free-form), but the menu only lists definitions. Whether the menu should also offer a free-text entry is out of scope; state it in the ticket.
4. No "remove type" item exists today and P45 does not ask for one. Do not add.
5. Untyped notes may have no frontmatter at all. `commitChanges` -> `rebuildContent` creates the block (`properties.logic.ts:677-686`): fine. But an `---\n---\n` empty block is NOT matched by `FRONTMATTER_REGEX` (:38, needs `\n` before the closing fence), so `extractBody` returns the whole content and `rebuildContent` prepends a second block. The existing service test "still adds to an empty frontmatter block" (`properties.service.test.ts:424`) only asserts `author:` and `Body` are present, so it does not catch the stacking. Open-itens 005 and 022 own that bug (see Overlaps). The Set type test should cover the no-frontmatter note; the empty-block note is a known gap, name it in the ticket.
6. Property type conversion (the risky part). A pure helper `convertPropertyValue(value, from, to)` is mandatory: `PropertyField.svelte:35` reads `listItems = property.value as string[]` when `type === 'list'`, `:127` reads `checked={property.value as boolean}`; a type switch that leaves the old value shape makes `{#each}` iterate the characters of a string. Rules to fix in the ticket (defaults in brackets): to text [`String`, list joined with `", "`, boolean as `"true"/"false"`]; to number [numeric string -> number, otherwise 0, never `''`]; to date [ISO-shaped string kept, otherwise today via `formatNow('YYYY-MM-DD')`]; to boolean [`true`/`"true"` -> true, everything else false]; to list [empty -> `[]`, string -> `[string]`].
7. Persistence round trip. Because type is inferred, a conversion that cannot survive `serialize -> parse` silently reverts on the next parse. Known cases: any `number`/`date` with `''` (hence the non-empty defaults above), and "text" for a value that already looks like an ISO date or a bare number (a quoted `"2026-11-17"` re-parses as date). Acceptance test for the conversion helper: for every (from, to) pair the converted property, run through `serializeProperties` then `parseFrontmatterProperties`, reports the chosen type; pairs that cannot (date-shaped value -> text) are disabled in the menu or return the unchanged property. Default: disable the item.
8. Typed add defaults (same reason): text `''`, list `[]`, boolean `false`, number `0`, date today. The existing add of text must stay one Enter press: `e2e/specs/properties-cross-note.spec.ts:106-110` clicks "Add property", fills "Property name...", presses Enter. Keep placeholder, Enter-commits, and default type text. (Raw note listed `auto-organize-flows.spec.ts:35` as an overlap: wrong, it is the Auto Organize rule builder panel with a "Property key" field.)
9. Type chips control: `components/ui/` has no radio group or toggle group (listing: button collapsible command context-menu dialog dropdown-menu input popover resizable scroll-area select separator switch tooltip). A `role="radiogroup"` obliges arrow-key navigation; simpler and accessible: a `role="group"` of `aria-pressed` buttons. Layout at 250 px: five icon+label chips wrap; acceptable.
10. Reactivity: nothing outside the feature reads `propertiesStore`, so no consumer chain beyond `PropertiesView`/`PropertyField`; after Set type, the rail and note list pick the new type from the file save through the existing index path (the 500 ms frontmatter timer, `properties.service.ts:104-106`), not from the panel.

Test files and seams:
- `src/tests/lib/features/properties/PropertiesView.test.ts`, describe "PropertiesView type selector" (:184-274): real `typeDefinitionsStore` (`setEntries`, `setTypeMetadataMap`), `openMenu()` (pointerdown) and `menuItem()` helpers, `mountNote()`. Add `mountUntyped()`; assert the placeholder, then click an item and assert `propertiesStore.properties` contains `{ key: '_type', value: 'Podcast', type: 'text' }` and the mocked `syncExternalContentToEditor` received content with `_type: Podcast`.
- `src/tests/lib/features/properties/properties.service.test.ts`: `addNewProperty` describe (:296-380, add a typed case; existing cases stay green if the new parameter is optional), `upsertProperty` (:143), plus a new `changePropertyType` describe.
- `src/tests/lib/core/frontmatter/properties.logic.test.ts`: `addProperty` (:986-1006) stays green with an optional third parameter (corrects the raw note, which said the default change would break these tests); new `convertPropertyValue` and default-value cases, including the serialize/parse round trip.
- `src/tests/lib/features/properties/PropertyField.test.ts`: icon button, menu items, `onType` callback. Mount `PropertyField` directly with callbacks (no store, no mock), as the file does today.
- E2E: no spec drives the type row or the type menu. `properties-cross-note.spec.ts` add helper must keep working (point 8).

## P44. A refused key rename or add fails silently

**Still real: partial.** The duplicate and blank cases are silent and the key field keeps text that was never saved. "Fails silently" overstates it in one respect: a refusal caused by frontmatter the rewrite would lose already toasts (`properties.service.ts:87-95`, id `frontmatter-refused:<path>`). Review Validation "revise: the add input already handles Enter and Escape" is correct (`PropertiesView.svelte:144-152`).

Current behaviour:
- `PropertyField.svelte:52-58` `handleKeyBlur`: trims; skips when blank or equal to `property.key`; calls `onRename(property.key, newKey)` and discards the result (`onRename` is typed `=> void`, :19). Blank key: the input keeps the blank text, nothing is saved or said. A padded `" status "` (equal after trim) also stays padded.
- Key `<input>` (:113-119) has `value={property.key}` (one-way), `onblur`, no `onkeydown`, no `aria-label`, no `aria-invalid`. It sits outside `{#key refusals}` (:122), and `refusals` (:29-33) is bumped only by `commitValue` (:60-62). Svelte does not rewrite the DOM value when `property.key` is unchanged, so the typed text stays.
- `PropertiesView.svelte:129-131` `handleRename` drops the boolean. `renameProperty` (`properties.service.ts:159-172`) returns false on a canonical duplicate (:164-169, `canonicalizeKey` so `color` collides with `_color`) with no reason; `addNewProperty` (:184-194) returns false for blank (:186) and duplicate (:191).
- `handleAddProperty` (`PropertiesView.svelte:137-142`) keeps the input open on false and shows nothing. The add input (:225-231) has no error markup and no `aria-label`.
- After an ACCEPTED rename the row remounts: `{#each sortedProperties as property (property.key)}` (:210) is keyed by key and re-sorts alphabetically, so focus is lost. A refused rename keeps the component, which is why a local `refusals`-style reset works for the key too.

What the prototype wants (`commitKey` :853-865, `keyKey` :908-913): Enter commits, Escape reverts (`el.value = data-pk`, blur), blur commits, typing clears the error; error `<p class="p-err" role="alert">` under the row naming the key ("A property named X already exists"), key input `aria-invalid="true"` + `aria-describedby`; add input shows the same message (`aria-describedby="add-err"`).

Divergences between prototype, proposal text and code (settle in the ticket):
1. Proposal says "restore `property.key`". The mock keeps the typed text on a duplicate and marks it invalid; it restores only on Escape. Default: follow the proposal text (restore plus message), because the problem statement is "shows text that was never saved". Set `aria-invalid` only while the message is shown; clear it on focus or input.
2. Proposal says "a blank key reverts". The mock's blank branch returns without touching the field. Default: revert, silently (a blank key needs no message; the label says what it is).
3. Mock duplicate check is case-insensitive; code is exact (`properties.service.ts:163-169`, `frontmatter-aliases.ts:29-31`), so `Status` and `status` are different keys today. Default: keep exact, matching the service tests (`properties.service.test.ts:224`, `:248`).
4. Alias twin: renaming `foo` to `type` while `_type` exists is refused by the canonical check, so the message must name the EXISTING key (`_type`), not only what the user typed.

Design points:
- A refusal REASON is needed (boolean cannot tell duplicate from blank from lossy). Recommended shape: a pure `propertyKeyRefusal(properties, key, exceptKey?)` in `properties.logic.ts` returning `null | { reason: 'blank' } | { reason: 'duplicate', existingKey }`; the service calls it in `renameProperty` and `addNewProperty` and KEEPS its boolean returns (existing service tests stay green), `PropertiesView` calls it for the message. A component-facing `onRename` becomes `(old, new) => string | null` (message or null). Existing `PropertyField.test.ts` helpers pass `onRename: () => {}` (three render helpers); with `string | null` they must become `() => null` or `pnpm check` fails.
- Enter must commit through `input.blur()` and let the one blur handler run, not call `onRename` directly: an accepted rename removes the focused row, and a second handler firing on removal would call `onRename(oldKey, ...)` for a key that no longer exists, producing a commit that changes nothing (open-itens 008).
- Escape: reset `input.value` to `property.key`, clear the message, blur. The blur-commit then sees equal keys and does nothing.
- If the service still returns false after the helper passed (lossy frontmatter, or `propertiesMatchActiveNote` false), restore the key and show no inline message: the toast already explains the lossy case, and the other case re-parses the panel.
- Unique ids for `aria-describedby`: `$props.id()` is used elsewhere in the repo (`TasksView.svelte:144`); keys can contain spaces, so do not build ids from them.
- Add input: message below, `aria-invalid`, cleared on input. Blank Enter stays a silent no-op.

Test files and seams:
- `PropertyField.test.ts` has no key-field tests (no blur, keydown, Enter or Escape). Mount the real component with an `onRename` callback returning a message; dispatch `FocusEvent('blur')` on the input, and `KeyboardEvent('keydown', { key, bubbles: true })` (Svelte delegates `keydown`; confirm in the test). Assert the input value is restored, the `role="alert"` text, `aria-invalid`, Escape, and that Enter results in one `onRename` call.
- `PropertiesView.test.ts`: real stores. Set `propertiesStore` through `parseAndSetProperties`, rename to an existing key, assert the visible message and that `propertiesStore.properties` is unchanged; add duplicate shows the message.
- `properties.logic.test.ts`: `propertyKeyRefusal` (blank, exact duplicate, alias twin, same key excepted, trims).
- `properties.service.test.ts`: existing rename/add refusal cases stay as the regression guard.
- `properties-refusal-toast.test.ts` covers the lossy refusal that already reports.
- E2E: `properties-cross-note.spec.ts` reads keys with `input[data-property-key]` (:66) and adds via Enter (:106-110); neither changes. Keep `data-property-key` on the input.

## P122. List chips cannot be edited; an empty list shows only the key

**Still real: yes** (review Validation "revise" matches: Enter keeps the add input open, `PropertyField.svelte:192-195`; `addListItem` :90-96 never sets `isAddingListItem = false`).

Current behaviour:
- Chip = `<div data-property-list-item>` with `<Tag>`, `<span class="truncate">`, and a remove button (:172-182). No `ondblclick`, no edit state. Chips are keyed by index (`{#each listItems as item, i (i)}`, :170).
- Add, remove and property-remove buttons are `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100` (:148, :159, :176), so they are keyboard-reachable through `focus-within` but invisible at rest.
- Empty list: the block renders only when `listItems.length > 0 || isAddingListItem` (:168). The main row for a list is an empty spacer plus the hover-only plus (:146-153).
- Refusal is ignored on the list path: `removeListItem` (:84-88) and `addListItem` (:90-96) discard `onUpdate`'s boolean, and `addListItem` clears `newListItem` unconditionally (:95). The chip block is outside `{#key refusals}`.
- `handleListKeydown` (:98-103) is dead code (the template uses an inline `onkeydown`, :192-195). Pre-existing; mention, do not delete unless the ticket touches that block.
- Tag icon colour: `getTagColor(item, settingsStore.tagColors.colors)` only when `property.key === 'tags'` (:171), computed per chip from the item text, so an edited chip recolours itself.

What the prototype wants: double-click a chip swaps it for `.chip-edit` with `<input aria-label="Edit item">`, autofocus and select; Enter commits, Escape cancels, blur commits; commit trims and an EMPTY result removes the item (`chipCommit` :966-971; not in the review text). Empty list shows a dashed `+ Add` chip (`.chip.addchip`, :692-693) that opens the add input (`aria-label="Add item"`), Enter keeps it open, Escape closes, blur adds if non-empty then closes. Non-empty lists keep the existing hover-only plus (`.p-acts`, opacity 0 until row hover or focus-within, CSS :186-210) and hover-only chip `x`. Reorder is not in the prototype.

Design points:
1. Edit state: local `editingIndex` (+ draft). Escape must set a cancelled flag or null the index BEFORE blur fires, so the blur handler does not commit (same pattern as the add input, whose Escape clears `newListItem` so its blur adds nothing, :194-196). WebKit removal-blur ordering cannot be verified in jsdom; use the flag.
2. Commit rules (defaults follow the prototype): trim; unchanged -> no `onUpdate`; empty -> remove the item; otherwise replace at index. Duplicates stay allowed (`addListItem` allows them today).
3. Refused commit (`onUpdate` false): the chip returns to its stored text on its own because the chip text derives from `property.value`; no `{#key}` rebuild needed. Optionally keep `newListItem` text when an add is refused (today it is lost while the toast explains); small, include as an acceptance criterion only if the owner agrees.
4. Keyboard entry: double-click has no keyboard equivalent. Default: make the chip text focusable and open edit on Enter or F2 as well. Without it, in-place edit is mouse-only while the remove button is already keyboard-reachable.
5. Empty-list "+ Add" chip: replaces the "renders no block" state. Not for non-empty lists (default, as in the prototype); the hover-only plus stays.
6. Drag-to-reorder: optional in the review, absent in the prototype, no drag code in the feature. Default: exclude and say so in the ticket.
7. Chip width in edit mode: input needs `min-w` and must keep `max-w-full min-w-0` of the existing chip (test "lets a long item shrink", `PropertyField.test.ts:152-157`).

Test files and seams:
- `PropertyField.test.ts`, describe "PropertyField list items" (:116-176): `render(value)` already records `onUpdate` calls with no store. `renders no block for an empty list` (:170-175) asserts the exact behaviour P122 changes; it must be replaced by "empty list shows an Add button and no chips", with the intent stated in the commit. Add: dblclick opens an input with the item text; Enter replaces and calls `onUpdate('tags', [...])`; Escape cancels with no call; blur commits; empty text removes; refused update keeps the old chip; Add chip opens the add input and Enter keeps it open.
- Dispatch `new MouseEvent('dblclick', { bubbles: true })` (Svelte delegates `dblclick`; confirm in the first test).
- E2E: no spec covers chips (no `data-property-list-item` hit under `e2e/`); not required.

## Candidate tickets

Grouping rationale: P44 and P122 are both `PropertyField.svelte` behaviours but in disjoint regions (key input vs chip block) and different tests; merging them would give one agent two unrelated state machines. P45 splits along its independent risky part: the property-type conversion (value shape, round trip) is separate from "Set type" plus "typed add", which share the same component (`PropertiesView.svelte`), the same test file and the same service function (`addNewProperty`/`upsertProperty`).

Order within the cluster: T1 -> T2 -> T3, with T4 free after T1.

### T1. A refused key rename or add reverts and says why (P44)
- Size: S. Gate: frontend only (`pnpm check` + `pnpm vitest run`).
- Files: `PropertyField.svelte` (key input :113-119, props :19), `PropertiesView.svelte` (`handleRename` :129-131, add row :221-233, `handleAddProperty` :137-142), `core/frontmatter/properties.logic.ts` (new `propertyKeyRefusal`), `properties.service.ts` (`renameProperty` :159, `addNewProperty` :184 call the helper; boolean returns unchanged). Tests: `PropertyField.test.ts`, `PropertiesView.test.ts`, `properties.logic.test.ts`, `properties.service.test.ts`.
- Blockers: shares `PropertyField.svelte` and `PropertiesView.svelte` with rs-properties-layout P121 (rewrites the main row :108-164 and the type-row spacer :203) and P43 (Properties section chrome, Relationships :243-290). Recommended order: P121 first, then T1; if run in parallel expect a trivial merge on the key input. Shares `addNewProperty` with T2: T1 first.
- Acceptance criteria (each starts with a failing test):
  1. `propertyKeyRefusal` (logic test): blank, exact duplicate, alias twin (`type` vs `_type` returns `existingKey: '_type'`), `exceptKey` ignored, input trimmed.
  2. `PropertyField` (mounted, `onRename` returns a message): blur on a duplicate key restores `property.key` in the input and shows one `role="alert"` message that names the key; the key input has `aria-invalid="true"` and `aria-describedby` pointing at it.
  3. Blur on a blank key restores `property.key`, no message. A padded `"  status "` also resets to `status`.
  4. Escape restores and clears the message; Enter commits with exactly one `onRename` call (blur path), and typing or focusing clears the message.
  5. `PropertiesView` with real stores: renaming `status` to an existing `priority` leaves `propertiesStore.properties` unchanged and shows the message; renaming to a free key still renames.
  6. Add row: a duplicate name shows the same message (`aria-invalid`, `role="alert"`), keeps the input open, clears on input; blank stays a silent no-op.
  7. A lossy-frontmatter refusal still shows only the toast, no inline message; the key is restored (`properties-refusal-toast.test.ts` stays green).
  8. `properties.service.test.ts` rename and add refusal cases pass unchanged.

### T2. "Set type" row for untyped notes and typed new properties (P45, first half)
- Size: M. Gate: frontend only; run the E2E add-property helper spec only if the add markup changes beyond what T1 left (`bash scripts/e2e.sh`, never `pnpm dev`).
- Files: `PropertiesView.svelte` (type row :164-206 always rendered, add form :221-241 with type chips and Add/Cancel), `properties.service.ts` (`addNewProperty(key, type?)`), `core/frontmatter/properties.logic.ts` (`addProperty(properties, key, type = 'text')`, new `defaultValueFor(type)`), `help/documentation/07-sidebar-panels.md` (:39-47 "Adding a property" is stale, :49-50 says the type selector appears only when `_type` is set). Tests: `PropertiesView.test.ts`, `properties.service.test.ts`, `properties.logic.test.ts`.
- Blockers: T1 (same add form and `addNewProperty`); P121 (type-row spacer `PropertiesView.svelte:203`) and P43 (section chrome); neither is a hard dependency.
- Acceptance criteria:
  1. `PropertiesView` with an untyped note (no frontmatter): the type row renders with a "Set type" trigger; for `_type: ""` also "Set type" (the old `--` test is updated deliberately).
  2. Choosing a type on an untyped note writes `_type` (`propertiesStore.properties` has `{ key: '_type', value: 'Podcast' }`, the synced content contains `_type: Podcast`); fails today because `updateProperty` never appends.
  3. Choosing the type already set does not commit (no sync call, skip flag not armed).
  4. With no type definitions the menu shows a "No types defined" row instead of being empty.
  5. `addProperty(props, 'n', 'number')` and each of the five types produce a value that round-trips: `serializeProperties` then `parseFrontmatterProperties` returns the chosen type (number defaults to `0`, date to today, list `[]`, boolean `false`, text `''`).
  6. `addNewProperty('age', 'number')` returns true, stores the typed property and writes `age: 0`; duplicates and blanks still return false; existing text-only cases unchanged.
  7. Add form: choosing a type chip then pressing Enter in the name field commits that type; default is text and Enter alone still adds a text property (e2e helper contract); Cancel and Escape close it.
  8. Help page sections updated in the same commit.

### T3. Property icon opens a type menu that converts the value (P45, second half)
- Size: M (independent risky part: value conversion and persistence).
- Files: `PropertyField.svelte` (icon :110 becomes a button with a menu, new `onType` prop at :15-21, `typeIcons` :42-50 reused for menu icons), `PropertiesView.svelte` (pass the callback), `properties.service.ts` (new `changePropertyType(key, type)` using `updatePropertyValue(..., value, type)`), `core/frontmatter/properties.logic.ts` (new pure `convertPropertyValue`). Tests: `PropertyField.test.ts`, `properties.service.test.ts`, `properties.logic.test.ts`.
- Blockers: T1 (PropertyField props and key input) and T2 (`defaultValueFor`, shared helpers); P121 (main row layout, icon position and the container-query stacking); P122/T4 only by file proximity.
- Acceptance criteria:
  1. `convertPropertyValue` covers the 5x5 matrix (list <-> text join and split, boolean coercion, number parse with fallback `0`, date kept when ISO-shaped else today); no result is `''` for number or date.
  2. Round trip test over the matrix: the converted property survives `serializeProperties` then `parseFrontmatterProperties` with the chosen type; pairs that cannot (ISO-shaped value to text) are reported as unavailable by the helper.
  3. `PropertyField` mounted: the icon is a `<button>` with `aria-haspopup="menu"` and an accessible name "Change type of {key}, now {type}"; opening lists five items, the current one checked.
  4. Picking a type calls `onType(key, type)` once; picking the current type does nothing; unavailable items are disabled.
  5. `changePropertyType` with real stores commits the converted value and type (store and synced content), refuses with the existing toast on lossy frontmatter, and returns false then.
  6. After a type change the value control matches (checkbox for boolean, `type="number"`, `type="date"`, chips for list), proving no `string[]` cast over a string.

### T4. List chips edit in place and an empty list shows "+ Add" (P122)
- Size: M. Gate: frontend only.
- Files: `PropertyField.svelte` (chip block :167-201, main row list branch :144-154, `addListItem`/`removeListItem` :84-96). Test: `PropertyField.test.ts` only.
- Blockers: shares `PropertyField.svelte` with T1, T3 and P121 (different regions; no logical dependency). Recommended after T1 so the file settles once; can run before T3.
- Acceptance criteria:
  1. Empty list renders a visible "Add" button and no chip items; clicking it opens the add input (replaces the old "renders no block" test on purpose).
  2. Double-clicking a chip shows an input holding the item text, focused and selected; Enter calls `onUpdate('tags', [...])` with that item replaced and the others untouched.
  3. Escape closes without an `onUpdate` call, including when blur follows; blur commits; unchanged text makes no call; empty text removes the item.
  4. `onUpdate` returning false leaves the chip showing the stored text.
  5. Keyboard route to edit (Enter or F2 on a focused chip), if the owner accepts the default.
  6. Existing tests stay green: items on their own surface, long item shrinks, remove button removes the clicked item, Enter keeps the add input open.
  7. The tag icon colour of an edited `tags` chip follows the new text.

## Overlapping Issues

| Path | Status | Verdict |
|---|---|---|
| `.scratch/open-itens/issues/008-properties-panel-commit-that-changes-nothing-does.md` | ready-for-agent (ledger: todo) | Does not overlap a proposal, so NOT replaced. Same function (`commitChanges`, `properties.service.ts:83-109`). Our tickets must avoid creating new no-op commits (T1 Enter path, T2 re-choosing the current type). Depend softly; if the owner wants it done it is a separate S ticket. |
| `.scratch/open-itens/issues/005-empty-frontmatter-block-matched-writers-never-stack.md` and `022-empty-frontmatter-block-from-outside-app-matched.md` | ready-for-agent (022 blocked by 005) | Not replaced (different behaviour). Dependency/known gap for T2: Set type on a note whose block is `---\n---\n` stacks a second block until 022 lands. Exclude from T2, document. |
| `.scratch/open-itens/issues/105-minor-write-races-are-closed-autosave-during.md` | needs-triage | Shares the properties skip flag section. Exclude. |
| `.scratch/open-itens/issues/081-note-unquoted-wikilink-value-up-home-accepts.md` | ready-for-agent | Changes which frontmatter the panel refuses (`detectLossyFrontmatter`); behaviour-neutral for us. Exclude. |
| `.scratch/open-itens/issues/139-properties-panel-matches-columns.md`, `205-sidebar-panels-settings-use-empty-error-primitives.md`, `210-noteinfo-relationships-heading-follow-sidebar-section.md` | ready-for-agent / ready-for-agent / needs-info | Other surfaces (collection columns, EmptyState primitive, Info and Relationships headings). 210 belongs to rs-properties-layout P177. None replaced by this cluster. |
| `.scratch/open-itens/issues/002-keyboard-edits-next-hidden-frontmatter-never-change.md` | resolved | Not live. |
| `.scratch/frontmatter-rules/issues/01,02,07,08` | resolved | Rules engine writes the same value shapes; no overlap with the panel. |
| `.scratch/finders-ux/issues/07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | Only mentions `PropertiesView.svelte:61` as a caller of `flattenFileTree`. |
| `.scratch/tasks-view-ux/issues/109-row-chips.md`, `119-lifecycle-clause-and-value-pickers.md`, `claude-code-integration/issues/03-claude-chat-panel.md` | 109 not read; 119 resolved; 03 ready-for-agent | Other chip components; no shared code. |

No open-itens Issue targets the type row, typed add, key refusal feedback or list chips, so this cluster replaces none.

## Owner questions (only what the code cannot answer)

1. P44, refused rename: restore the saved key and show the message (proposal text), or keep the typed text marked invalid (prototype)? Recommended: restore plus message.
2. P44, duplicate rule: exact match (code today; `Status` and `status` are different keys) or case-insensitive (prototype)? Recommended: exact, unchanged.
3. P45, property type that cannot survive a re-parse (an ISO-shaped value chosen as "text", or an empty number or date): disable the menu item, or convert and let it revert on the next parse? Recommended: disable the item and use non-empty defaults (`0`, today) for typed add.
4. P45, Set type: append `_type` at the end of the frontmatter or put it first (the event-calendar writer puts it first)? Recommended: append.
5. P45, when the vault has no type definitions: show only a "No types defined" row, or also let the user type a free-form type name? Recommended: only the row.
6. P122: add a keyboard route to edit a chip (Enter or F2) in addition to double-click? Recommended: yes. Should an empty edit delete the chip (prototype) or revert? Recommended: delete.
7. Open-itens 008 (no-op commit): do it as its own S ticket before T1 and T2, or leave it abandoned and have our tickets simply avoid no-op commits? Recommended: leave it; our criteria avoid new triggers.

## Not checked

- Did not run the app, the tests or the codemap tests. Svelte event delegation of `keydown` and `dblclick` in jsdom is stated from Svelte 5 behaviour, not verified here; the first test of each ticket should confirm it.
- WebKit's blur-on-removal ordering (Escape then blur) was not exercised; the cancelled flag is the defence.
- Raw P45's "Inbox captures" impact claim is unverified (no Inbox type path found in Quick Capture).
- Did not read `properties-cross-note.test.ts` or `NoteInfo` beyond grep; they do not touch the key field, type row or chips as far as grep shows.
- Did not read the task text of tasks-view-ux 109.
