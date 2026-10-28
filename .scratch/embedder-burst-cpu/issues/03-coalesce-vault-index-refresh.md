# 03: vault-index-updated refresh coalesced during bursts

**What to build:** Every `vault-index-updated` event goes through a 300 ms trailing debounce (`src/lib/core/layout/tauri-listeners.service.ts:140`). With burst files arriving ~5-10 s apart, each file triggers a full `refresh` (`:121-139`): `bumpVaultIndexVersion`, `buildPropertyIndex` (`get_all_property_records` over ~10k notes, ~123 ms in the 2026-10-27 log, 198 runs in one session), `getVaultEntries`, and every panel `$effect` keyed on `vaultIndexVersion`. Add a `maxWait` option to `src/lib/utils/debounce.ts` and switch this listener to a ~2 s trailing debounce with ~10 s `maxWait`, so a burst collapses into periodic refreshes while a single edit still refreshes within ~2 s.

**Constraint:** `applyNoteChange` and its per-source policy are untouched. Panels may lag up to `maxWait` after external changes; CLAUDE.md Indexing 12 already allows a stale snapshot until the next bump. The latest `latestVersion` must always win (no lost final refresh).

**Blocked by:** None (independent of 01/02, frontend only)

**Status:** ready-for-agent

**Touches:**
- `src/lib/utils/debounce.ts` (modify; add `maxWait`)
- `src/lib/core/layout/tauri-listeners.service.ts` (modify; line 140)
- matching tests under `src/tests/` for both files (create/update)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] `debounce` supports `maxWait`; existing callers unchanged; tests cover trailing, maxWait flush, cancel, and no-maxWait behavior
- [ ] Listener test with `vi.useFakeTimers()`: N events 5 s apart produce fewer than N `get_all_property_records` invocations, and the final bumped version equals the last event's version
- [ ] Single isolated event still refreshes within the trailing window
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
