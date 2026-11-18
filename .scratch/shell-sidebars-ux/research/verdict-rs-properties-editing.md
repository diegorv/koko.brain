# Verdict: Properties panel editing cluster (P45, P44, P122)

Adversarial check of `scout-rs-properties-editing.md` against HEAD `ab143a411`. Read-only. I re-read every cited line of `PropertiesView.svelte`, `PropertyField.svelte`, `properties.service.ts`, `core/frontmatter/properties.logic.ts`, `properties.types.ts` and `utils/frontmatter-aliases.ts`. I also read the prototype handlers (`right-sidebar.html:660-740`, `:853-990`), the three test files the scout names, ADR 0029, the help page `07-sidebar-panels.md`, and every E2E spec that selects the panel. For overlaps I grepped `.scratch/*/issues` and the open-itens ledger.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P45 | yes, with one caveat | `PropertiesView.svelte:165` `{#if typeProperty}` hides the row. `:190` menu items call `handleUpdate('_type', ...)`, which goes to `updatePropertyValue` (`properties.logic.ts:719-729`, a `map` that never appends). So with no `_type` there is no row, and building on `handleUpdate` would be a no-op. `addProperty` hard-codes text (`:703-705`). The icon at `PropertyField.svelte:110` is inert. Caveat: the premise "cannot get a type from the panel" overstates it. Add property `_type` works (`addNewProperty` appends `{_type: ''}`, the row appears with `--`, and the dropdown then sets it). The path exists but is undiscoverable, so the proposal stands. |
| P44 | partial | `PropertyField.svelte:52-58` discards the result. `:19` `onRename` is typed `=> void`. `:113-119` the key input is one-way `value={property.key}` with no keydown handler and no `aria-label`. `PropertiesView.svelte:129-131` drops the boolean. `handleAddProperty` (`:137-142`) keeps the input open on false and says nothing. A lossy-frontmatter refusal already toasts (`properties.service.ts:87-95`), so the issue is not "silent" in every case. |
| P122 | yes | Chips are static (`PropertyField.svelte:170-182`). The block renders only when `listItems.length > 0 \|\| isAddingListItem` (`:168`). `addListItem` ignores `onUpdate`'s result and always clears the draft (`:90-96`). `handleListKeydown` (`:98-103`) is dead code: the template uses an inline handler at `:192-195`. The add, remove and plus buttons are `opacity-0` with `group-focus-within:opacity-100` (`:148`, `:159`, `:176`). |

## Where the scout is wrong or incomplete

1. **Owner question 1 rests on a misread of the prototype.** The scout says the mock "keeps the typed text on a duplicate" and "the blank branch returns without touching the field". In `commitKey` (`right-sidebar.html:853-869`), the non-legacy branch stores only `sb.err[old]`. The input re-renders from `kv = p.key` (`:705`) because `sb.typed` is used only under `l44` (the legacy toggle). So the prototype restores the saved key and shows the message on a duplicate, and restores silently on a blank. The prototype card text says the same ("a duplicate or blank key reverts, and a duplicate shows an inline message", P44 card at `:455`). Proposal, prototype and scout default agree, so **drop that question**. The only real divergence is case-insensitive matching (`:860`, `:944`).

2. **T1 and T2 both rewrite the add row.** T1 adds error markup to the add input (`PropertiesView.svelte:221-233`, `:137-142`). T2 then rebuilds the same lines as a name, type chips and Add/Cancel form, and changes `addNewProperty`. The add half of P44 should go to the ticket that rebuilds the form. T1 keeps the rename path and the shared refusal helper. T2 uses the helper for the add message.

3. **The conversion rules in T3 destroy data.** Design point 6 maps text "hello" to number `0`, any non-ISO text to today's date, and a list to `0`. Autosave writes the result within 500 ms (`properties.service.ts:106`). Two facts drive a different rule:
   - The panel infers types (`convertToProperty`, `properties.logic.ts:173-204`).
   - ADR 0029 § Empty values writes an empty scalar as `""`, which re-parses as text.

   Recommended rule: a type item is enabled only when the value is empty, or when it converts with no loss and survives `serializeProperties` then `parseFrontmatterProperties` with the chosen type and the same value. Otherwise the item is disabled. Use the existing `typedOptionValue` (`properties.logic.ts:674-680`, `String(Number(s)) === s`) for the numeric and boolean string rule, so `007` never becomes `7`. Fallbacks (`0`, today) apply only to an empty value.

