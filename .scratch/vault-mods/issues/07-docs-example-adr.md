# 07: Mod authoring docs, an example mod and ADR-0036

**What to build:** the owner can write a mod from the docs alone, and the decisions behind the loader are recorded.

- **User docs:** `help/documentation/28-mods.md`, in the style of `13-queryjs.md`. Sections:
  - Turning mods on (Settings > Labs, per vault, per machine) and the trust warning: a mod runs with the app's full access, like QueryJS (`13-queryjs.md` says "runs without a sandbox").
  - The folder layout, the manifest fields and errors.
  - The one-file rule: exactly one `export default`, no `import`; it looks like an ES module but is evaluated as a function (PRD P3).
  - The `ctx` and `run` reference, generated from or checked against `contract/mod-api.v1.ts`.
  - Reload on save, what an action running during a reload does, and the limits: a synchronous loop freezes the app and cannot be stopped; check `run.signal.aborted` between steps.
- Add a row to `help/documentation/README.md` and a bullet to `docs/FEATURES.md`. In `help/documentation/19-settings.md`, add the Labs section and say the mods flag is stored on this machine, not in `settings.json` (its "How Settings Work" text describes only `settings.json`).
- **Example mod:** `help/examples/mods/hello/{manifest.json, main.js}` using notify, an action with input, `ctx.vault.create`, `openNote` and `run.progress`. Follow `help/examples/SCOPING.md` and keep `examples-scoping.test.ts` green.
- **Test:** `src/tests/help/mods-example.test.ts` loads the example through `mods.logic.ts` (manifest valid, loader accepts it, `onload` registers the expected action ids against a fake `ctx`), so the example cannot rot.
- **ADR-0036 "Vault mods: trust, loader and storage"** in `docs/adr/`, with a row in `docs/adr/README.md`: full trust in the main webview (and the Worker alternative, D1 R3), the per-machine flag (PRD P1), `_system/mods/` (P2), `new Function` with the `export default` rewrite (P3) and its dependency on `'unsafe-eval'` in `src-tauri/tauri.conf.json:29`, which QueryJS also relies on. Removing `'unsafe-eval'` breaks both while E2E stays green (E2E runs without the CSP).

**Blocked by:** 04, 05, 06

**Status:** ready-for-agent

**Gate:** docs plus one test: `pnpm vitest run` for the help tests, and `pnpm check`.

- [ ] Failing test first: `mods-example.test.ts`.
- [ ] Docs and ADR as listed.

## Notes

- Issues 08, 10 and 11 extend the doc and amend ADR-0036 for what they add.
- **Size:** S.

## Comments
