# 13: queryjs blocks share one page set per index version

**Status:** resolved

Priority: P2 (measured 2026-11-03: the largest remaining UI-thread cost; every block rebuilds all pages)

**What to build:** Each block builds a fresh `KBAPI` (`src/lib/plugins/queryjs/queryjs-block-widget.ts:188-195`), and its first `current()` / `pages()` / `page()` builds a `KBPage` for every note (`kb-api.ts:68,87,92` -> `ensureCache` `:373-402`), even when the script then filters by one tag (`:70-74`). Share the built page set across blocks, keyed on the entries-snapshot array identity plus `collectionStore.version` (`collection.store.svelte.ts:15`). `pages()` must hand each block its own list copy: today it passes `cache.list` uncopied (`kb-api.ts:77`, `data-array.ts:13-14`) and `mutate` edits in place (`:187-191`).

**Blocked by:** 05, 08

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/plugins/queryjs/kb-api.ts:68-92,373-402, src/lib/plugins/queryjs/data-array.ts:13-14,187-191, src/lib/plugins/queryjs/queryjs.logic.ts:114-161, src/lib/features/collection/collection.store.svelte.ts:15-44, src/lib/core/vault/vault-entries.service.ts

- [x] Go/no-go recorded in Notes from a session with Issue 05's `QJS-PROFILE` `ensureCache` timer
- [x] Failing first: two blocks at the same index version build pages once
- [x] A write (new entries array or a collection version bump) rebuilds the set
- [x] Block B's `sort` / `mutate` on its `pages()` list does not change the order or length of block A's list
- [x] Notes record that `p.file.tags` is already the shared entries-memo array today (`queryjs.logic.ts:114,148`), so a `tags.push()` leak exists before this Issue; the shared surface grows by `inlinks`, `outlinks`, `tasks` and `KBDateTime` values. A deep copy is out of scope unless the owner asks
- [x] KBAPI firewall tests (`kbapi-firewall.test.ts`) stay green

## Notes

- Go (owner session `2026-11-03_07-36-46.log`, release build): 39 `ensureCache` builds, each over N=10631 pages, p50 66 ms, p90 84 ms, max 86 ms, 2.7 s in total. They came from 17 note opens, up to 16 builds in one 1 s burst (weekly notes with wellness + habits blocks, now all auto-run after Issue 12); 1.37 s of that was a rebuild at the same index version. `qjs-execute` p50 106 ms, max 326 ms. The burst at 10:37:26-27 holds the session's largest `[HB]` stalls (339-390 ms). The 30 ms estimate in the research was low.

- The 282 / 155 ms in the baseline were wall-clock across two IPC awaits; the 10-Oct run is bounded at 33 ms including the chart. The bench's 84 ms floor for `ensureCache` alone was refuted.
- Research: `.scratch/ui-responsiveness/research/E-deep-dive.md` (fix 1), `E-verify.md` (corrections 1-3, fix table).
- Shared surface: `p.file.tags` is already the shared entries-memo array today (`buildKBPage` in `queryjs.logic.ts` assigns `entry.tags` uncopied), so a `tags.push()` in one block leaks to every reader of the snapshot before this Issue. Sharing the page set grows that surface by `inlinks`, `outlinks`, `tasks`, `KBDateTime` values and the page-root properties: a script that writes to a page object (`mutate(p => { p.x = ... })`) is seen by later blocks at the same index state. Only the `pages()` list is copied per call. A deep copy is out of scope unless the owner asks (recorded in ADR 0010, amendment 2026-11-03 "blocks share one page set per index state").

## Comments

- 2026-11-03, branch `issue/13-queryjs-shared-page-memo`: queryjs blocks at the same entries snapshot and property-index version share one module-level page set; each `pages()` call returns a copied list; each `KBAPI` keeps the set it first got (`_pageSet`) across awaits; help page warns that page objects are shared. Tests: `pnpm check` 0 errors; queryjs + help tests 749 passed; full suite at 2a16c4b9 exit=0 (452 files, 10387 passed, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED (4 fixes applied, 1 nit rejected), round 2 APPROVED (no findings).
