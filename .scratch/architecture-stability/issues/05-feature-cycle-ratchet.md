# 05: Feature-cycle ratchet

**What to build:** Extend the layer test from issue 04 with a feature-level strongly-connected-component check (Tarjan) over features->features edges, type-only edges included.
- The baseline key `featureCycleEdges` lists the 24 feature pairs inside today's single 10-feature cycle: backlinks, collection, event-calendar, file-icons, note-list, properties, quick-switcher, search, tags, type-definitions.
- The test fails when a new cycle forms, when a feature joins the existing one, or when a new pair appears inside it.
- It also fails when a listed pair disappears, so the baseline has to shrink.
- The failure message names the cycle path (a -> b -> … -> a) and points at the registration-API pattern or at moving the shared piece down into core/utils.

**Blocked by:** 04


**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** docs/adr/0003, features/backlinks/LinkItem.svelte:4, features/search/SearchResult.svelte:6, features/tags/TagsView.svelte:9

- [x] SCC unit tests come first, on synthetic graphs: an acyclic graph, a 2-cycle, a nested cycle, and a self-edge (ignored)
- [x] At HEAD there is exactly one SCC, made of the 10 listed features and 24 intra-cycle pairs
- [x] A synthetic edge search -> deep-link fails (deep-link -> search already exists, so deep-link joins the SCC), with a message naming the cycle path
- [x] A synthetic new pair inside the cycle that is not one of the 24 fails
- [x] All directed feature pairs (50 today) are recorded in the baseline, so a new acyclic pair shows up in the diff for review, without failing the test
- [x] Removing a baselined pair fails with the delete instruction
- [x] `scripts/import-graph.mjs` (from Issue 04) no longer throws at import when `process.argv[1]` is not a real file (`node -e "import('<abs>/scripts/import-graph.mjs')" extra-arg` gives ENOENT today, from `realpathSync` in the CLI guard at :272). Wrap the comparison in a try/catch that treats an error as "not main". Found by the post-delivery review of Issue 04 (low).

## Notes

- **Numbers are from dad4c4c6.** Sidebar 25 deletes TypeNoteList and TypeSidebar (the type-definitions -> note-list / quick-switcher / file-icons edges), so regenerate the SCC and pair counts at the landing commit.
- **Why it is one big cycle:** `.svelte` imports join it, e.g. `backlinks/LinkItem.svelte` and `search/SearchResult.svelte` -> `event-calendar/ShowInCalendarButton.svelte`.
- **Limits:** "acyclic" does not predict coupling bugs on its own. Of the 13 fixes since May that touch 2+ features, only 5 stay inside the cycle. Hubs like type-definitions (imported by 6+ features, 43 fixes by path) are the other risk, which is why the full pair list is recorded.
- **Six pairs point both ways:** file-icons<->properties, file-icons<->type-definitions, note-list<->type-definitions, properties<->quick-switcher, properties<->type-definitions, search<->tags.
- **Size:** S.

## Comments

- 2026-11-01, branch issue/05-feature-cycle-ratchet: features->features pair baseline, Tarjan SCC and cycle-path helpers, feature-cycle ratchet test, import-graph.mjs CLI guard try/catch. Full suite (vitest + build) passed: 380 files, 9200 tests. Reviews: round 1 CHANGES_REQUESTED (fixed), round 2 APPROVED.
