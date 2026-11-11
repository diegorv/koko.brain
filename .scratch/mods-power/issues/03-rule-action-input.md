# 03: An Auto Organize rule passes a text to its mod action

**What to build:** a rule's `runAction` gains an optional `input`, a literal text the rule passes to the mod action as `run`'s first argument. Today the rule path always passes `''`. The text reaches only an action that declares `input`; any other action keeps getting `''`, as the contract states. Settings shows one text field under the rule's **Run mod action** when the picked action asks for text.

```json
{
  "id": "rule-1710000000000-s5m4r",
  "name": "Tag finished meetings",
  "expression": "type == \"meeting\" && status == \"done\" && tagged != true",
  "destination": "",
  "runAction": { "id": "mod:ai-tools:action:tag", "input": "meeting-notes" },
  "enabled": true
}
```

**Blocked by:** none

**Requires first (other repo):** nothing. The mods contract already types the text: `run: (input: string, run: ModRunV1) => unknown` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts:103`), and its comment "`''` without `input`" (`:99`) stays true under this design. No mods-repo edit and no mod-core SHA adoption.

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `RuleRunAction` (`src/lib/features/auto-organize/auto-organize.types.ts:103-106`, now `{ id }`) gets `input?: string`, with JSDoc: the text passed to an action that declares `input`; ignored by any other action.
2. **Load.** `sanitizeRunAction` (`src/lib/features/auto-organize/auto-organize.logic.ts:607-611`) keeps `input` when it is a non-empty string, as typed (no trim; the picker does not trim either, `src/lib/plugins/mods/ModActionPicker.svelte:87`). `''`, or a non-string `input` (number, null, array), is omitted. Id handling is unchanged. Load and save need no other change: `runAction` survives load through `...rest` (`auto-organize.service.ts:142-144`), save is `JSON.stringify` (`:186-190`), `updateRule` is a shallow merge (`auto-organize.store.svelte.ts:34`).
3. **Core slot.** `RuleAction` (`src/lib/core/rule-actions/rule-actions.store.svelte.ts:17-24`):
   - `run: (target: RuleActionTarget, input: string) => Promise<void>`. The second argument is always a string.
   - new `input?: { placeholder?: string }`, present when the action asks for text, so Settings knows whether to show the field and its placeholder. JSDoc on both.
4. **Run.** `runRuleAction` (`src/lib/features/auto-organize/auto-organize.service.ts:380-400`) reads `{ id, input }` from `sanitizeRunAction` (`:389` destructures only `id` today) and calls `action.run({ on: 'note', path }, input ?? '')` (`:399`). Update the doc comment at `:374-379` to say the rule's text goes along.
5. **Mods host.** The `ruleActionsStore.register` call in `addAction` (`src/lib/plugins/mods/mods-host.service.ts:509-515`):
   - registers `input: entry.input` (the copy at `:491-497` already holds `{ placeholder }` or undefined);
   - runs `runAction(entry, entry.input ? input : '', 'rule', true, { ...target })` instead of the hardcoded `''` at `:514`. An action without `input` gets `''` even when the stored rule carries text (hand-edited JSON, or a mod that later dropped `input`).
   - Update the comment at `:509` ("Lazy and with no input"): still lazy, and the text is the rule's.
   - The text stays out of logs. The trace identity is `modId, actionId, runId, origin` (`:346`) and `runRuleAction` logs id and path only (`auto-organize.service.ts:398`). Do not add it.
6. **Settings row.** `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`, inside the `Run mod action` column (`:490-508`):
   - Under the Select, one single-line `Input` with `aria-label="Mod action input"`, shown only when the selected action is registered and its slot entry has `input`. Placeholder from `input.placeholder`.
   - Value from `rule.runAction?.input ?? ''`. Commit on `change`, never per keystroke, like the rename field (`:376-383`, `commitRename` `:232-246`): a rule is live as soon as the store changes (`AutoOrganizeSection.svelte:62-64`). Committing writes `onupdate(rule.id, { runAction: { id, input } })`; an empty field writes `{ id }` with no `input` key. An unchanged value writes nothing.
   - `setRunAction` (`:255-258`) keeps writing `{ id: value }`, so picking another action drops the old text on purpose. Re-picking the same id is already a no-op (`:256`). **None** removes both, as today.
   - Not loaded (`actionMissing`, `:124`): no field, and the stored `input` is left alone, so a mod being off never erases config.
   - `doesNothing` (`:116-122`) is unaffected.

### Docs

- `help/documentation/22-auto-organize.md`:
  - "Running a mod action" (`:447-476`): the JSON example gains `"input"`; a new bullet: **Text for the action.** When the action asks for text, Settings shows a field under **Run mod action**; the rule passes that text, as typed, at every run. An action that asks for no text gets none. The text is plain JSON in the vault: do not put secrets in it.
  - The **Run mod action** line in the rule fields (`:67`) mentions the text field.
  - The Configuration File example (`:737`) may gain `input`; optional.
- `help/documentation/mods/02-actions-and-entry-points.md`: table row `:18` (last column becomes: the rule's text, set in Settings, for an action with `input`; `''` otherwise) and the "The call" bullet at `:337`.
- `help/documentation/mods/13-api-reference.md:79` ("A rule calls `run('', run)`").
- `help/documentation/28-mods.md:212` ("The rule calls the action with no text (`''`)").

The doc-example test parses JSON only from the "Overview" and "Examples" sections (`src/tests/help/auto-organize-doc-examples.test.ts:60`), so these edits touch no fixture.

### Acceptance

- [x] Failing test first, in `src/tests/lib/plugins/mods/mods-host.service.test.ts` (`rule actions`, `:413`): a mod action with `input: {}` listed in `ruleActions`, run through `ruleActionsStore.get(id)!.run({ on: 'note', path: 'Work/alpha.md' }, 'hello')`, receives `'hello'`. It fails today, because the host passes `''` (`mods-host.service.ts:514`). The existing test at `:436-451` that pins `''` for this case is the behavior being changed: update it, do not delete its other assertions.
- [x] Mods host: an action without `input` receives `''` when the rule passes text. `ruleActionsStore.list` exposes `input` (with its placeholder) for a declaring action and none otherwise. `run.target` has no `input` key. No `debug` call contains the text.
- [x] `auto-organize.logic.test.ts` (`sanitizeRunAction`, `:1481`): keeps a text `input`, keeps surrounding whitespace, drops `''`, a number, null and an array; id trimming and the blank-id case unchanged.
- [x] `auto-organize.service.test.ts` (`run mod action`, around `:1880`), through the real `ruleActionsStore`: a rule with `input: 'x'` calls the action with `({ on: 'note', path }, 'x')`; a rule without input calls it with `''`. The two assertions at `:1920` and `:1930` gain the `''` argument (an update for the changed signature, not a weaker check). The moved-note case still gets the final path and the text.
- [x] `src/tests/lib/core/rule-actions/rule-actions.store.test.ts`: a registered action keeps `input`, and `run` receives the second argument.
- [x] `AutoOrganizeRuleRow.test.ts` (`Run mod action`, `:1010`): no field for an action without `input`; the field with the placeholder for one with it; `change` commits `{ runAction: { id, input: 'x' } }`; typing alone (an `input` event) calls no `onupdate`; clearing the field commits `{ runAction: { id } }`; picking another action commits `{ id }` only; for a not-loaded action there is no field and no `onupdate`.
- [x] Docs above updated.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Research:** `.scratch/mods-power/research/item-03-host.md`, `item-03-contract.md`, and `item-03-validation.md` (which wins where they differ). Code read at `c2bed3463`.
- **Decisions taken from the validation:**
  - The text reaches only an action that declares `input`. Passing it to any action would break the contract sentence "`''` without `input`" (`mod-api.v1.ts:99`), which the picker also keeps (`ModActionPicker.svelte:73-78`). This design needs no contract edit, not even a comment.
  - `RuleAction.run` always gets a string; no branch that calls `run(target)` with one argument.
  - The rule path already passes `lazy = true` and opens no field (`mods-host.service.ts:514`); nothing changes there.
- **Cut:** templates or variables in the text (the mod has `run.target.path`; do not reuse `resolveDestination`, which rewrites slashes, `auto-organize.logic.ts:931-957`), an expression mode, multi-line input, a dedupe of repeated runs, a queue for busy drops, any mods-repo example change.
- **Accepted limits:**
  - While the action runs, a rule's call is dropped (`mods-host.service.ts:338-341`). The text is static per rule, so the next matching save sends it again.
  - The loop hazard is unchanged in kind: an action's write is an ordinary save that re-runs rules (`22-auto-organize.md:470-476`). An input-driven append action makes it easier to hit; the existing warning covers it. Item 2 (`ignoreOwnWrites`) is about `onNoteSaved` and does not break rule loops; do not cite it as a fix.
- **Security:** no new trust boundary under ADR 0036. The text comes from the owner's `.kokobrain/auto-organize-rules.json` and goes to a mod that already runs with full trust.
- **Ordering:** independent of the other mods-power items. It shares `mods-host.service.ts` with items 2, 4, 5, 6 and 7, but only the rule registration in `addAction` (`:509-515`), which none of them should touch. Run it serially with 06 to avoid rebase churn in that file.
- **Not verified:** whether Vitest's `toHaveBeenCalledWith` with one argument fails on a call with a trailing second argument (from memory); the Acceptance sidesteps it by updating the two assertions. No UI was run.

## Comments

- 2026-11-11, branch `issue/03-rule-action-input`: an Auto Organize rule can store a text `input` for its mod action; the host passes it as the action's second argument (`''` when the rule has none or the action declares no `input`), and the rule row shows a text field with the action's placeholder for actions that declare `input`. Fix round: the field reads the sanitized input, so a hand-edited non-text value shows empty. Tests: full suite at c8584b37f passed (611 files, 15404 tests, 54 skipped, 1 todo); `pnpm check` 0 errors. Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md).
