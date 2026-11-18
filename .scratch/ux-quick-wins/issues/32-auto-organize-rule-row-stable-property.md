# 32: Auto Organize rule row: stable property rows, template variables, named controls, Off state, focus on what you just added

**Origin:** design review 2026-11-17, proposals P152, P69 (part), P70 (part), P185, P149 (part), P28 (rule row names), prototype `.scratch/design-review/prototypes/settings-auto-organize.html`, research `.scratch/ux-quick-wins/research/verdict-settings-a.md` (ticket B) and `verdict-settings-b.md` (Q1) and `breakdown.md` (old ticket 31).

**What to build:** Split point if the run is too large: stable property row ids and the unknown-variable line (items 1 and 2, logic plus Row) first, then names, Off state and focus (items 3 to 5).

1. **Stable property rows (P152).** Set-property and create-note property rows keyed by a parallel `$state` id array in the Row: append on add, splice on remove, unchanged on edit, rebuilt when the array length changes from outside (a config reload). Ids are never written to the rule. A `WeakMap` keyed on the object breaks: `autoOrganizeStore.rules` is deep `$state`, so a raw object read back is wrapped in a new proxy (`node_modules/svelte/src/internal/client/proxy.js:40-49,249`) and the edited row would remount and lose its refused draft. Today keys are `(i)` (`src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:427,468`), so after a delete the next row can save the deleted row's refused expression (`AutoOrganizeRuleProperty.svelte:120-137`): a wrong write into the rules file, which this removes.
2. **Template variables (P69 part).** `TEMPLATE_VARIABLES` (`folder`, `parent`, `basename`, `type`, `status`, `year`, `month`) and `unknownTemplateVariables(template)` in `src/lib/features/auto-organize/auto-organize.logic.ts`, using the same `/\{(\w+)\}/g` as `resolveDestination` (`:953-962`) and `includes`, never an object lookup. `resolveDestination` is unchanged. Under Move to folder a `text-meta text-muted-foreground` variables line, replaced by a `text-destructive` warning "{yaer} is not a variable, so a folder named {yaer} would be created"; under Create note path and Rename (Name mode) only the warning (Rename already refuses `{basename}`, `renameProblem` `:591`). Nothing is blocked, trimmed or rewritten.
3. **Names (P28 rule row).** "Rule name", "Enable rule", "Move rule up", "Move rule down", "Delete rule", "Move to folder"; the icon button gets its existing title as its name (ticket 33 renames it).
4. **Off state (P185).** When `!rule.enabled` the card (`:285`) gets `border-dashed` and an "Off" pill (`data-rule-off`) beside the switch (`:294-297`); every card gets `focus-within:border-ring`. No opacity change, inputs not disabled.
5. **Focus (P70 part, P149 part).** After "Add rule" the new rule's name input has focus: `AutoOrganizeSection.svelte` passes the new id (two or three lines) and the Row focuses its name input on mount when told to. After "Add property" (`:435-438`), "Add note property" (`:477-485`) or "Add expression" the new row's first input has focus after `tick()`; the expression input is found inside `[data-rule-filter]`, no `FilterRow` edit. `focus()` scrolls, so no `scrollIntoView`. Mounting existing rows moves no focus.

Not in this ticket: collapsible rule cards and "Add action" (P70 rest), the Insert variable menu, live destination preview and folder suggestions (P69 rest), the `{constructor}` own-key fix in `resolveDestination` (a move-path change, separate), and any edit to `FilterRow.svelte` or `auto-organize.service.ts`.

**Size:** M (six behaviours in the 549-line rule row).

**Blocked by:** 15, 31

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh auto-organize-flows.spec.ts (it finds the rule switch by `getByRole('switch').nth(1)`).

