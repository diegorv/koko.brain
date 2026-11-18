# 10: Untyped notes get a Set type row, Add property asks for a name and a type, and the property icon opens a lossless type menu

**Origin:** design review 2026-11-17, proposal P45 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (P45 article), research `.scratch/shell-sidebars-ux/research/verdict-rs-properties-editing.md` (its T2 and T3) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old tickets 16 and 24, merged into this one). It also builds the add half of P44 (the rename half is in 04). No open-itens Issue is absorbed.

**What to build:** in `src/lib/features/properties/` and `src/lib/core/frontmatter/properties.logic.ts`:

1. **Set type row.** The type row always shows (`PropertiesView.svelte:165` hides it without `_type`). With no `_type`, or a blank one, its trigger reads "Set type" instead of `--` (`:181`). Choosing a type writes `_type` through `upsertProperty('_type', name)` (`properties.service.ts:136`); the menu's `handleUpdate` call (`:190`) maps over existing properties and never appends (`properties.logic.ts:719-729`), so it cannot be reused. Choosing the type already shown writes nothing. With no type definitions the menu shows a disabled "No types defined" row and nothing else.
2. **Typed Add property.** The add row (`:221-241`) becomes a small form: the name input ("Property name..."), five type buttons (text by default, in a `role="group"`, each `aria-pressed`), Add and Cancel. Enter in the name commits with the chosen type; Escape and Cancel close. A duplicate shows 04's message (`role="alert"`, `aria-invalid`, cleared on input) under the input and keeps the form open; a blank Enter stays a silent no-op. The "Add property" button text and the Enter-to-add contract stay (`e2e/specs/note-action-bar.spec.ts:85`, `properties-cross-note.spec.ts:108`).
3. **Typed defaults.** New properties get values that survive a re-parse: text `''`, list `[]`, boolean `false`, number `0`, date today. An empty number or date is written `""` and re-parses as text (ADR 0029), hence `0` and today. Code: `addNewProperty(key, type = 'text')`; `addProperty(properties, key, type = 'text', today?)` and a pure `defaultPropertyValue(type, today)` in `properties.logic.ts` (`:703-705` hard-codes text today), the service passing `formatNow('YYYY-MM-DD')` so the helper takes "today" as a parameter.
4. **Icon type menu.** The type icon in front of each property (`PropertyField.svelte:110`, inert today) becomes a button, name "Change type of {key}, now {type}", `title="Change property type"`, opening a "Property type" `DropdownMenu` with the five types and a check on the current one (`typeIcons`, `:42-50`, reused; new `onType` prop beside `onUpdate`). A type is offered only when the value converts with no loss and comes back as that type after a save and re-parse: an empty value converts to item 3's default; a scalar to a list by wrapping (not splitting on commas); a list to text by joining with `", "` (a one-item list as its item); a string to number or boolean only under `typedOptionValue` (`properties.logic.ts:674-680`, `String(Number(s)) === s`, so `007` never becomes `7`); number and boolean to text with `String()`. Anything else is disabled, including an ISO-shaped value to text (`ISO_DATE_REGEX`, `:40`, re-infers it as a date). Picking the current type does nothing. Autosave writes within 500 ms, so a destructive conversion would be unrecoverable. Code: pure `convertPropertyValue(property, to, today)` returning the value or null; `changePropertyType(key, type): boolean` in `properties.service.ts` through `updatePropertyValue(..., value, type)` and `commitChanges`. `serializeProperties` and the ADR 0029 empty-value form do not change.
5. **Help:** `help/documentation/07-sidebar-panels.md:41-43` and `:49` (Add property asks for a type; Set type row), `:55` ("The type is auto-detected from the value" is no longer true).

