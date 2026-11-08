# 03: `onNoteSaved` reports notes that mods create

**What to build:** A mod listening with `ctx.onNoteSaved` hears about notes another mod creates with `ctx.vault.create`, the same as notes saved by the editor or written with `ctx.vault.write`. Today `create` updates the index and the file tree but never notifies save observers (`mod-vault.service.ts`), and the contract does not mention the gap. Alternatively, document the exact set of triggers in the mod-core contract.

**Blocked by:** none

**Status:** needs-triage

No production mod uses `onNoteSaved` today (only the `examples/note-save-reaction.ts` recipe in the mods repository). Follow `docs/agents/indexing-watcher-rules.md`. Source: mods review finding H13.

- [ ] Either `create` notifies save observers, with a host test, or the contract's `onNoteSaved` JSDoc lists exactly which writes trigger it.
- [ ] The mods repository's test fake fires `onNoteSaved` for the same set (follow-up there).
