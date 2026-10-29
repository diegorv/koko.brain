# 02: Bump bits-ui so runed accepts kit 3

**What to build:** bits-ui and its transitive runed resolve to versions whose kit peer accepts kit 3 (runed 0.38.0 or newer), so the kit bump produces no peer conflict. Only start once those versions clear the repo's release-age quarantine (expected around 2026-10-30).

**Blocked by:** None (time-gated by quarantine)

**Status:** deferred (2026-10-27). No published bits-ui (newest 2.20.2) or svelte-toolbelt accepts runed >=0.36, so runed stays at 0.35.1 with its `@sveltejs/kit ^2.21.0` peer. The owner accepted that peer mismatch for ticket 04 after two checks: pnpm 11.24.0 reports it as a warning (`pnpm install` exits 0; no `strictPeerDependencies` in `pnpm-workspace.yaml`, no project `.npmrc`), and runed 0.35.1 imports `$app/*` only in `dist/utilities/use-search-params`, reachable solely via the `runed/kit` subpath, while bits-ui 2.19.5 and svelte-toolbelt import only `"runed"`. Revisit when a bits-ui release depends on runed >=0.38.0.

- [ ] runed resolves to a version with a kit ^3 (optional) peer
- [ ] No lockfile downgrade of unrelated packages
- [ ] pnpm check + pnpm vitest run + pnpm build green
