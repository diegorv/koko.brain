# 06: Watcher debounce has no max-wait and its runs can overlap

**What to build:** watcher index rebuilds run one at a time and flush periodically during a continuous write stream.

**Blocked by:** None

**Status:** needs-triage

- `src/lib/core/app-lifecycle/app-lifecycle.service.ts:446-456`: trailing 300 ms `debounce` with no max-wait; it does not wait for the previous `rebuildAllIndexes` to finish, so two runs can overlap.
- Every event also re-fetches `get_all_property_records` + `get_all_vault_entries_v2` for ~10k notes (L1503, L1529 show 560 ms / 1,444 ms under memory pressure).
- Note: `link-updater.service.ts:19` comment says 500 ms, code is 300 ms.

- [ ] Decide whether overlap is harmful in practice (trace a burst)
- [ ] Serialize runs (in-flight guard + re-run flag) with a test
