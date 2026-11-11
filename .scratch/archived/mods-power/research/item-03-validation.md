# Item 3 validation: Auto Organize rule action input

Adversarial check of `item-03-host.md` and `item-03-contract.md`. Paths without a prefix are under `/Users/diegorv/Dev/pet-projects/koko/brain`; `MODS/` is `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Nothing was run. Every claim below was re-read in code.

## Verdict

- **Cost: small.** Host only, frontend only (gate: `pnpm check` + `pnpm vitest run`). No Rust, no IPC DTO, no `package.json`, no mod-core SHA adoption.
- **Contract change: no.** `run: (input: string, run: ModRunV1) => unknown` already exists (`MODS/packages/mod-core/src/contract/mod-api.v1.ts:103`). The only thing that fixes the text to `''` is host code (`src/lib/plugins/mods/mods-host.service.ts:514`).
- The two scouts disagree on one load-bearing point (below). The host scout is right; the contract scout's reading would make the contract comment false and confuse the Settings row.

## Claims checked

Confirmed:

1. Rule path hardcodes `''`: `mods-host.service.ts:514`, `run: (target) => runAction(entry, '', 'rule', true, { ...target })`. The wrapper takes `input` (`:336`) and passes it to `action.run(input, run)` (`:414`).
2. `sanitizeRunAction` drops every key but `id` (`src/lib/features/auto-organize/auto-organize.logic.ts:607-611`). Without a change there, a stored `input` never reaches a run.
3. `RuleRunAction` is `{ id }` only (`auto-organize.types.ts:103-106`); `RuleAction.run(target)` has one parameter (`src/lib/core/rule-actions/rule-actions.store.svelte.ts:23`).
4. `runRuleAction` destructures only `id` (`auto-organize.service.ts:389`) and calls `action.run({ on: 'note', path })` (`:399`).
5. Load keeps a stored `runAction` verbatim through `...rest` (`auto-organize.service.ts:142-144`); save is `JSON.stringify` of the store (`:186-190`); `updateRule` is a shallow merge (`auto-organize.store.svelte.ts:34`). So `input` survives load and save with no change there.
6. `setRunAction` writes `{ id: value }` (`AutoOrganizeRuleRow.svelte:255-258`), so it would drop input on an action change. The same-value guard (`:256`) returns early.
7. Input is not logged: the trace identity is `modId, actionId, runId, origin` (`mods-host.service.ts:346`); `runRuleAction` logs id and path only (`auto-organize.service.ts:398`).
8. The exact-arg assertions exist: `src/tests/lib/features/auto-organize/auto-organize.service.test.ts:1920,1930` use `toHaveBeenCalledWith({ on: 'note', path })`. Vitest compares the argument arrays by length, so a call with a trailing second argument fails them (from memory of Jest/Vitest `equals`; not run).
9. The existing host test pins `''` for an action with `input: {}` from a rule (`src/tests/lib/plugins/mods/mods-host.service.test.ts:436-451`). That test must change; it is the behavior being changed, not a weakened check.
10. The doc-example test parses JSON only from the "Overview" and "Examples" sections (`src/tests/help/auto-organize-doc-examples.test.ts:60`). The `runAction` JSON blocks are in "Running a mod action" (`help/documentation/22-auto-organize.md:449-460`) and "Configuration File" (`:737`), so editing them touches no fixture.
11. No mod in the workspace lists `ruleActions` except the example (`MODS/examples/auto-organize-rule-action.ts:22`, `MODS/test/examples-rule-action.test.ts`, `MODS/docs/examples.md`), and its action ignores input. No real mod depends on the current `''`.

Refuted or corrected:

- **Contract scout, "an Auto Organize rule may also pass a text, to an action with or without `input`" (its "Optional contract edit").** Refuted as a design. The contract says `run` gets "the typed text (`''` without `input`)" (`mod-api.v1.ts:99-100`), and the picker keeps it: no-input actions always get `''` (`src/lib/plugins/mods/ModActionPicker.svelte:73-78`, `mods-host.service.ts:447-448`). Passing text to a no-input action would break a stated invariant and need the comment edit the scout proposes. Gating on `entry.input` keeps the contract comment true word for word, so there is no mods-repo edit at all, not even comment-only.
- **Host scout, "Choose: call `action.run(target)` when the rule has no input".** Unneeded branching. Simpler: `RuleAction.run(target, input: string)` always gets a string (`''` when the rule has none) and the two assertions at `auto-organize.service.test.ts:1920,1930` gain `, ''`. That is an update to a changed signature, not a weakened test.
- **Host scout row 3, `input?: { placeholder?: string }` on `RuleAction`.** Kept, but it is the only new API surface: the row needs to know whether to show the field and what placeholder to use. A boolean would lose the placeholder for no saving.
- **Contract scout, `lazy` concern ("an action with `input` set would no longer open a field for a rule").** Not a change: the rule path already passes `lazy = true` and never opens a field (`mods-host.service.ts:514`); only the picker path uses `lazy && !a.input` (`:445`). Nothing to handle.
- **Host scout, docs line list.** Mostly right; also `help/documentation/22-auto-organize.md:737` (Configuration File example) if the example gains input, which is optional. `help/documentation/mods/02-actions-and-entry-points.md:18` and the "The call" bullet in 328-342, `help/documentation/mods/13-api-reference.md:79`, `help/documentation/28-mods.md:210` all state `''` and must change.

## (a) Cost: small

Source (5 files):

| File | Change |
|------|--------|
| `src/lib/features/auto-organize/auto-organize.types.ts:103-106` | `RuleRunAction.input?: string`, JSDoc |
| `src/lib/features/auto-organize/auto-organize.logic.ts:607-611` | `sanitizeRunAction` keeps a non-empty string `input`, as typed (no trim, the picker does not trim, `ModActionPicker.svelte:87`) |
| `src/lib/core/rule-actions/rule-actions.store.svelte.ts:17-24` | `RuleAction.run(target, input: string)`; `input?: { placeholder?: string }` |
| `src/lib/plugins/mods/mods-host.service.ts:509-515` | register `input: entry.input`; `run: (target, input) => runAction(entry, entry.input ? input : '', 'rule', true, { ...target })`; fix the comment at 509 |
| `src/lib/features/auto-organize/auto-organize.service.ts:375-399` | pass `input ?? ''` to `action.run`; fix the doc comment |
| `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte` (114-128, 255-258, 490-508) | text field shown when the selected registered action has `input`; draft on `input`, commit on `change` (copy `commitRename`, 232-246); `setRunAction` writes `{ id }` so a new action starts with no input |

That is 6 source files counting the component. Tests (5 files): `auto-organize.logic.test.ts` (`sanitizeRunAction` block at 1481), `auto-organize.service.test.ts` (1880+, and the two assertions at 1920/1930), `rule-actions.store.test.ts`, `mods-host.service.test.ts` (rule actions block 413-477, the test at 436 changes), `AutoOrganizeRuleRow.test.ts` (`Run mod action`, 1010+). Docs (4 files): `help/documentation/22-auto-organize.md`, `help/documentation/mods/02-actions-and-entry-points.md`, `help/documentation/mods/13-api-reference.md`, `help/documentation/28-mods.md`.

Commit: one `feat:` with tests.

## (b) Contract change: no

Evidence: `mod-api.v1.ts:103` already types the input; `:96-100` comments stay true under the gated design; `ModRunV1` (`:51-82`) is untouched since the target is unchanged; the manifest's `ruleActions` is host-parsed (`src/lib/plugins/mods/mods.logic.ts:157,216-220`), not in the contract. `src/tests/lib/plugins/mods/mod-api-contract.test.ts` and `help/examples/mods/kokobrain-mod.d.ts` need no change.

## (c) Minimal design

1. Stored shape: `runAction: { id, input? }`, input literal text. `''` or a non-string means none (key omitted).
2. Host passes the rule's text only to an action that declares `input`; any other action keeps getting `''`.
3. Settings: one single-line `Input` under the action Select, shown only when the selected action is registered and declares `input`, placeholder from the action, aria-label `Mod action input`. Commit on `change`, never per keystroke (a rule is live as soon as the store changes: `AutoOrganizeSection.svelte:62-64` writes the store at once and debounces only the disk write).
4. Changing the action resets the input. Picking None removes both.
5. Not loaded (`actionMissing`): no field, stored input left alone, so a mod being off never erases config.

Cut: templates or variables in the input (the mod already has `run.target.path`; and `resolveDestination` must not be reused for free text, it rewrites slashes, `auto-organize.logic.ts:931-957`, per the host scout, not re-read here), an expression mode, multi-line input, a dedupe of repeated runs, a queue for busy drops, any mods-repo example change, any contract comment edit.

## (d) Risks the design must handle

- **Data loss (config).** (1) Keep stored input when the mod is not loaded: covered by not rendering the field and not touching `runAction` in that state. (2) `setRunAction` to a different id drops the old input on purpose; re-picking the same id is a no-op (`:256`). Test both.
- **Half-typed text live.** Commit on `change` only. Typing alone must call no `onupdate` (row test).
- **Loop.** Unchanged in kind: an action's write is an ordinary save that re-runs rules (`help/documentation/22-auto-organize.md:471-476`). A static input cannot make it worse, but an input-driven append action ("append this line") makes the hazard easier to hit; the existing warning covers it. Item 2 (`ignoreOwnWrites`) applies to `onNoteSaved` only and does not break rule loops; do not cite it as a fix.
- **Race / busy.** A rule call while the action runs is dropped (`mods-host.service.ts:338-341`). The input is static per rule, so the next matching save re-sends it. No queue.
- **Contract invariant.** A no-input action must still receive `''` even when the stored rule carries text (hand-edited JSON, or the mod dropped `input` later). Host test.
- **Security.** No new trust boundary under ADR 0036: the text comes from the owner's `.kokobrain/auto-organize-rules.json` and goes to a mod that already runs with full trust. It is plain JSON in the vault: one doc line, "do not put secrets in it". Keep it out of logs (it is today; add a host test asserting the trace does not contain it).

## (e) Ordering against the other items

Independent of items 1, 2, 4, 5, 6 and 7: no shared contract members, no mod-core adoption, and none of them consumes rule input. It shares `mods-host.service.ts` with 1, 2, 5 and 6, but only the `addAction` rule registration (`:509-516`), which none of them should touch. Recommended slot: first, as the cheapest host-only win, or in parallel with any contract-side item; land it before item 6 only if item 6 edits `runAction`'s failure path (`:417-424`), to keep diffs apart.

## Not verified

- Vitest argument-count behavior for a trailing argument in `toHaveBeenCalledWith` (from memory; the design sidesteps it by updating the two assertions).
- `resolveDestination` details (taken from the host scout; only relevant to the cut template feature).
- No UI was run.