4. **The round-trip analysis is half wrong.** The scout says a value that "looks like ... a bare number" cannot be text. It can. ADR 0029's quoting table writes the string `42` as `"42"`, which re-parses as the string `"42"`, so number -> text and boolean -> text both survive. Only an ISO-shaped string cannot stay text, because `ISO_DATE_REGEX` (`:40`) re-infers it as a date on every parse.

5. **T3 contradicts itself on text -> list.** Design point 6 says to wrap (`[string]`, as the prototype's `pickPt` at `:900` does). AC1 says "join and split". Splitting `Hello, world` on commas changes the value. Use wrap.

6. **One test the scout cites does not exist, and one line is off.** T4 AC6 lists "Enter keeps the add input open" as an existing test. `PropertyField.test.ts` has no such test: its list describe (`:116-176`) holds four tests, and none presses Enter. It has to be a new test. "lets a long item shrink" is at `:155-160`, not `:152-157`. That test reads `items()[0].querySelector('span')` as the truncating text, so a focusable chip wrapper must keep the text in the first `span`.

7. **T4 does not need the main row.** The scout lists the list branch at `PropertyField.svelte:144-154` among T4's files. In the prototype, the row plus stays for every list (`.p-acts`, `:711-713`) and the "+ Add" chip lives in the chip block (`:692-693`). If T4 stays inside `:167-201` plus its script state, it no longer shares lines with P121, which rewrites the main row `:108-165`.

8. **The two scouts give opposite orders for P121.** This scout says to run P121 first. `scout-rs-properties-layout.md:156` says P44 and P45 come first, then P121. Pick one order. P121 should go after T1, T2 and T3, because those tickets add the elements that P121 has to lay out: the icon button, the alert line under the key and the type row trigger. T4 can sit on either side of it.

9. **The scout missed some consumers.** Each ticket must keep these working:
   - `e2e/specs/note-action-bar.spec.ts:85` needs a visible `button` with text "Add property".
   - `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts:180-191` and `properties-cross-note.spec.ts:100-104` pick a row as a `div.group` that contains `input[data-property-key]`, then fill its first `input:not([data-property-key])`. So the key input keeps `data-property-key`, and no new input may come before the value input in a row.
   - `properties-cross-note.test.ts:134-155` asserts that `renameProperty` and `addNewProperty` return false on a refused commit. That file is a regression guard for T1 and T2, and the scout did not read it.
   - `panel-meta-bind-lossy-rewrite.test.ts` and `frontmatter-number-spelling.test.ts` call `updateProperty(key, value, type)`, which T3's service builds on.

10. **T1 AC7 tests the wrong layer.** `properties-refusal-toast.test.ts` exercises `updateProperty` only and never mounts the component. "The lossy refusal restores the key and shows no inline alert" needs a `PropertiesView.test.ts` case with lossy content. It can mock `svelte-sonner`, which is a side-effect module.

11. **The help page is stale in more places.** The scout updates `07-sidebar-panels.md` only in T2. Line 55 ("The type is auto-detected from the value") becomes false after T3. Lines 53-54 (editing) should mention Enter and Escape on the name (T1) and double-click on list items (T4). Line 49 (the type selector "when the note has a `_type` set") sits inside the Relationships section, which `rs-properties-layout` T2 rewrites at `:45-47`. That is a textual merge on adjacent lines.

12. **"Today" should be a parameter.** `formatNow` (`utils/date.ts:15`) reads the clock. The pure helper should be `defaultPropertyValue(type, today)`, with the service passing `formatNow('YYYY-MM-DD')`, the same pattern as `tasks-view-ux` 109's `taskChips(metadata, today, ...)`. Otherwise the logic test depends on the date.

13. **Some line numbers have moved.** `serializeProperties` starts at `:603`, not `:605`. `rebuildContent` is at `:689-697`, not `:677-686`. Prototype cards: P44 is at `:455` (not `:453`) and P122 at `:475` (not `:473`). The other cited lines check out.

Confirmed as the scout said:
- `propertiesStore` has no reader outside `features/properties/`. A grep of `src` outside the feature and its tests finds nothing.
- `PropertiesView` is mounted only by `AppShell.svelte:279`, and `PropertyField` only by `PropertiesView.svelte:211`.
- `upsertProperty` appends through `findCanonicalTwin`, so an uncanonical `type` key in the store is updated, not duplicated.
- An `---\n---\n` block does not match `FRONTMATTER_REGEX` (`:38`), so a write stacks a second block (open-itens 005/022).
- `PropertyField.test.ts` passes `onRename: () => {}` in three helpers (`:17`, `:69`, `:132`), which a `string | null` return type would break in `pnpm check`.
- No `components/ui` radio or toggle group exists.
- `$props.id()` is already used (`TasksView.svelte:144`, Svelte `^5.57.3`).

No ADR conflict, as long as no ticket changes `serializeProperties` or the empty-value form (ADR 0029). Writing `key:` (null) for an empty number would need an ADR amendment and is out of scope.

## Ticket breakdown

Order: T1 -> T2 -> T3. T4 can run any time after T1 (no shared lines, only the same file). `rs-properties-layout` T4 (P121) runs after T1, T2 and T3. Only one ticket may edit `PropertyField.svelte` at a time.

### T1. A refused property rename reverts and says why (P44, rename half; S)

- **Files:** `src/lib/features/properties/PropertyField.svelte` (`Props` `:15-21`, `handleKeyBlur` `:52-58`, key input `:113-119`), `PropertiesView.svelte` (`handleRename` `:129-131`), `src/lib/core/frontmatter/properties.logic.ts` (new `propertyKeyRefusal`), `properties.service.ts` (`renameProperty` `:159-172` and `addNewProperty` `:184-194` call the helper and keep their boolean returns), `help/documentation/07-sidebar-panels.md:53-54`. Tests: `PropertyField.test.ts`, `PropertiesView.test.ts`, `properties.logic.test.ts`.
- **Blockers:** none. It goes before T2 (the helper), T3 (`Props`) and `rs-properties-layout` T4 (P121, the key input classes).
- **What to build:**
  - A pure `propertyKeyRefusal(properties, key, exceptKey?)` returns `null`, `{ reason: 'blank' }` or `{ reason: 'duplicate', existingKey }`. It trims the key and compares canonically and exactly, the way `renameProperty` does today.
  - `onRename` returns the message to show, or null. `PropertyField` always resets `input.value` to `property.key` after the call. An accepted rename re-keys the row (`PropertiesView.svelte:210`), so the reset is not visible.
  - Enter calls `input.blur()` so the single blur handler commits. Escape resets the value, clears the message and blurs. Input or focus clears the message.
  - The message is a `role="alert"` line under the row, naming the existing key, which may be a hidden one such as `_type` or `_archived`. The input carries `aria-invalid="true"` and `aria-describedby` (an id from `$props.id()`, never built from the key) only while the message shows. The key input gets `aria-label="Property name"`.
- **Acceptance criteria:**
  - [ ] Failing test first, `properties.logic.test.ts`: `propertyKeyRefusal` covers blank, padded blank, exact duplicate, an alias twin (`type` while `_type` exists returns `existingKey: '_type'`), `exceptKey` ignored, and `Status` vs `status` not a duplicate (unless the owner picks case-insensitive).
  - [ ] `PropertyField.test.ts` (mounted, `onRename` returns a message): a blur on a duplicate restores `property.key` in the input and shows one `role="alert"` naming the key. The input has `aria-invalid="true"` and an `aria-describedby` that points at the alert.
  - [ ] A blur on a blank key, or on `"  status "`, restores `status` with no alert and no `onRename` call.
  - [ ] Escape restores the key and clears the alert, with no call. Enter on a focused input (focus it first, because jsdom's `blur()` is a no-op otherwise) makes exactly one `onRename` call. Typing clears the alert.
  - [ ] `PropertiesView.test.ts` with real stores: renaming `status` to an existing `priority` leaves `propertiesStore.properties` unchanged and shows the alert. Renaming to a free key still renames.
  - [ ] `PropertiesView.test.ts`: on lossy frontmatter (comments), a rename restores the key and shows no inline alert. `svelte-sonner` is mocked and its toast is called.
  - [ ] `properties.service.test.ts` rename and add cases (`:207-260`, `:296-380`) and `properties-cross-note.test.ts:134-155` pass unchanged.
- **Gate:** `pnpm check` + `pnpm vitest run`.

### T2. Untyped notes get a "Set type" row, and Add property asks for a name and a type (P45 part 1 + P44 add half; M)

- **Files:** `PropertiesView.svelte` (type row `:164-206`, `handleAddProperty`/`handleAddKeydown` `:137-152`, add row `:221-241`), `properties.service.ts` (`addNewProperty(key, type = 'text')`), `properties.logic.ts` (`addProperty(properties, key, type = 'text', today?)` and a pure `defaultPropertyValue(type, today)`), `help/documentation/07-sidebar-panels.md:39-43` and `:49`. Tests: `PropertiesView.test.ts`, `properties.service.test.ts`, `properties.logic.test.ts`.
- **Blockers:** T1 (`propertyKeyRefusal`). It goes before T3 (`defaultPropertyValue`) and P121 (the type row structure, spacer `:203`). The help line `:49` sits next to `rs-properties-layout` T2's `:45-47`, so whoever goes second does a textual merge.
- **What to build:**
  - The type row always renders. With no `_type`, or a blank one, the trigger reads "Set type". Choosing an item writes through `upsertProperty('_type', name)`. Choosing the type already shown (`typeName`) does not commit (open-itens 008's no-op trigger).
  - With no type definitions, the menu shows a disabled "No types defined" row.
  - The add form: the name input (same placeholder "Property name...") and a `role="group"` of five `aria-pressed` type buttons (text by default), then Add and Cancel. Enter in the name commits with the chosen type. Escape and Cancel close.
  - A duplicate shows the T1 message under the input (`role="alert"`, `aria-invalid`, cleared on input) and keeps the form open. A blank Enter stays a silent no-op.
  - Typed defaults that survive a re-parse: text `''`, list `[]`, boolean `false`, number `0`, date today.
- **Acceptance criteria:**
  - [ ] Failing test first, `PropertiesView.test.ts`: a note with no frontmatter renders the type row with a "Set type" trigger. Choosing "Podcast" leaves `{ key: '_type', value: 'Podcast' }` in `propertiesStore.properties`, and the mocked `syncExternalContentToEditor` receives content containing `_type: Podcast`. This fails today.
  - [ ] `_type: ""` also shows "Set type". The test "shows the empty placeholder for an empty value" (`:269-273`) changes on purpose, and the commit says why.
  - [ ] Choosing the current type makes no `syncExternalContentToEditor` call.
  - [ ] With an empty `typeDefinitionsStore`, the opened menu shows "No types defined".
  - [ ] `properties.logic.test.ts`: for each of the five types, `addProperty([], 'k', type, '2026-11-17')` then `serializeProperties` then `parseFrontmatterProperties` gives back that type. The existing `addProperty` cases (`:986-1006`) pass unchanged.
  - [ ] `properties.service.test.ts`: `addNewProperty('age', 'number')` returns true and writes `age: 0`. The existing text, blank, duplicate and alias cases pass unchanged.
  - [ ] Add form: pick Number, type a name, press Enter, and a number property is added. Enter alone adds a text property. A duplicate shows the alert and keeps the form open. Escape closes.
  - [ ] Help `:39-43` and `:49` are updated in the same commit.
  - [ ] E2E `properties-cross-note.spec.ts` and `note-action-bar.spec.ts` pass through `bash scripts/e2e.sh`. Both drive the "Add property" button and the Enter-to-add contract.
- **Known gap, out of scope:** on a note whose block is exactly `---\n---\n`, Set type stacks a second block until open-itens 005/022 land. Every panel add does the same today.
- **Gate:** `pnpm check` + `pnpm vitest run`, plus the two E2E specs.

### T3. The property icon opens a type menu that converts without loss (P45 part 2; M)

- **Files:** `PropertyField.svelte` (icon `:110` becomes a `DropdownMenu` trigger button, new `onType` prop in `Props` `:15-21`, `typeIcons` `:42-50` reused), `PropertiesView.svelte` (`PropertyField` call `:211-216`), `properties.service.ts` (new `changePropertyType(key, type): boolean` through `updatePropertyValue(..., value, type)` and `commitChanges`), `properties.logic.ts` (new pure `convertPropertyValue(property, to, today)` returning the new value, or null when unavailable), `help/documentation/07-sidebar-panels.md:55`. Tests: `PropertyField.test.ts`, `properties.service.test.ts`, `properties.logic.test.ts`.
- **Blockers:** T1 (`Props`), T2 (`defaultPropertyValue`). It goes before P121 (the icon position in the main row).
- **What to build:**
  - The icon is a button: `title="Change property type"`, an accessible name "Change type of {key}, now {type}", and a menu labelled "Property type" with the five types and a check on the current one.
  - An item is enabled only when `convertPropertyValue` returns non-null:
    - an empty value converts to the T2 default of any type;
    - a scalar converts to a list by wrapping;
    - a list converts to text by joining with `", "`, and a one-item list converts as its item;
    - a string converts to number or boolean only under the `typedOptionValue` rule;
    - number and boolean convert to text with `String()`;
    - anything else is disabled, and that includes every result that the serialize-then-parse round trip reports as another type (an ISO-shaped value to text).
  - Picking the current type does nothing.
- **Acceptance criteria:**
  - [ ] Failing test first, `properties.logic.test.ts`: over the 5x5 matrix with an empty, a convertible and a non-convertible sample value, every non-null result survives `serializeProperties` then `parseFrontmatterProperties` with the chosen type and value. `"hello"` to number, `"007"` to number, `"2026-11-17"` to text and `true` to number are all null. No result is `''` for number or date.
  - [ ] `PropertyField.test.ts` (mounted with callbacks, no store): the icon is a `<button>` with `aria-haspopup="menu"` and the accessible name. The menu lists five items with the current one checked. Unavailable items are disabled. Picking a type calls `onType(key, type)` once, and picking the current one makes no call.
  - [ ] `properties.service.test.ts` with real `propertiesStore` and `editorStore`: `changePropertyType('n', 'number')` on `n: "5"` writes `n: 5` and stores `type: 'number'`. On lossy frontmatter it returns false and the content is unchanged.
  - [ ] After a type change, the value control matches the type: a checkbox for boolean, `type="number"`, `type="date"`, chips for list. A list never iterates a string's characters.
  - [ ] `panel-meta-bind-lossy-rewrite.test.ts` and `frontmatter-number-spelling.test.ts` pass unchanged. The help line `:55` is updated.
- **Gate:** `pnpm check` + `pnpm vitest run`.

### T4. List chips edit in place, and an empty list shows "+ Add" (P122; M)

- **Files:** `PropertyField.svelte` (state `:25-27`, `removeListItem`/`addListItem`/dead `handleListKeydown` `:84-103`, chip block `:167-201`; the main row is not touched), `help/documentation/07-sidebar-panels.md:53-54`. Test: `PropertyField.test.ts`.
- **Blockers:** none on logic or lines. Run it after T1 so the file settles, and never at the same time as another `PropertyField.svelte` ticket. It is independent of P121 as long as the main row stays untouched.
- **What to build:**
  - Double-clicking a chip, or pressing Enter or F2 on its focused text, swaps it for an input (`aria-label="Edit item"`), focused and selected.
  - Enter or blur commits:
    - the text is trimmed;
    - unchanged text makes no call;
    - empty text removes the item;
    - otherwise the item at that index is replaced through `onUpdate(key, items)`.
  - Escape sets a cancel flag before blur fires, so nothing commits.
  - An empty list renders the chip block with a dashed "+ Add" button that opens the existing add input. Non-empty lists keep today's controls.
  - The dead `handleListKeydown` goes, because the ticket rewrites that block.
- **Acceptance criteria:**
  - [ ] Failing test first: an empty list renders a visible "Add" button and no `[data-property-list-item]`. Clicking it opens the add input. This replaces "renders no block for an empty list" (`:170-175`) on purpose, and the commit says why.
  - [ ] `dblclick` (bubbling; Svelte delegates it) on a chip shows an input holding the item text. Enter calls `onUpdate('tags', [...])` with only that item replaced.
  - [ ] Escape followed by a blur makes no call. A blur alone commits. Unchanged text makes no call. Empty text removes the item.
  - [ ] When `onUpdate` returns false, the chip shows the stored text again.
  - [ ] New test: Enter in the add input adds the item and keeps the input open and focused. This test does not exist today.
  - [ ] Keyboard route: Enter on a focused chip opens the edit input (if the owner keeps the default).
  - [ ] The existing tests at `:147-168` pass: the chip text stays in the first `span` with `truncate`, and the remove button keeps `title="Remove item"`.
- **Gate:** `pnpm check` + `pnpm vitest run`.

## Open-itens Issues replaced

None. No open, non-wontfix open-itens Issue targets the type row, typed add, key refusal feedback or list chips. Related Issues that stay open:
- **008** (ready-for-agent, ledger `todo`): the no-op commit that arms the skip flag. It is in the same `commitChanges`, but it is not one of these proposals. Each ticket above has a "no call when unchanged" criterion so it adds no new trigger.
- **005 and 022** (`todo`): empty-block stacking. This is the known gap noted in T2.
- **105** (`needs-triage`): skip-flag races.
- **139, 205, 210**: other surfaces. 210 goes to `rs-properties-layout` P177.

## Dropped

- **P122 drag-to-reorder:** optional in the review and absent from the prototype. No drag code exists in the feature.
- **P122 "add/remove are hover-only" for non-empty lists:** the proposal itself changes only the empty list. The buttons are already reachable by keyboard through `group-focus-within` (`:148`, `:176`). Their layout belongs to P121, and confirmation or undo for removal belongs to P01.
- **A "remove type" item** in the Set type menu: not asked for.
- **Scout owner questions 1 and 7:** the prototype already restores the key (point 1 above). 008 needs no decision from this cluster.

## Owner questions

1. **T1 and T2, duplicate rule:** exact match as the code does today (`Status` and `status` are two keys), or case-insensitive as in the prototype? Recommended: exact.
2. **T3, conversions:** only lossless ones, with the rest disabled, or allow destructive ones (text "hello" to number `0`)? Recommended: lossless only.
3. **T2, typed add defaults:** number `0` and date today, because an empty number or date is written `""` and comes back as text (ADR 0029)? Or should the add form leave out Number and Date? Recommended: `0` and today.
4. **T2, Set type position:** append `_type`, or put it first as the event-calendar writer does (`event-calendar-event.logic.ts:346-347`)? Recommended: append.
5. **T2, blank `_type: ""`:** show "Set type" instead of `--`? Recommended: yes.
6. **T2, no type definitions:** a "No types defined" row only, or also free-text entry? Recommended: the row only.
7. **T4:** add the Enter/F2 route to edit a chip? Should an emptied chip be deleted, as in the prototype? Recommended: yes to both.

## Not checked

- I did not run the app or the tests. Svelte 5's delegation of `keydown` and `dblclick` in jsdom, and WebKit's blur ordering on Escape, are reasoned from the code. The first test of each ticket confirms them.
- I did not check whether a panel edit can be undone from the editor (Cmd+Z after `syncExternalContentToEditor`). That is why point 3 treats a destructive conversion as unrecoverable.
