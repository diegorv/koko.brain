# 04: Upgrade to SvelteKit 3 and adapter-static 4

**What to build:** the app runs on kit 3 and adapter-static 4 with the deprecated `$lib` alias keeping existing imports working, the tsconfig extending kit 3's generated config, and CI pinned to a Node version kit 3 supports. This closes the kit advisories reported by pnpm audit.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] kit 3.x and adapter-static 4.x installed together
- [ ] `$lib` escape-hatch alias configured
- [ ] tsconfig extends the kit 3 generated config; tests still type-checked
- [ ] CI Node floor meets kit 3 engines
- [ ] pnpm check + pnpm vitest run + pnpm build green; pnpm audit no longer lists the kit advisories
- [ ] Main window and composer window smoke-tested in pnpm tauri dev

**Pre-flight (01):** extend `$app/tsconfig` and add an explicit `include` (and `exclude`) to `tsconfig.json`; the kit 3 generated parent declares none, so without it `src/tests` is no longer type-checked.
