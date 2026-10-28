# 61: Calendar writes drained on vault switch still update the old vault's index

**What to build:** a calendar write to a note that is not open in a tab, still in flight when the user switches vault, updates the old vault's index after it reaches disk.

**Blocked by:** None

**Status:** ready-for-agent

- Recorded by ticket 25's close commit f984319f: "on a vault switch a calendar write to a closed note lands on disk with no index update in the old vault, because vaultStore.path is already the new vault and the writer's vault-changed check skips notifyAfterSave. Closing it needs a drain before vaultStore.open or a writer change."
- Chain: `vaultStore.open(path)` (`src/lib/core/vault/vault.service.ts:11,33`) sets the new path; the `(app)/+layout.svelte` effect then calls `initializeVault`, which drains at `src/lib/core/app-lifecycle/app-lifecycle.service.ts:178`. By then `assertVault` after `writeTextFile` (`src/lib/features/properties/frontmatter-write.service.ts:120`) throws `vault-changed`, so `notifyAfterSave` (`:123`) never runs.
- Fix options: drain before `vaultStore.open` (both callers in `vault.service.ts` plus `deep-link.service.ts:137`), or let the writer finish the index update for the vault it captured at entry when the bytes are already written.

- [ ] Failing test first: a write in flight across a vault switch either updates the old vault's index or is refused before writing
- [ ] Chosen fix applied; existing ticket 25 order tests stay green