- [ ] Failing test first, `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` (real stores): a rule with two set-property rows where row 0 shows a refused expression; remove row 0; the remaining row shows no error, and changing its mode saves its own expression (assert `autoOrganizeStore.rules[0].properties`), never row 0's refused text.
- [ ] A refused expression stays visible after a key change on the same row (no remount); `JSON.stringify(autoOrganizeStore.rules)` has no Row id field.
- [ ] Failing test first, `auto-organize.logic.test.ts`: `unknownTemplateVariables('{folder}/{yaer}')` is `['yaer']`; `'{folder}/_archive/{year}'`, `'plain'` and `''` give `[]`; `'{constructor}'` gives `['constructor']`; every `TEMPLATE_VARIABLES` name resolves through the real `resolveDestination` to something other than the literal `{name}`.
- [ ] Typing `{folder}/{yaer}` into Move to folder shows the warning naming `{yaer}` and the saved `destination` is exactly that text; a valid template shows the variables line and no warning.
- [ ] The named controls are found by role and name; a disabled rule has `[data-rule-off]` and `border-dashed`, an enabled one neither, and the pill follows a prop change.
- [ ] `AutoOrganizeSection.test.ts`: "Add rule" leaves `document.activeElement` on the new "Rule name" input; "Add property", "Add note property" and "Add expression" focus the new row's first input; mounting existing rows moves no focus.
- [ ] Edits to `AutoOrganizeRuleRow.test.ts` stay additive (shell-sidebars-ux 16 adds one assertion there).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes.

## Original proposal

- **P152.** Property rows are keyed by index, so error state follows the wrong row. Key rows by a stable client-side id that is not persisted.
- **P69 (part).** The destination field hides its template variables, and a typo creates a literal folder. A variables line and a flag on unknown variables ship; the Insert menu, live preview and suggestions do not.
- **P70 (part).** Each rule is a flat form. Only "a new rule opens with the name focused" ships.
- **P185.** A disabled rule looks almost identical to an enabled one: an "Off" pill, a dashed border and a focus-within border; inputs keep full opacity.
- **P149 (part).** New rules are added below the fold without focus. A new property or expression row focuses its first input (the new rule's name focus is in P70 above).
- **P28 (rule row).** Explicit names on the rule row controls only.

## Problem

Deleting a property row moves the next row into the deleted row's local draft and error, and a later mode change can save the refused expression into another property. A mistyped `{yaer}` silently creates a folder with that name. Controls in the card have no accessible names, a disabled rule reads like an enabled one, and after adding a rule or a row focus stays on the add button.

## Evidence

Checked at 085b23c5d.

- `AutoOrganizeRuleRow.svelte:427,468` `(i)` keys; `AutoOrganizeRuleProperty.svelte:67-75` per-instance `exprError` and `refusedExpr`; `setMode` and `commitKey` save `draftExpr` (`:120-137`).
- `auto-organize.store.svelte.ts:4` deep `$state`; `updateRule` assigns a new object (`:34-36`).
- `AutoOrganizeRuleRow.svelte:288-293` name input, `:294-323` switch and buttons, `:400-407` Move to folder (placeholder only), `:408-414` icon button, `:285` card.
- `AutoOrganizeSection.svelte:49-60` `addRule` adds a disabled rule (`:55-56`) and focus stays on "Add rule".
- `auto-organize.logic.ts:953-962` unknown `{var}` kept literally; also used by Rename (`:654`) and Create note path (`:428`).
- `auto-organize-flows.spec.ts:44` finds the switch by index, a pill is not a switch.

## Why blocked

- 31: same `AutoOrganizeSection.svelte` and `AutoOrganizeSection.test.ts` (this ticket adds the focus prop and a focus test there).
- 15: it renames the remove buttons of `FilterRow` and `FormulaRow`, which the rule row renders through `FilterPanel`; this ticket's name lookups in `AutoOrganizeRuleRow.test.ts` should be written once against those names.

## Sequence with

Ticket 33 edits `AutoOrganizeRuleRow.svelte` and `AutoOrganizeRuleProperty.svelte` after this one (its stable keys keep each error on its row). Ticket 34 turns "Add expression" into an "Add condition" menu item and must keep the focus move from item 5. Shell-sidebars-ux 16 adds one assertion to `AutoOrganizeRuleRow.test.ts`. Open-itens 031 (rules loader) is separate. Shell-sidebars-ux 04, 10 and 11 own `PropertyField.svelte`, which this ticket does not touch.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
