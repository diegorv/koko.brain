# Issue 03 discovery: rule passes a text to its mod action

## Files that change
- `src/lib/features/auto-organize/auto-organize.types.ts:103-106` `RuleRunAction` gains `input?: string`.
- `src/lib/features/auto-organize/auto-organize.logic.ts:606-611` `sanitizeRunAction` keeps a non-empty string `input`, untrimmed.
- `src/lib/core/rule-actions/rule-actions.store.svelte.ts:17-24` `RuleAction.run(target, input: string)`, new `input?: { placeholder?: string }`.
- `src/lib/features/auto-organize/auto-organize.service.ts:374-400` `runRuleAction` passes `input ?? ''`; doc comment.
- `src/lib/plugins/mods/mods-host.service.ts:509-515` register `input: entry.input`, run with `entry.input ? input : ''`; comment.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte` derived `actionInput` (slot entry's `input` for the saved id), an `Input aria-label="Mod action input"` under the Select, `commitActionInput` on `change`.
- Docs: `help/documentation/22-auto-organize.md` (:67, :447-476, :737), `mods/02-actions-and-entry-points.md` (:18, :337), `mods/13-api-reference.md:79`, `28-mods.md:212`.

## Plan (test-first, one commit per layer)
1. mods host test (`rule actions`, :436) red: `input: {}` action run with `'hello'` gets `'hello'`; add: no-`input` action gets `''`; `list` exposes `input`; target has no `input`; no debug call contains the text. Then store type + host change.
2. logic test for `sanitizeRunAction`, then logic change; type field.
3. service tests (`run mod action`, :1880) for `'x'` and `''`, the two `toHaveBeenCalledWith` assertions gain `''`, moved-note case gets text. Then service change.
4. store test: registered action keeps `input`; `run` gets second arg.
5. row tests (`Run mod action`, :1010), then the Svelte field.
6. Docs.

## Prior-art tests to copy
- Row: `type()` / `commit()` helpers and the rename tests (`AutoOrganizeRuleRow.test.ts:891-903`); `registerAction` helper extended with an optional `input`.
- Service: `fakeAction` / `runner` helpers (`auto-organize.service.test.ts:1886-1896`), `runner` overrides accept `runAction`.

## Defaults taken
- Row commit: value read from the event, compared with `sanitizeRunAction(rule.runAction)?.input ?? ''`; equal writes nothing. Empty writes `{ id }`. No trim (the issue says "as typed").
- The field is keyed on the registered slot entry for the saved id (`ruleActionsStore.get(actionId)?.input`), so `actionMissing` shows no field.
- Placeholder: `input.placeholder`, else none.

## Risks
- `runAction` in the host is shared with palette/menu paths; only the rule registration line changes.
- `toHaveBeenCalledWith` with fewer args fails on an extra trailing arg (vitest compares the full args array), so every existing call assertion in the touched tests must gain `''`.
