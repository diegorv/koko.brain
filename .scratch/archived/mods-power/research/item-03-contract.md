# Item 3 (rule action input): contract side

Scope: what the mods workspace (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`, below `MODS`) must change, and what the host must adopt, so an Auto Organize rule can pass a text to a mod action (`runAction: { id, input }`).

## Verdict

**No contract change is needed.** The only optional contract edit is a doc-comment wording change on two members, and it should not justify a mods-repo commit plus SHA adoption on its own.

## Evidence that the contract already carries the input

- `MODS/packages/mod-core/src/contract/mod-api.v1.ts:103`: `run: (input: string, run: ModRunV1) => unknown;`. Every action already receives a string as first argument.
- `mod-api.v1.ts:96-97`: `input?: ModActionInputV1` only decides whether the picker shows a text field (`ModActionInputV1` is `{ placeholder?: string }`, lines 42-45). It does not gate what `run` may receive.
- The rule path is the only place that fixes the text to `''`, and it is host code: `src/lib/plugins/mods/mods-host.service.ts:514` (`run: (target) => runAction(entry, '', 'rule', true, { ...target })`). The wrapper `runAction(action, input, origin, lazy, target)` at `mods-host.service.ts:336` already takes `input` and calls `action.run(input, run)` at `:414`.
- The rule-side slot is `RuleAction.run(target)` in `src/lib/core/rule-actions/rule-actions.store.svelte.ts` (host only, not in the contract); the rule call site is `runRuleAction` in `src/lib/features/auto-organize/auto-organize.service.ts:375-398`, and `sanitizeRunAction` keeps only `id` (`auto-organize.logic.ts:607-611`), `RuleRunAction` has only `id` (`auto-organize.types.ts:102-105`).
- The manifest is not part of the contract package: `ModInfoV1` (`mod-api.v1.ts:21-30`) has no `ruleActions`; `ruleActions` is parsed by the host (`src/lib/plugins/mods/mods.logic.ts:157,216-220`). Item 3 adds no manifest field, so `MODS/scripts/mod-loader.ts` `checkManifest` (a copy of `parseModManifest`, checked by `MODS/test/host-integration/manifest-check.test.ts`) needs no change. Neither mentions `ruleActions` today.
- `run.target` and the `run` object are unchanged, so `ModRunV1` (`mod-api.v1.ts:51-82`) and `fakeRun` (`MODS/packages/mod-core/src/testing/fake-ctx.ts:377`) stay as they are.

## Helpers, fakeCtx, testing

- `notes/editNote`: unrelated to input. No change.
- `fakeCtx`: `ctx.actions` is a `Map<string, ModActionV1>` (`fake-ctx.ts:75,109,323`). A test already calls `ctx.actions.get(id).run('some text', fakeRun({ on: 'note', path }))`, which is exactly what the host will do for a rule. No fake needs to model rules, because `fakeCtx` never models `ruleActions` or `ruleActionsStore` (grep: no hit in `packages/`). The host-side test in `src/tests/help/mods-examples.test.ts:485-490` does the same (`action.run(input, run)`).
- No new `testing` export is needed.

## Optional contract edit (comment only)

Wording that becomes slightly stale once the host ships rule input:

- `mod-api.v1.ts:96`: "When set, picking the action shows a text field ..." (still true).
- `mod-api.v1.ts:99`: "Runs the action with the typed text (`''` without `input`) ..." becomes incomplete: an Auto Organize rule may also pass a text, to an action with or without `input`.

If changed, the edit is comment-only, adds no member, needs no `apiVersion` bump (header rule at `mod-api.v1.ts:15-17`), and cannot fail the host freeze test `src/tests/lib/plugins/mods/mod-api-contract.test.ts` (it lists keys with `satisfies Record<keyof X, true>`, not comment text). Recommendation: fold this wording into the contract commit of another item (1, 2, 4 or 5 all change the contract) rather than adopting a SHA only for a comment. The host doc `help/documentation/mods/02-actions-and-entry-points.md:46` ("typed text (`''` for an action without `input`)") is the user-facing copy and is host-side.

## Docs and examples in the mods repo

- `MODS/docs/examples.md:71-77` describes the rule-action example. Line 75 names `runAction.id`; line 77 says "Requires the stable `run.target` and vault APIs". Add a sentence only if the example starts using input.
- `MODS/examples/auto-organize-rule-action.ts`: `markCheckedAction` ignores input (`run: async (_input, run)`), `DEMO_RULE` has `runAction: { id: ... }` at line 36. Changing the example to use input is optional and has a trap: an older host's `sanitizeRunAction` drops extra keys silently, so `input` in `DEMO_RULE` would be ignored until the host with item 3 is adopted. If done, update `MODS/test/examples-rule-action.test.ts:21-26` (pins `DEMO_RULE.runAction.id`, the manifest and the `isEmpty(...)` filter) and the paragraph in `docs/examples.md`. Prefer a separate new example or leaving it alone: the example is written to be input-free ("rule-safe", no dialog).
- Host docs that say input is fixed to `''` and must change in the host, not in the mods repo: `help/documentation/mods/02-actions-and-entry-points.md:337` ("input `''` ... An action with `input` gets `''`") and `:339` ("No contract change" stays true, keep it), `help/documentation/22-auto-organize.md` "Running a mod action" (line 447 on), and `README`/help text for the rule row.

## Mods repo checks and tests that pin the contract

Scripts (`MODS/package.json`): `typecheck` (`tsc -p tsconfig.json`), `check` = `pnpm typecheck && node scripts/check-bundle.mjs && pnpm test && pnpm test:host`, `test` (vitest minus host-integration), `test:host` (needs `KOKOBRAIN_HOST_ROOT`), `verify` (builds into temp output, runs full `check`), `check:package <consumer>` (installed-package type/export/runtime check, `scripts/check-core-package.mjs`). The contract is frozen by the host test `src/tests/lib/plugins/mods/mod-api-contract.test.ts` and by `test/registrations.baseline.json` (append-only mod registrations; unaffected here). If item 3 is host-only none of these changes.

## Host adoption (`docs/MOD-CORE.md`, "Updating the dependency")

Needed only if the optional comment edit (or another item's contract change) is made: commit and push in the mods repo, `pnpm check:package` in a temporary consumer, then in Kokobrain `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`, inspect the lockfile (Git repo, commit, path; no credentials), `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run`, `pnpm build` (package.json/lockfile changed), then the mods workspace `pnpm verify` with `KOKOBRAIN_HOST_ROOT`. Item 3 alone: none of this.

## Host-only work implied (for the other scout, listed for completeness)

`RuleRunAction.input?: string` + `sanitizeRunAction` keeps it; `RuleAction.run(target, input?)` in the core slot; `mods-host.service.ts:514` passes it instead of `''` (and `lazy` is currently forced `true`, `:336` signature; an action with `input` set would no longer open a field for a rule); rule row settings field in `AutoOrganizeRuleRow.svelte`; docs above. Not verified here: whether `input` must be trimmed or length-limited, and whether the rule's text should support variables (`{{file.name}}`); those are host decisions.

## Not checked

I did not run any test or script. I did not read the whole `unstable/` surface for other `ModActionV1` consumers (grep for `ModActionInputV1` in `MODS/packages/mod-core/src/unstable` returned nothing).
