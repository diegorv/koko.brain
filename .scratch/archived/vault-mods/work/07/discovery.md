# Issue 07 discovery: mod docs update, hello example, mods ADR

Per the 2026-11-06 comment, the user doc, its README row and the Labs section of `19-settings.md` already exist. Landed since the doc: Issue 06 (`run` argument, run view, Stop, reload waits). Not landed: 08, 10, 11, 12, 13 (ledger), so no `ctx.agents`, `claude` setting, HTTP or agent runner in the doc or the ADR.

## Files that change

- `help/documentation/28-mods.md`
  - `:143`, `:155`: `run: async (text, run)`; without input `run('', run)`.
  - New `### The run: run.signal, run.log, run.progress` after "Actions and rail buttons" (`:160`), from `contract/mod-api.v1.ts:47-63` and `mods-host.service.ts:118-167`: every pick switches the picker to a run view (title, status Running/Done/Failed/Cancelled, progress bar + label, last 500 log lines, Stop, Close); it stays open until Close or Escape, even for an instant action (Issue 06 review finding 2). Close hides it, the run goes on, the rail button shows a busy mark and reopens it. One live run per button. Stop aborts `run.signal` and marks the run Cancelled at once; a later rejection is not a failure. `run.progress` throws on non-numbers.
  - Lifecycle row `:108` and "Reload on save" `:111`: a reload waits for the mod's live runs (P10), "Reload pending" in the run view; turning mods off, the mod switched off or deleted, and vault close abort runs.
  - `ctx.workspace.openNote` row `:179`: expects a file (Issue 05 review-2 nit 1).
  - Limits `:314`: `export default function foo() {}` / class rejected (already in the NOTE at `:99`; keep), sync loop cannot be stopped by Stop, check `run.signal.aborted` between steps.
  - A short "Example" pointer to `help/examples/mods/hello/`.
- `docs/FEATURES.md:56`: bullet under Power user, "Vault mods (Labs)".
- New `help/examples/mods/hello/manifest.json`, `main.js`: `say-hello` (notify) and `new-note` (input; `run.progress`, `ctx.vault.create('Hello mod/<title>.md')`, `run.signal.aborted` check, `openNote`), one rail button listing both.
- New `src/tests/help/mods-example.test.ts`.
- New `docs/adr/0036-vault-mods-trust-loader-storage.md` + row in `docs/adr/README.md:142`.

## Plan

1. Write `mods-example.test.ts`, run it red (no example folder), add the example, run it green; one commit for both.
2. Doc update + FEATURES bullet; one commit.
3. ADR + index row; one commit.

## Prior art

- `src/tests/lib/plugins/mods/mods.logic.test.ts` (`parseModManifest`, `evaluateModSource`), `src/tests/help/examples-scoping.test.ts` (reads `help/examples` from `process.cwd()`).

## Defaults and risks

- The test drives `onload` and the `new-note` action against a fake `ModContextV1` (an in-memory recorder, not a store or logic mock) so the example also cannot rot in its `create` / `openNote` / `progress` use.
- ADR number 0036: next free in `docs/adr/`. `.scratch/ios-app/architecture-proposal-2026-11-02.md` also plans 0036; whoever lands second renumbers.
- New `help/examples/mods/` root is walked by `queryjs-contract`, `templates-script-paths` and `examples-scoping` tests; it has no `.md` and no `kb.pages`, so they should stay green (run them).
- Title sanitizing in the example: `/`, `\` and `:` become `-`; an empty title throws "Type a title".
