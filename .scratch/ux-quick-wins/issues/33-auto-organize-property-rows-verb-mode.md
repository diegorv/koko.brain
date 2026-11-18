# 33: Auto Organize property rows: verb mode labels, errors tied to their fields, the legacy icon only where set

**Origin:** design review 2026-11-17, proposals P147 (part), P148 (part), P151, prototype `.scratch/design-review/prototypes/settings-auto-organize.html`, research `.scratch/ux-quick-wins/research/verdict-settings-b.md` (Q2 and Q3) and `breakdown.md` (old ticket 32).

**What to build:**

1. **Verb modes (P147).** Labels "Set if missing", "Always overwrite", "Remove", "Add to list" (`src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:51-56`), each option rendering its label in its own element plus a one-line description ("Writes only when the note has no value", "Replaces the note's value on every save", "Deletes the property", "Adds items to a list"; `select-item.svelte:32-36` renders `children`). The trigger (`:328`, `w-28`) widens to fit "Always overwrite". Stored `mode` values (`if-missing`, `always`, ...) are unchanged. `exprProblem`'s message (`auto-organize.logic.ts:511`) now names "Set if missing" instead of `"if missing"` (copy only, asserted in `auto-organize.logic.test.ts:780-781,1168-1169`, `auto-organize.service.test.ts:268,272` and `AutoOrganizeRuleRow.test.ts:499,510,549`).
2. **Errors tied to fields (P148).** `aria-invalid="true"` and `aria-describedby` (ids from `$props.id()`, per row instance, never `rule.id`) on Create note path, Create note template, Rename to, Property expression and Property key while `isRefusedKey`. Refusals kept unsaved lead with "Not saved:" in the Row markup only, never in `BLANK_VALUE_ERROR` (`auto-organize.logic.ts:25`; the loader's `filterProblem` returns it at `:41` and a prefix would put a false message in logs) or in `exprProblem`. A stored invalid path, template or rename (hand-edited JSON; `pathInvalid` `:189`, `templateInvalid` `:191-193`, `renameProblem` `:232`) says a run ignores it, not "not saved". Help `22:62` quotes "Every filter needs a value": keep that substring or update the help.
3. **Legacy icon (P151, no data migration).** The button (`AutoOrganizeRuleRow.svelte:408-421`) renders only when `rule.icon` is set, as an outline button named "Legacy icon on move" with `pack:name` in its title and a muted hint pointing to the `_icon` property. Picker, recolour and remove are unchanged, so `handleIconRemove` (`:272-275`) clearing the icon hides the button, the intended end state. The hint shows only next to a set icon (prototype `settings-auto-organize.html:663,674`).
4. **Help.** `help/documentation/22-auto-organize.md:68,328,339,341,485` take the new labels (the backtick stored values at `:199,263-264,315,347,365-366` stay); `:62` only if the quoted message changes.

Not in this ticket: collapsing the Source and Type choosers while at defaults (P147 rest), the `aria-label`s for name and folder (ticket 32), any data migration of `rule.icon`, the `_icon` row itself (`AutoOrganizeRuleProperty.svelte:279-288`, already the path for new rules).

**Size:** S.

**Blocked by:** 32

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh auto-organize.spec.ts auto-organize-flows.spec.ts (the property row layout test needs a real browser).

- [ ] Failing test first, `AutoOrganizeRuleRow.test.ts`: the mode menu offers the four labels with descriptions; choosing "Always overwrite" calls `onupdate` with `mode: 'always'`; `allowRemove={false}` offers no "Remove"; a lifecycle key offers no "Add to list".
- [ ] Committing `notes/bad` in Create note path sets `aria-invalid` and its `aria-describedby` text starts "Not saved:"; a valid path removes both; the same for template, refused rename and refused expression; two property rows get different message ids; a stored invalid `createNote.path` shows the message without "Not saved:".
- [ ] A rule without `icon` has no "Legacy icon on move"; with one, the button opens the picker ("Change icon") and the `_icon` hint shows; removing the icon hides the button.
- [ ] `exprProblem('now()', 'always')` names "Set if missing" (the three test files updated on purpose); `filterProblem` unchanged; the `choose` helper (`AutoOrganizeRuleRow.test.ts:187-199`) matches on the label element, because with a description inside every option it matches nothing on the whole `textContent`.
- [ ] `bash scripts/e2e.sh auto-organize.spec.ts auto-organize-flows.spec.ts` passes, including "every property row fits its controls side by side inside the rule card" (`auto-organize.spec.ts:98-130`), which jsdom cannot check and which guards the wider mode trigger.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P147 (part).** Property rows pack six controls and unexplained jargon. Verb labels with one-line descriptions ship; collapsing the source and type choosers does not.
- **P148 (part).** Rule validation errors are not tied to their fields: `aria-invalid`, `aria-describedby` and a "Not saved:" lead. The name and folder labels are in ticket 32.
- **P151.** A legacy "file icon" button duplicates the `_icon` property. Show it only on rules that already set `rule.icon`, labelled "Legacy icon on move", with a hint to `_icon`. Validation: revise, no data migration.

## Problem

Modes read as `if-missing` and `always`, and "always" hides that it overwrites. A refused path, template, rename or expression is red text only, with nothing marking the field. Every rule carries a legacy icon button that duplicates the `_icon` property under another name.

## Evidence

Checked at 085b23c5d.

- `AutoOrganizeRuleProperty.svelte:51-56` labels, `:222-352` row, `:354-364` error paragraphs with no ids; `AutoOrganizeRuleRow.svelte:393-395,451-455,463-467,352-353` error paragraphs; no input sets `aria-invalid` (`input.svelte:30` styles it).
- `auto-organize.logic.ts:511` message with `"if missing"`; `:25,41` `BLANK_VALUE_ERROR` shared with the loader.
- `auto-organize.service.ts:359-364,666-685` still applies `rule.icon`; `.scratch/frontmatter-rules/PRD.md:43` keeps the field.
- `AutoOrganizeRuleRow.test.ts:58-99` opens the picker from a rule that has an icon, so it stays valid.
- Help `22-auto-organize.md:202,485` already says to use properties instead.

## Why blocked

- 32: it edits `AutoOrganizeRuleRow.svelte` and `AutoOrganizeRuleProperty.svelte` and their tests; its stable property row ids keep each error on its row, and it names the icon button with its title, which this ticket replaces with "Legacy icon on move".

## Sequence with

Ticket 34 edits `AutoOrganizeRuleRow.svelte` (the filter label column, around `:329-355`) after this one. The deferred Undo work for deleted rules would add an insert-at-index helper to `auto-organize.logic.ts`; it is deferred, so no action. Shell-sidebars-ux 16 adds one assertion to `AutoOrganizeRuleRow.test.ts` (additive). Open-itens 031 and frontmatter-rules 05 do not touch these lines.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
