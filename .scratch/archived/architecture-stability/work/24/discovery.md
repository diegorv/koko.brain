# Issue 24 discovery

No `spec.md` for architecture-stability. Blockers 09 (ts-rs types, `9ca9bc33`) and 18 (v1 contract,
`a55d38fe`) are merged; 38 (`_type` / relationship parity, `06cd5f35`) too.

## Files that change

- `src/lib/plugins/queryjs/contract/kb-api.v1.ts:73-81` `KBPageV1`: add `KBPageRootKeyV1`, the explicit
  list of keys the app puts on a page root (`file`, `tags`, `organized`, `archived`, `favorite`, `_type`,
  `_belongs_to`, `_related_to`, `_has_many`), plus the firewall rule in the header and the TS/Rust
  property-path note. Type only, so the "imports nothing" rule holds.
- `src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts` (new):
  - grep-style: every `contract/*.ts` and `queryjs.types.ts` import specifier stays inside `contract/`;
    no `vault-v2` / `#lib/contracts` / `generated` / `collection.types` specifier.
  - `kb-api.ts` via the TypeScript compiler API: public members (not `private`, not the constructor)
    carry an explicit type and their signature names no identifier imported from a DTO module.
  - mapping snapshot: a fully populated `NoteEntryV2` + Rust-shaped record -> `buildKBPage`, key set of
    root and `file` frozen; an extra unknown DTO field (dry run of a new Rust field) leaves both unchanged.
  - page-root snapshot: union of the `injected` keys of `note-record-projection.json` plus `file` must
    equal `KBPageRootKeyV1` (checked with `satisfies Record<KBPageRootKeyV1, true>`); a new Rust injection
    fails the Rust golden test until the fixture lists it, then fails this one until the contract does.
  - property paths: the new fixture case through `buildNoteRecord` (TS) and the fixture record (Rust
    values, pinned by the Rust golden test) -> `buildKBPage`, same `page.<key>` values.
- `src-tauri/tests/fixtures/note-record-projection.json`: new case with `type: person`, `|` and `>` block
  scalars, a plain multi-line scalar, a flow array `["a, b", c]` and a block list `- "x, y"`. Probed:
  Rust and TS already agree on every value, so no difference to record.
- `CLAUDE.md` Indexing item 12: the firewall rule.

## Prior art

`kb-api-contract.test.ts` (`satisfies Record<keyof X, true>` + runtime key lists);
`collection.service.test.ts:343` golden fixture reader; `vault_file_ops_test.rs:392` Rust side.

## Defaults taken

- "Only place that reads the DTOs" = the mapping module `queryjs.logic.ts` (`buildKBPage` plus its
  `buildReverseIndex` helper, which reads `outgoingLinks`); `KBAPI.ensureCache` only forwards them.
- The `tags` rename dry run is done by hand (edit generated `NoteEntry.ts`, `pnpm check`, revert) and
  recorded in the report; it needs no test, the existing typed reads in `buildKBPage` do it.
- No Rust source change; the fixture change re-runs the Rust golden test (cargo gate).

## Risks

- The compiler-API test parses one file only (no type checker), so it checks written signatures; it
  requires explicit return types on public members to close the inference hole.
