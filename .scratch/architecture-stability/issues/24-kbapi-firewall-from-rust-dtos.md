# 24: Firewall NoteEntryV2/NoteRecordV2 from the KBPage shape

**What to build:** Once issue 09 has replaced the hand-written mirrors with the ts-rs generated types, make `buildKBPage` the only place that reads `NoteEntryV2` and the collection `NoteRecord` for KBAPI, returning `KBPageV1`. The KBAPI constructor (which takes `entries: NoteEntryV2[]`) is internal and exempt from the firewall test.
- **Firewall test.** A test checks that neither the contract file nor the public signatures in `kb-api.ts` reference a DTO type.
- **Mapping snapshot.** A fixture test maps a fully populated generated DTO to a KBPage and snapshots the KBPage key set.
- **Effect.** A new or renamed DTO field then either fails to compile in the mapping or leaves KBPage unchanged. Exposing a field needs an explicit contract edit: a minor change if it is additive, a major one plus a `kb.version` bump for a removal or rename.
- **Rust-injected keys.** `project_note_record` (`vault.rs:744-761`) injects `_type`, `_belongs_to`, `_related_to` and `_has_many` into `properties`, and `buildKBPage` spreads `properties` onto the page root. List the keys allowed on the page root explicitly in the contract, and have the snapshot fail when Rust injects a new one.
- **TS vs Rust properties.** Make the TS fast path (`collection.service.ts:84`, `updateNoteInIndex` -> `buildNoteRecord` -> `parseFrontmatterProperties`) agree with the Rust path for the same frontmatter, or document the difference as contract behaviour. Coordinate with sidebar-redesign 26.

**Blocked by:** 09, 18


**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/plugins/queryjs/queryjs.logic.ts:107-166; src/lib/types/vault-v2.types.ts:94-125,348-369; src/lib/features/collection/collection.service.ts:58-95; src-tauri/src/commands/vault.rs:725-792

- [ ] A grep-style test checks that `contract/*.ts` and the exported KBAPI types import no `vault-v2` or generated-binding module
- [ ] Adding a field to the Rust `NoteEntry` (dry run) leaves the KBPage snapshot green, and renaming `tags` fails to compile in `buildKBPage`
- [ ] A test feeds the same frontmatter (including a multi-line value and an array with a quoted comma) through both property paths, and asserts identical `page.<key>` values or records the known differences in the contract doc. The `page._type` divergence is fixed by issue 38; this test pins it
- [ ] A new key injected by `project_note_record` (dry run) fails the page-root snapshot
- [ ] CLAUDE.md Indexing item 12 notes the firewall rule

## Notes

- **Why the two paths diverge:** an edited note goes through the TS parser, while a full build goes through the Rust subset parser, so `page.prop` can change after a rebuild. Sidebar-redesign 26 fixes the parser, and this issue pins the contract.
- **Size:** S-M.
