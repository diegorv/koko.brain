# 02: Rule consequences in Settings

**What to build:** in Settings > Auto Move, each rule row shows its consequences: the optional destination and the list of property consequences from Issue 01. The user sets them without editing JSON. Read `.scratch/frontmatter-rules/PRD.md` first.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

- **Then area.** `AutoMoveRuleRow.svelte` gets a "Then" area under the filter, with:
  - **Move to folder:** the existing destination field, with a placeholder saying that empty means "do not move".
  - **Set properties:** one row per consequence, with key, value and mode (`if missing` / `always`), a remove button, and an "Add property" button.
- **Key field:** suggestions from the vault's known properties (`getAllKnownProperties`, `src/lib/features/collection/toolbar/filter.logic.ts:223`), leaving out `file.*` fields. Free text is allowed.
- **Value field:**
  - text by default;
  - a checkbox (boolean) for `_organized`, `_archived` and `_favorite`, and when the user picks "yes/no" for the row;
  - for `_icon`, the value is picked with `IconPicker.svelte` (`src/lib/features/file-icons/`) and saved as `pack:name`;
  - `_color` and `_title_color` use IconPicker's color controls (`onColorsChange`). No separate color component exists. Extracting IconPicker's color block into one is allowed.
  
  Numbers and lists stay possible through the JSON, but get no editor in this Issue.
- **Default mode** for a new row: `if-missing`.
- **New rules start disabled.** Today they start enabled (`AutoMoveSection.svelte:55`), so a half-built rule acts on every save made while it is being typed. The user turns the rule on when it is ready.
- **Commit on change or blur, not on every keystroke,** for the filter, key and value fields. Today `oninput` writes each keystroke (`AutoMoveRuleRow.svelte:69,112,137`), so a partial filter or value is live.
- **Match count:** under the filter, "Matches N notes now", computed from `collectionStore.propertyIndex` with the same matcher Issue 01 uses, after the user stops typing. This is the cheap guard against a broad or misspelled filter (`stauts == null` matches every note).
- **Hint:** a rule with no destination and no properties does nothing. Say so inline, in the style of the expression error, without blocking the save.

### Acceptance

- [ ] Failing test first, in `src/tests/lib/features/auto-move/AutoMoveRuleRow.test.ts`: adding a property row, typing key `status` and value `done`, and choosing `always` saves `properties: [{ key: 'status', value: 'done', mode: 'always' }]`.
- [ ] Removing a row and editing a row's value are covered.
- [ ] `_archived` shows a checkbox and saves a boolean.
- [ ] The `_icon` key opens the icon picker, and its choice saves `pack:name`.
- [ ] A new rule is created disabled.
- [ ] Typing in the filter does not save until change or blur.
- [ ] The match count shows the number of index records the filter matches, and 0 for an empty filter.
- [ ] The "does nothing" hint shows for a rule with an empty destination and no properties, and hides otherwise.
- [ ] `22-auto-move.md` shows the Settings flow.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- Open-itens 079 (a rule edit is flushed on close) touches the same section. Do not fix it here.
- Research: `.scratch/frontmatter-rules/research/scout-11-settings-ui-persistence.md`.

## Comments
