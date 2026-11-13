VERDICT: APPROVED

Review of `git diff main...HEAD` (367ddf492..82de3876c) on branch `issue/02-rule-consequences-in-settings`.

## Acceptance criteria

- [met] Failing test first, in `src/tests/lib/features/auto-move/AutoMoveRuleRow.test.ts`: adding a property row, typing key `status` and value `done`, and choosing `always` saves `properties: [{ key: 'status', value: 'done', mode: 'always' }]`. — Test "adds a property row and saves its key, value and mode" in that file asserts exactly `{ properties: [{ key: 'status', value: 'done', mode: 'always' }] }`, driving the real shadcn Select. It cannot pass on main: main's row has no "Add property" button, so `button('Add property')` throws. Test and code share commit a92e7930e, so the red run itself is the build's claim; the test passes now.
- [met] Removing a row and editing a row's value are covered. — Tests "removes a row" (asserts the remaining row is `b`, in the update and in the DOM) and "edits a row value on change, not on every keystroke" (no update while typing, one update on change).
- [met] `_archived` shows a checkbox and saves a boolean. — Test "shows a yes/no toggle (the Settings Switch) for _archived and saves a boolean": committing key `_archived` saves `value: false`, toggling saves `true`. The control is the shadcn Switch (`role="switch"`), not a literal checkbox: `src/tests/lib/core/settings/settings-controls.test.ts` rejects a native `<input type="checkbox">` in Settings and `components/ui/` has no Checkbox, so the Switch is the Settings boolean control. Accepted as meeting the intent.
- [met] The `_icon` key opens the icon picker, and its choice saves `pack:name`. — Test "opens the icon picker for _icon and saves its choice as pack:name" uses the real IconPicker, picks `star (lucide)` and asserts `value: 'lucide:star'`. `AutoMoveRuleProperty.svelte:62` writes `${pack}:${name}`.
- [met] A new rule is created disabled. — `AutoMoveSection.svelte:56` `enabled: false`; new `AutoMoveSection.test.ts` clicks "Add rule" and asserts on the real `autoMoveStore` (`rules[0].enabled === false`, `enabledRules` empty).
- [met] Typing in the filter does not save until change or blur. — `AutoMoveRuleRow.svelte:50,154-155`: `oninput` writes only the `filterDraft` writable `$derived` (Svelte 5.57.3), `onchange` commits. Test "does not save while typing, only on change" asserts no update after two inputs and one update on change.
- [met] The match count shows the number of index records the filter matches, and 0 for an empty filter. — `countMatchingNotes` (`auto-move.logic.ts:81-95`) runs `findMatchingRules`, the save path's matcher, over `collectionStore.propertyIndex` with `vaultStore.path`. Row tests "shows how many index records the filter matches" (1 of 2), "shows 0 for an empty filter", "counts a typed filter once the user stops typing" (real `collectionStore`); logic tests cover blank, empty index, parse error, `.view` exclusion and relative `file.inFolder`.
- [met] The "does nothing" hint shows for a rule with an empty destination and no properties, and hides otherwise. — `AutoMoveRuleRow.svelte:65,223-227`, styled `text-meta text-destructive` like the expression error, not blocking saves. Four tests: shows on a blank rule, hides with a destination, hides with a keyed property, still shows with only a keyless row. Correct that a legacy `icon` alone does not hide it: the service applies it only for the moving rule (`auto-move.service.ts:255,261`).
- [met] `22-auto-move.md` shows the Settings flow. — New "Creating a Rule in Settings" section in `help/documentation/22-auto-move.md:40-60`: add rule (starts disabled), filter saved on leave/Enter, match count, Then area, value editors per key, numbers and lists read-only. See finding 3 for one inaccurate line.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` run by this review: 0 errors, 0 warnings. Targeted tests run by this review pass (see Checks). The full suite is deliver's to run.

## Findings

1. **minor** `src/lib/features/auto-move/AutoMoveRuleRow.svelte:67-71`, `src/lib/features/auto-move/AutoMoveRuleProperty.svelte:43-49`: the refused key `todoist_project` (PRD Decision 10) is suggested by the key datalist whenever a note has it, and accepted without feedback. The rule then never writes it (`ownedProperties` sanitizes), and the row vanishes from Settings at the next vault load (`sanitizeRuleProperties`), so the user sees a working row that silently does nothing. Fix: leave the refused keys out of `keySuggestions` and show an inline note on a refused key, in the expression-error style (export a `isRefusedKey` beside `isBooleanOnlyKey`), with a row test.
2. **nit** `src/lib/features/auto-move/AutoMoveRuleProperty.svelte:43-49` with `src/lib/features/auto-move/auto-move.logic.ts:132-135`: `ruleValueEditor` checks `typeof value === 'boolean'` before `_icon` / `_color`, and `commitKey` keeps a boolean value. Renaming an `_archived` row (value `false`) to `_icon` shows a Switch plus the type chooser, and the icon picker only appears after picking "Text". Fix: in `commitKey`, reset a non-string value to `''` when the new key's editor is `icon` or `color`.
3. **nit** `help/documentation/22-auto-move.md:57`: "the **Icon** row sets `_color`, the **Text** row sets `_title_color`" reads as if one picker sets both. On a `_color` row the Text swatches do nothing (`setColor`, `AutoMoveRuleProperty.svelte:57-59`, ignores `textColor`), and the reverse on a `_title_color` row. Fix: "On a `_color` row, pick from the **Icon** colors; on a `_title_color` row, from the **Text** colors."
4. **nit** `src/lib/features/auto-move/auto-move.logic.ts:127`: the `ruleValueEditor` JSDoc says "a checkbox"; the UI is a Switch. Fix: say "a yes/no switch".
5. **nit** `src/lib/features/auto-move/AutoMoveRuleRow.svelte:56-61,170-173`: for the 300 ms after a filter edit turns valid, "Matches N notes now" shows the count of the previous filter text. Acceptable under "after the user stops typing"; optional fix: hide the count while `countedFilter !== filterDraft`.

Not findings, checked:
- `ownedProperties` now reads `sanitizeRuleProperties(rule.properties)`: idempotent on already-sanitized loaded rules, and it stops an unfinished Settings row (blank key) on an enabled rule from writing. `auto-move.service.test.ts` and `auto-move.no-chain.test.ts` pass.
- Match-count cost: a probe (removed afterwards) on 10,000 index records took 5 ms for `status == 'done'` and 16 ms for a three-term filter, so re-parsing per record is not a problem.
- Name and destination still save per keystroke: the Issue names only the filter, key and value.
- An uncommitted filter draft is lost if Settings closes while the field is focused; that is the close-flush problem open-itens 079 owns, which the Issue says not to fix here.
- No layer-baseline entry, `BASELINE_SIZE` change or composition root is added; `src/tests/lib/architecture/` passes.
- Stores are not mocked: the row tests use the real `collectionStore` and `vaultStore`, the section test the real `autoMoveStore`.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-move/ src/tests/lib/core/settings/settings-controls.test.ts src/tests/lib/core/settings/settings-copy.test.ts src/tests/lib/core/settings/settings-text.test.ts src/tests/lib/core/settings/settings-headings.test.ts src/tests/help/ src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/architecture/`: exit 0, 31 files, 650 tests passed. The test verdict rests on these files, in particular `AutoMoveRuleRow.test.ts`, `AutoMoveSection.test.ts`, `auto-move.logic.test.ts`, `auto-move.service.test.ts`, `auto-move.no-chain.test.ts` and `settings-controls.test.ts`.
- Full suite not run: deliver runs it.
- Worktree clean before the review file was written.

## Resolution

All five findings accepted and fixed:

1. `isRefusedKey` exported from `auto-move.logic.ts`; `AutoMoveRuleRow.svelte` leaves refused keys out of the key suggestions, and `AutoMoveRuleProperty.svelte` shows an inline destructive note (`data-refused-key`) on a `todoist_project` row. Tests: logic `isRefusedKey`, row "does not suggest the refused key todoist_project" and "notes that a rule never sets todoist_project".
2. `commitKey` resets a non-string value to `''` when the new key's editor is `icon` or `color`. Test: "resets a yes/no value when the key is renamed to _icon, so the icon picker shows".
3. `22-auto-move.md` color line reworded per row.
4. `ruleValueEditor` JSDoc (and its test name) say "a yes/no switch".
5. The match count is hidden while `countedFilter !== filterDraft`. Test: "hides the previous count while the typed filter is not counted yet".
