# Item 3, host side: Auto Organize rule action input

Scout report. Paths are relative to /Users/diegorv/Dev/pet-projects/koko/brain unless noted. Nothing was run; every claim below was read in code.

## 1. Verdict

Host only, no contract change, small. `ModActionV1.run(input, run)` already takes the text (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts:89-104`). Today the rule path hardcodes it to `''` (`src/lib/plugins/mods/mods-host.service.ts:514`). The work is a data field (`runAction.input`), one extra argument through the core slot, a text field in the rule row, and docs/tests. No Rust, no IPC DTO, no generated bindings, no `package.json`, so no `pnpm build` and no mod-core SHA bump (docs/MOD-CORE.md).

Gate per CLAUDE.md rule 6: frontend only, `pnpm check` + `pnpm vitest run`.

## 2. Exact code an implementation touches

Data flow today: rule JSON -> `sanitizeRunAction` -> `ruleActionsStore.get(id).run(target)` -> mods host wrapper -> `runAction(entry, '', 'rule', true, {...target})` -> `action.run(input, run)`.

| # | File:line | Change |
|---|-----------|--------|
| 1 | `src/lib/features/auto-organize/auto-organize.types.ts:103-106` (`RuleRunAction`, now `{ id }`) | Add `input?: string` with JSDoc (JSDoc required on exported interface fields). |
| 2 | `src/lib/features/auto-organize/auto-organize.logic.ts:606-611` (`sanitizeRunAction`) | **Returns only `{ id }`** (line 610), so it would drop `input`. Keep `input` when `typeof === 'string'` and not `''`; omit otherwise. Pure logic, no framework imports (tests: `src/tests/lib/architecture/pure-logic.test.ts`). |
| 3 | `src/lib/core/rule-actions/rule-actions.store.svelte.ts:17-24` (`RuleAction`) | Change `run: (target) => Promise<void>` to `run: (target, input?: string)`, and add `input?: { placeholder?: string }` so the row knows whether the action asks for text (see section 4). |
| 4 | `src/lib/plugins/mods/mods-host.service.ts:509-516` (the `ruleActionsStore.register` call inside `addAction`) | Pass `input: entry.input` (entry copy at 491-497) and call `runAction(entry, entry.input ? (input ?? '') : '', 'rule', true, { ...target })`. The `''` without `input` keeps the contract sentence "`''` without `input`" true (`mod-api.v1.ts:99`). Update the comment at 509 ("Lazy and with no input"). |
| 5 | `src/lib/features/auto-organize/auto-organize.service.ts:380-402` (`runRuleAction`) | Read `input` from the sanitized `runAction` (line 389 destructures only `id`) and call `action.run({ on: 'note', path }, input)` (line 399). Fix the doc comment on 375-379. |
| 6 | `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:255-258` (`setRunAction`), 114-128 (derived action state), 490-508 (markup) | See section 3. |
| 7 | Docs, see section 7. |

No change needed: `loadAutoOrganizeConfig` (`auto-organize.service.ts:122-129`, `withValidProperties` keeps `runAction` via `...rest`, so a stored `input` survives load and the next save), `saveAutoOrganizeConfig` (`JSON.stringify(config)`, line 190), `autoOrganizeStore.updateRule` (shallow merge, `auto-organize.store.svelte.ts:34`), `type-lifecycle-rules.ts` (generated rules do not use `runAction`), the mods contract and `src/lib/plugins/mods/contract/mod-api.v1.ts` (type re-export only), `mods.logic.ts` manifest parsing.

## 3. Settings row design (AutoOrganizeRuleRow.svelte)

- Existing pattern to copy is the rename field: `Input` with `value` from the rule, `oninput` keeping a draft, `onchange` committing (`AutoOrganizeRuleRow.svelte:376-383`, `commitRename` 232-246). Reason (comment at 71-77 and docs/22-auto-organize.md:59): a rule runs on every save, so a half-typed value must never be live. Commit on `change`, not per keystroke.
- Show the field only when the selected registered action has `input` (needs item 3 in the table). When `actionMissing` (mod not loaded), the action's `input` is unknown: keep any stored input untouched and show nothing, or show a disabled/read-only note. Recommend showing nothing and leaving the stored value alone, so a mod being off does not erase config.
- Placeholder: `action.input.placeholder` from the slot.
- `setRunAction` (255-258) writes `{ id: value }`, which drops `input`. Decision needed: reset input when the action changes (recommended: a different action expects different text), keep it when the same id is re-picked (existing guard `value === actionValue` already returns early).
- The committed text: store as typed, do not trim (the picker passes text exactly as typed, docs/mods/02-actions-and-entry-points.md "Input step"); store `''` as "no input" (omit the key). Keep `onupdate(rule.id, { runAction: { id, input } })` shape.
- `doesNothing` (115-122) is unaffected.
- Layout: a second line under the Select inside the same `flex-col` container at 490-508, aria-label e.g. `Mod action input` (tests query by aria-label, see the existing `[aria-label="Mod action"]` in `AutoOrganizeRuleRow.test.ts:1012`).

## 4. Open design decisions (owner or planner)

1. **Literal text vs template.** Recommend literal in v1 (minimum code, matches "a rule passes a text"). If `{variable}` templates (`{basename}`, `{folder}`) are wanted later: **do not reuse `resolveDestination`** (`auto-organize.logic.ts:931-957`). It collapses `//` to `/` and trims leading/trailing `/` (line 955), which would corrupt free text such as `https://example.com`. Rename can reuse it only because `toFileName` follows. A template would need its own resolver, and the mod already receives the path in `run.target`, so the value of a template is low. An `expr` mode (evaluated like `RuleProperty.expr`, `auto-organize.types.ts` line ~26) is the other extension; also not needed now.
2. **Does the field depend on the action declaring `input`?** Recommended yes (section 2 row 3/4). Alternative: always show the field and always pass the text, which breaks the contract's `''` without `input` for mods that branch on it. Rejected.
3. **Reset on action change.** See section 3.

## 5. Existing pieces to reuse

- `runAction` wrapper already takes `input` and handles `origin: 'rule'`, lazy reveal, busy check, abort, trace (`mods-host.service.ts:336-433`). The wrapper does not log `input` (the trace `identity` at 346 is modId/actionId/runId/origin), so rule text does not reach the debug log. Keep it that way.
- `sanitizeRunAction` is already the single place a run and the row read the action (`auto-organize.service.ts:370,389`; `AutoOrganizeRuleRow.svelte:114`).
- Row commit pattern: `commitRename`/`renameDraft`.

## 6. Hidden costs and risks

- **Layer rules** (`src/tests/lib/architecture/layer-rules.test.ts`, ADR-0003): features may not import plugins. The change adds no import: the row already imports `ruleActionsStore` from core (line 28); the input hint rides on the core slot. `pure-logic.test.ts` covers `auto-organize.logic.ts`: keep `sanitizeRunAction` free of framework imports.
- **Editor-save path / indexing rules** (`docs/agents/indexing-watcher-rules.md`): untouched. The change adds no save, no path change and no index write. The existing loop hazard (an action's write is an ordinary save that re-runs rules; docs/22-auto-organize.md:472) is unchanged by input. One new angle: with a static input the loop is as before; do not add any "same note + same input" dedupe, that would be new behavior in the save path.
- **Busy drop loses the input silently.** While the action has a live run, a rule's call returns early (`mods-host.service.ts:338-341`, debug event `action-busy` only). With input the dropped call also drops a text, but it is the same pre-existing semantics ("not started again for that save", docs/22-auto-organize.md:466) and the input is static per rule, so the next matching save re-sends it. State it in docs; no queue (CLAUDE.md simplicity).
- **Changed signature breaks exact-arg assertions.** `auto-organize.service.test.ts:1920,1930` use `toHaveBeenCalledWith({ on: 'note', path })`, and fake actions in `rule-actions.store.test.ts:26-27` and the no-chain test use one-arg `run`. If `runRuleAction` always passes a second argument (even `undefined`), `toHaveBeenCalledWith` with one arg fails (argument-count mismatch). Choose: call `action.run(target)` when the rule has no input and `action.run(target, input)` otherwise, or update those assertions. The former keeps old tests meaningful. Verify by running them; I did not.
- **Security under ADR 0036** (`docs/adr/0036-vault-mods-trust-loader-storage.md`): mods run with full trust, the rule text comes from `.kokobrain/auto-organize-rules.json`, written by the owner in Settings. Input is passed to a mod the owner already trusts, same as a typed picker value. No new trust boundary. Do not put secrets in it (it is plain JSON in the vault and in Settings); worth one doc line. Not logged (see section 5).
- **Performance:** none; one string per run.
- **Stale stored input.** A rule keeps `input` after the mod drops `input` from the action: the host ignores it (section 2 row 4). A hand-edited non-string `input` is dropped by `sanitizeRunAction`.
- **Long or multi-line text.** The picker field is single-line; use a single-line `Input` in the row for parity. JSON can hold newlines if hand-edited; `run` receives them as is. Fine.

## 7. Docs to update (English, no emojis, no em-dashes)

- `help/documentation/22-auto-organize.md`: rule field list line 67 ("Run mod action"), section "Running a mod action" 449-476 (JSON example gets `"input"`, a bullet for input, the busy bullet at 466), line 13/43 need no change.
- `help/documentation/mods/02-actions-and-entry-points.md`: table row 18 ("never: the action runs with `''` and no text field" becomes: the rule's text, set in Settings), section "Actions a rule can run" 328-342 (bullet "The call" says "An action with `input` gets `''`: no text field opens"; replace).
- `help/documentation/mods/13-api-reference.md:79` ("A rule calls `run('', run)`").
- `help/documentation/28-mods.md:210-212` ("The rule calls the action with no text (`''`)").
- Cookbook 21 (`help/documentation/mods/14-cookbook.md:2656-2790`) only if it shows an input-taking action; optional.
- `help/examples/mods/kokobrain-mod.d.ts` and `src/tests/help/mods-types.test.ts`: no change (contract unchanged).
- Tests that parse docs: `src/tests/help/auto-organize-doc-examples.test.ts` + `auto-organize-doc-examples.fixture.json` do not mention `runAction` (grep found none); if the new JSON example is added as a fixture case, extend them, otherwise nothing.

## 8. Test plan (docs/TESTING.md: real stores and `.logic.ts`, mock only Tauri/side-effect services; each suite covers happy, empty, error)

Write failing tests first, then code.

1. `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts` (`sanitizeRunAction` block at 1481): keeps a text `input`; keeps whitespace as typed; drops `''`, non-string (number, null, array); id trimming unchanged; blank id still undefined.
2. `src/tests/lib/features/auto-organize/auto-organize.service.test.ts` (`run mod action`, 1880+; fake registered through the real `ruleActionsStore`): a rule with `input` calls `run({ on:'note', path }, 'text')`; a rule without input still matches the existing one-arg assertions (1920, 1930); the input reaches the action after rename/move (final path) in the all-consequences test at ~2138; first-matching-rule semantics unchanged.
3. `src/tests/lib/core/rule-actions/rule-actions.store.test.ts`: a registered action keeps `input` and `run` forwards the second argument.
4. `src/tests/lib/plugins/mods/mods-host.service.test.ts` (`rule actions`, 413-477, real host and real `modsRunsStore`): update the test at 436 ("no input"): action with `input: {}` receives the rule's text; action without `input` receives `''` even when the rule passes text (proves the contract invariant); `ruleActionsStore.list` exposes `input` (placeholder) for a declaring action and none otherwise; `run.target` has no `input` key (guards the `run.target` surface); trace JSON does not contain the text (assert on `debug` mock calls like the existing `"origin":"rule"` check at 444).
5. `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` (`Run mod action`, 1010+): field absent when the action has no `input`; present with the placeholder when it has; `change` commits `onupdate('r1', { runAction: { id, input: 'x' } })`, typing alone (`input` event) calls nothing; clearing removes the key; re-picking another action resets input; field hidden and stored value untouched for a not-loaded action.
6. `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: no change expected, since the contract is untouched; run it as the guard that nothing leaked into `ctx`.
7. Layer/pure checks run inside `pnpm vitest run` (architecture suite).
8. E2E: none required (Settings component covered by jsdom row tests); `scripts/e2e.sh` only if the owner wants a Settings flow.

Commit as one `feat:` (behavior change, tests included) per CLAUDE.md rule 11; full detailed message format per docs/COMMITS.md. If the Issue is split, order: types+logic+tests, service+store+host+tests, row+tests, docs.

## 9. Not verified

- Whether a stricter `toHaveBeenCalledWith` argument-count behavior in this vitest version fails on a trailing `undefined` (stated as likely; confirm when running tests).
- The `AutoOrganizeSection.svelte` autosave wiring after `onupdate` (only `updateRule` at line 62-63 was read); assumed to persist the whole rule like other fields.
- Cookbook 21 content past the headings was not read in full.
- No UI was run.
