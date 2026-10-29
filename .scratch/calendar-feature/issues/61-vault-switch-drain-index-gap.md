# 61: No calendar write lands on disk without its index update across a vault switch

**What to build:** no calendar write lands on disk without its index update across a vault switch. A write to a note that is not open in a tab, still in flight when the user switches vault, either updates the old vault's index after it reaches disk or is refused before writing. Today it reaches disk and the old vault's index never sees it.

**Blocked by:** None

**Status:** ready-for-agent

- Recorded by ticket 25's close commit f984319f: "on a vault switch a calendar write to a closed note lands on disk with no index update in the old vault, because vaultStore.path is already the new vault and the writer's vault-changed check skips notifyAfterSave. Closing it needs a drain before vaultStore.open or a writer change."
- Chain: `vaultStore.open(path)` (`src/lib/core/vault/vault.service.ts:11,33`) sets the new path; the `(app)/+layout.svelte` effect then calls `initializeVault`, which drains at `src/lib/core/app-lifecycle/app-lifecycle.service.ts:178`. By then `assertVault` after `writeTextFile` (`src/lib/features/properties/frontmatter-write.service.ts:120`) throws `vault-changed`, so `notifyAfterSave` (`:123`) never runs.
- Fix options: drain before `vaultStore.open` (both callers in `vault.service.ts` plus `deep-link.service.ts:137`), or let the writer finish the index update for the vault it captured at entry when the bytes are already written.

- [ ] Failing test first: a write in flight across a vault switch either updates the old vault's index or is refused before writing
- [ ] Chosen fix applied; existing ticket 25 order tests stay green

## Comments

- 2026-10-28 21:12 — discovery — drain calendar writes before vaultStore.open via a vault.service switchVault; plan in work/61/discovery.md — 2294a13d
