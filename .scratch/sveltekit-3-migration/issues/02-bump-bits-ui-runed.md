# 02: Bump bits-ui so runed accepts kit 3

**What to build:** bits-ui and its transitive runed resolve to versions whose kit peer accepts kit 3 (runed 0.38.0 or newer), so the kit bump produces no peer conflict. Only start once those versions clear the repo's release-age quarantine (expected around 2026-10-30).

**Blocked by:** None (time-gated by quarantine)

**Status:** ready-for-agent

- [ ] runed resolves to a version with a kit ^3 (optional) peer
- [ ] No lockfile downgrade of unrelated packages
- [ ] pnpm check + pnpm vitest run + pnpm build green