Not in this ticket: a "Remove type" item in the Set type menu. Known gap, out of scope: on a note whose block is exactly `---\n---\n` Set type stacks a second block until open-itens 005 and 022 land; every panel add does the same today.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh properties-cross-note.spec.ts note-action-bar.spec.ts`

- [ ] Failing test first, `src/tests/lib/features/properties/PropertiesView.test.ts`: a note with no frontmatter shows a "Set type" trigger; choosing "Podcast" leaves `{ key: '_type', value: 'Podcast' }` in `propertiesStore.properties` and the mocked `syncExternalContentToEditor` receives content with `_type: Podcast`.
- [ ] `_type: ""` also shows "Set type" (the "shows the empty placeholder for an empty value" test, `:269-273`, changes on purpose and the commit says why). Choosing the current type makes no `syncExternalContentToEditor` call. An empty `typeDefinitionsStore` shows "No types defined".
- [ ] Failing test first, `src/tests/lib/core/frontmatter/properties.logic.test.ts`: for each type, `addProperty([], 'k', type, '2026-11-17')` then `serializeProperties` then `parseFrontmatterProperties` gives back that type; the existing `addProperty` cases (`:986-1006`) pass unchanged.
- [ ] Failing test first, `properties.logic.test.ts`: over the 5x5 matrix with an empty, a convertible and a non-convertible sample, every non-null `convertPropertyValue` result survives `serializeProperties` then `parseFrontmatterProperties` with the chosen type and value; `"hello"` to number, `"007"` to number, `"2026-11-17"` to text and `true` to number are null; no number or date result is `''`.
- [ ] `properties.service.test.ts`: `addNewProperty('age', 'number')` returns true and writes `age: 0`; the text, blank, duplicate and alias cases pass unchanged. With real `propertiesStore` and `editorStore`, `changePropertyType('n', 'number')` on `n: "5"` writes `n: 5` and stores `type: 'number'`; on lossy frontmatter it returns false and content is unchanged.
- [ ] Add form (`PropertiesView.test.ts`): pick Number, type a name, Enter adds a number property; Enter alone adds text; a duplicate shows the alert and keeps the form open; Escape closes.
- [ ] `PropertyField.test.ts`: the icon is a `<button>` with `aria-haspopup="menu"` and the accessible name; the menu lists five items, the current one checked and unavailable ones disabled; picking a type calls `onType(key, type)` once; the current one makes no call. After a change the control matches the type (checkbox, `type="number"`, `type="date"`, chips) and a list never iterates a string's characters.
- [ ] `panel-meta-bind-lossy-rewrite.test.ts`, `frontmatter-number-spelling.test.ts` and `properties-cross-note.test.ts:134-155` pass unchanged.
- [ ] E2E `properties-cross-note.spec.ts` and `note-action-bar.spec.ts` pass (they drive the "Add property" button and Enter-to-add).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P45.** Untyped notes cannot get a type from the panel, and new properties are always text. Always show the type row with a "Set type" placeholder; the row icon opens a type menu; Add property asks for a key and a type. Validation: keep.
- **P44 (add half, built here).** The add input shows the duplicate message; the rename half is 04.

## Problem

The type row renders only when `_type` exists, so typing an Inbox capture means source mode or the undiscoverable "add a property named `_type`" route. `addProperty` hard-codes text, so a number or date needs a source edit, and the icon in front of each row looks like a control but does nothing.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/properties/PropertiesView.svelte:91-94` `typeProperty`, `typeName`, `availableTypes`; `:137-152` add handlers; `:165` the `{#if typeProperty}` gate; `:181` the `--` fallback; `:190` menu items call `handleUpdate('_type', ...)`; `:203` the 16 px spacer; `:221-241` the add row.
- `src/lib/features/properties/PropertyField.svelte:15-21` `Props`; `:42-50` `typeIcons`; `:110` inert icon.
- `src/lib/features/properties/properties.service.ts:124-134` `updateProperty`, `:136-153` `upsertProperty` (appends through the canonical twin), `:184-194` `addNewProperty`.
- `src/lib/core/frontmatter/properties.logic.ts:40` `ISO_DATE_REGEX`; `:674-680` `typedOptionValue`; `:703-705` `addProperty`; `:719-729` `updatePropertyValue` maps and never appends.
- `help/documentation/07-sidebar-panels.md:41-43,49,55`.

## Why blocked

- 04: (A refused property rename reverts and says why: `propertyKeyRefusal` in `properties.logic.ts` and the changed `PropertyField` `Props`)

## Sequence with

- `PropertiesView.svelte` and its test: 05 (`:156`), 09 (`:53-57`, `:243-290`), 11 (`:155`, `:165-206`; 11 is blocked by this ticket so it lays out the final type row).
- `PropertyField.svelte` and `PropertyField.test.ts`: 04 (blocker: `Props`, key input, list chips), 11 (blocked by this ticket). Only one of these tickets edits the file at a time.
- `properties.logic.ts` and `properties.service.ts`: 04 (blocker).
- `help/documentation/07-sidebar-panels.md`: 01, 04, 05, 06, 07, 09, 26. `:49` sits next to 09's `:47`.
- Open-itens 008 (a no-op commit arms the skip flag) lives in the same `commitChanges`; the "no call when unchanged" criteria above add no new trigger.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation, which merges the old Set type ticket and the old type-menu ticket into this one. Defaults (not individually answered): 10.1 typed add defaults are number `0` and date today (breakdown.md questions 16.1 to 16.4 map to 10.1 to 10.4); 10.2 Set type appends `_type` rather than putting it first; 10.3 a blank `_type: ""` shows "Set type" instead of `--`; 10.4 with no type definitions the menu shows the disabled row only, with no free-text entry; 10.5 only lossless type conversions are offered and the rest are disabled (breakdown.md question 24.1, now 10.5).
