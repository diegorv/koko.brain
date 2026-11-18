# 04: A refused property rename reverts and says why; list chips edit in place and an empty list shows "+ Add"

**Origin:** design review 2026-11-17, proposals P44 (rename half), P122 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (cards `#P44`, `#P122`), research `.scratch/shell-sidebars-ux/research/verdict-rs-properties-editing.md` and `breakdown.md` (old tickets 02, 25). The add half of P44 is ticket 10.

**What to build:** in `src/lib/features/properties/PropertyField.svelte` (the key input and the list-chip block are disjoint lines of the same file), `PropertiesView.svelte`, `src/lib/core/frontmatter/properties.logic.ts` and `properties.service.ts`:

1. **Refused rename reverts.** Renaming a property to a name that already exists (including a hidden one such as `_type` or `_archived`) puts the saved name back in the field and shows one line under the row naming the existing key. A blank or whitespace-only name puts the saved name back silently. Enter commits the rename (blur), Escape restores the saved name and clears the message, typing clears the message.
2. **Rename code.** Pure `propertyKeyRefusal(properties, key, exceptKey?)` in `properties.logic.ts` returning `null`, `{ reason: 'blank' }` or `{ reason: 'duplicate', existingKey }` (trimmed, canonical and exact compare as `renameProperty` does today). `renameProperty` and `addNewProperty` (`properties.service.ts:159-194`) call it and keep their boolean returns. `PropertyField`'s `onRename` (`Props` `:15-21`) returns the message or null, `PropertiesView.handleRename` (`:129-131`) passes it through, and the field always resets `input.value` to `property.key` after the call (`handleKeyBlur` `:52-58`). The message is `role="alert"`; the input has `aria-invalid` and `aria-describedby` (id from `$props.id()`, never from the key) only while it shows, and `aria-label="Property name"`. Keep `data-property-key` and add no input before the value input in a row (E2E selectors in `e2e/specs/properties-cross-note.spec.ts:100-104` and `frontmatter-write-keeps-scroll.spec.ts:180-191`).
3. **Chip editing.** Double-clicking a list chip, or pressing Enter or F2 on its focused text, turns it into an input (`aria-label="Edit item"`), focused and selected. Enter or blur commits the trimmed text: unchanged text writes nothing, empty text removes the item, otherwise that item is replaced. Escape cancels (a flag set before blur fires). When the write is refused the chip shows the stored text again.
4. **Empty list.** An empty list shows a dashed "+ Add" button that opens the add input (today the block does not render, `PropertyField.svelte:168`). Non-empty lists keep today's controls. Enter in the add input adds the item and keeps the input open and focused.
5. **Chip code.** State `:25-27`, `removeListItem` and `addListItem` `:84-96` (`addListItem` checks `onUpdate`'s result), chip block `:167-201`; the dead `handleListKeydown` (`:98-103`) goes because this block is rewritten. The main row (`:108-165`) is not touched by item 3 and 4. The chip text stays in the first `span` with `truncate`, and the remove button keeps `title="Remove item"`.
6. **Help.** `help/documentation/07-sidebar-panels.md:53-54`: Enter and Escape on the name, double-click on a list item.

Not in this ticket: the duplicate or blank message on the Add property input (ticket 10 rebuilds that form with the same helper); drag-to-reorder chips (optional in the review, absent from the prototype, no drag code exists); the stacked row layout and moving the hover-only add and remove buttons (ticket 11).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/core/frontmatter/properties.logic.test.ts`: `propertyKeyRefusal` covers blank, padded blank, exact duplicate, an alias twin (`type` while `_type` exists gives `existingKey: '_type'`), `exceptKey` ignored, and `Status` vs `status` not a duplicate.
- [ ] `src/tests/lib/features/properties/PropertyField.test.ts` (mounted, `onRename` returns a message): a blur on a duplicate restores `property.key` and shows one alert naming the key; the input has `aria-invalid="true"` and an `aria-describedby` pointing at it. Blank and `"  status "` restore with no alert and no `onRename` call. Escape restores and clears with no call. Enter on a focused input makes exactly one call. Typing clears the alert. The three helpers at `:17`, `:69`, `:132` are updated for the new return type.
- [ ] `PropertiesView.test.ts` (real stores): renaming `status` to an existing `priority` leaves `propertiesStore.properties` unchanged and shows the alert; a free key still renames; on lossy frontmatter (comments) the key is restored, no inline alert shows and the mocked `svelte-sonner` toast is called.
- [ ] Failing test first, `PropertyField.test.ts`: an empty list renders a visible "Add" button and no `[data-property-list-item]`; clicking it opens the add input. This replaces "renders no block for an empty list" (`:170-175`) on purpose, stated in the commit.
- [ ] `dblclick` on a chip shows an input with the item text; Enter calls `onUpdate('tags', [...])` with only that item replaced; Escape then blur makes no call; blur alone commits; unchanged text makes no call; empty text removes the item; `onUpdate` returning false shows the stored text.
- [ ] New test (none exists today): Enter in the add input adds the item and keeps the input open and focused. Enter on a focused chip opens the edit input.
- [ ] `PropertyField.test.ts:147-168` pass: the text stays in the first `span` with `truncate`, the remove button keeps `title="Remove item"`; `:155-160` (a long item shrinks) stays green.
- [ ] `properties.service.test.ts` rename and add cases (`:207-260`, `:296-380`) and `properties-cross-note.test.ts:134-155` pass unchanged.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P44.** A refused property key rename or add fails silently, and the key field shows text that was never saved. On a refused rename, restore `property.key` (with a refusal counter, as the value field does) and show an inline message with `aria-invalid`. Enter commits and Escape reverts. The add input shows the same duplicate message. Validation: revise, the add input already handles Enter and Escape. (This ticket builds the rename half.)
- **P122.** List property chips cannot be edited or reordered, and add/remove are hover-only. Double-click a chip to edit it in place, and show a visible "+ Add" chip when the list is empty. Drag-to-reorder is optional. Validation: revise, Enter already keeps the add input open.

## Problem

The key input is uncontrolled and ignores the rename result, so a duplicate or blank key is refused without a word and the field keeps text that was never saved. List chips are static spans, so fixing a tag means delete and retype, and an empty list shows only its key with no visible way to add.

## Evidence

Checked at `ab143a411`.

- `PropertyField.svelte:15-21` `onRename` typed `=> void`; `:52-58` `handleKeyBlur` discards the result; `:113-119` key input is one-way `value={property.key}` with no keydown handler and no `aria-label`; `:168` the chip block renders only when `listItems.length > 0 || isAddingListItem`; `:170-182` chips are static; `:90-96` `addListItem` ignores `onUpdate`'s result; `:98-103` `handleListKeydown` is dead (the template uses the inline handler at `:192-195`).
- `PropertiesView.svelte:129-131` drops the boolean; `:137-142` `handleAddProperty`. A lossy-frontmatter refusal already toasts (`properties.service.ts:87-95`).
- `src/tests/lib/features/properties/PropertyField.test.ts` passes `onRename: () => {}` in three helpers (`:17`, `:69`, `:132`), which a `string | null` return type breaks in `pnpm check`.
- `e2e/specs/note-action-bar.spec.ts:85` needs a visible button "Add property"; the row selectors above keep matching.

## Sequence with

Tickets 10 and 11 edit `PropertyField.svelte`, `PropertiesView.svelte` and `PropertyField.test.ts` after this one (both are blocked by it): 10 changes the icon in the main row and the type row, 11 lays out the final row. Tickets 05 (`PropertiesView.svelte:156`) and 09 (`:53-57`, `:243-290`) edit other lines of `PropertiesView.svelte`. `help/documentation/07-sidebar-panels.md`: 05, 06, 09, 10. Open-itens 008 and 105 (no-op commit and write races): the "no call when unchanged" criteria guard them.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 04.1 duplicate names are compared exactly (`Status` and `status` are two keys); 04.2 add the Enter and F2 route to chip editing, and delete an emptied chip.
