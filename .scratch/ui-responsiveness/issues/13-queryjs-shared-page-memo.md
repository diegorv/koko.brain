# 13: queryjs blocks share one page set per index version

**Status:** needs-triage

Priority: P3 (at most about 25 ms per block execution; build only if Issue 05's timers show `ensureCache` is the cost)

**What to build:** Each block builds a fresh `KBAPI` (`src/lib/plugins/queryjs/queryjs-block-widget.ts:188-195`), and its first `current()` / `pages()` / `page()` builds a `KBPage` for every note (`kb-api.ts:68,87,92` -> `ensureCache` `:373-402`), even when the script then filters by one tag (`:70-74`). Share the built page set across blocks, keyed on the entries-snapshot array identity plus `collectionStore.version` (`collection.store.svelte.ts:15`). `pages()` must hand each block its own list copy: today it passes `cache.list` uncopied (`kb-api.ts:77`, `data-array.ts:13-14`) and `mutate` edits in place (`:187-191`).

**Blocked by:** 05, 08

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/plugins/queryjs/kb-api.ts:68-92,373-402, src/lib/plugins/queryjs/data-array.ts:13-14,187-191, src/lib/plugins/queryjs/queryjs.logic.ts:114-161, src/lib/features/collection/collection.store.svelte.ts:15-44, src/lib/core/vault/vault-entries.service.ts

- [ ] Go/no-go recorded in Notes from a session with Issue 05's `QJS-PROFILE` `ensureCache` timer
- [ ] Failing first: two blocks at the same index version build pages once
- [ ] A write (new entries array or a collection version bump) rebuilds the set
- [ ] `p.file.tags.push()` in one block does not change another block's pages (the shared surface grows by `inlinks`, `outlinks`, `tasks` and `KBDateTime` values)
- [ ] KBAPI firewall tests (`kbapi-firewall.test.ts`) stay green

## Notes

- The 282 / 155 ms in the baseline were wall-clock across two IPC awaits; the 10-Oct run is bounded at 33 ms including the chart. The bench's 84 ms floor for `ensureCache` alone was refuted.
- Research: `.scratch/ui-responsiveness/research/E-deep-dive.md` (fix 1), `E-verify.md` (corrections 1-3, fix table).
