# 07: Mod authoring docs, an example mod and the mods ADR

**What to build:** the owner can write a mod from the docs alone, and the decisions behind the loader are recorded.

- **User docs:** `help/documentation/28-mods.md`, in the style of `13-queryjs.md`. Sections:
  - Turning mods on (Settings > Labs, per vault, per machine) and the trust warning: a mod runs with the app's full access, like QueryJS (`13-queryjs.md` says "runs without a sandbox").
  - The folder layout, the manifest fields and errors.
  - The one-file rule: exactly one `export default`, no `import`; it looks like an ES module but is evaluated as a function (PRD P3).
  - The `ctx` and `run` reference, generated from or checked against `contract/mod-api.v1.ts`.
  - Reload on save (a reload waits for the mod's live runs, PRD P10), and the limits: `export default function foo() {}` cannot refer to `foo` by name (Issue 02 rewrite); a synchronous loop freezes the app and cannot be stopped; check `run.signal.aborted` between steps.
- Add a row to `help/documentation/README.md` and a bullet to `docs/FEATURES.md`. In `help/documentation/19-settings.md`, add the Labs section and say the mods flag is stored on this machine, not in `settings.json` (its "How Settings Work" text describes only `settings.json`).
- **Example mod:** `help/examples/mods/hello/{manifest.json, main.js}` using notify, an action with input, `ctx.vault.create`, `openNote` and `run.progress`. Follow `help/examples/SCOPING.md` and keep `examples-scoping.test.ts` green.
- **Test:** `src/tests/help/mods-example.test.ts` loads the example through `mods.logic.ts` (manifest valid, loader accepts it, `onload` registers the expected action ids against a fake `ctx`), so the example cannot rot.
- **An ADR "Vault mods: trust, loader and storage"** in `docs/adr/`, numbered with the next free number when this Issue runs (`.scratch/ios-app/architecture-proposal-2026-11-02.md` also plans an ADR-0036), with a row in `docs/adr/README.md`: full trust in the main webview (and the Worker alternative, D1 R3), the per-machine flag (PRD P1), `_system/mods/` (P2), `new Function` with the `export default` rewrite (P3) and its dependency on `'unsafe-eval'` in `src-tauri/tauri.conf.json:29`, which QueryJS also relies on. Removing `'unsafe-eval'` breaks both while E2E stays green (E2E runs without the CSP).

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** docs plus one test: `pnpm vitest run` for the help tests, and `pnpm check`.

- [ ] Failing test first: `mods-example.test.ts`.
- [ ] Docs and ADR as listed.

## Notes

- **Timing (PRD Order):** after the MVP, this runs after 11, so the doc is written once against the API that exists by then. It documents whatever has landed: if 13 and 11 are merged, include `ctx.agents`, the `claude` path setting and a walkthrough of the idea-to-PRD mod, and record the agent runner (Issue 10) in the ADR. Issues merged after 07 (such as 08) extend the doc and amend the ADR themselves. If the agent Issues are dropped, it runs right after 06.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Run view on instant actions (from Issue 06 review, finding 2):** every pick, including an instant action such as a toast-only action or one that calls `openNote`, ends in the run view, which stays open (modal) until Close or Escape. Issue 06 kept this as a default, not an owner decision. The doc says so; if the owner prefers auto-close on `done` when the run logged nothing and set no progress, that is a follow-up Issue.
- **Size:** S.

## Comments

- **2026-11-06, owner request after the MVP:** the user doc already exists. `help/documentation/28-mods.md` covers turning mods on, the per-mod switch, the manifest, the one-file rule, lifecycle, reload on save, the v1 `ctx` reference, raw `ctx.app` / `ctx.kb()`, recipes, errors and logs, and limits (including the CSP `connect-src` limit on `fetch`); `README.md` has its row and `19-settings.md` its Labs section. This Issue now **updates** that doc for what landed since (06's runs and `run.signal` / `run.progress`, any `ctx.agents`) instead of writing it, and still owns the `docs/FEATURES.md` bullet, the example mod in `help/examples/mods/`, `mods-example.test.ts` and the ADR. The owner's own example mods live in `brain-os-vault/_system/mods/` (playground, portent, daily-log, vault-health, tasks, one-on-one, hotkeys, focus-timer) and are good material for the examples.
