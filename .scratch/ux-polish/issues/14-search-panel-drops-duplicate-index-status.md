# 14: The Search panel stops repeating the index status the status bar already shows

**What to build:** (Assumes the owner decision "the status bar owns the index status"; see Notes.) While the Search lens is open the index state is shown twice: the panel's "Indexed: N notes · M chunks" row with its own progress spinner (`src/lib/features/search/SearchPanel.svelte` about lines 90-103) and the always-mounted status bar's `SearchStatus` ("N notes indexed", "Indexing...", semantic progress; `src/lib/features/search/SearchStatus.svelte`, mounted at `src/lib/app/AppShell.svelte` about line 299). Remove the panel's "Index stats + progress" block and the `Loader2` import it leaves unused.

Trace (CLAUDE.md "Removing or Refactoring Code"): the removed block only reads `searchStore.isIndexing`, `isSemanticIndexing`, `semanticProgress`, `indexStats` and `semanticStats` and writes nothing. `SearchStatus.svelte` reads the same five store fields (lines 9-28) and renders indexing, semantic progress and the note count; it is mounted in `StatusBar` for the whole app lifetime, so the information stays on screen whenever the panel is. The one difference: the panel shows chunks whenever `semanticStats` is set, the status bar only when semantic search is enabled, which is the better rule.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/features/search/SearchPanel.test.ts`: with the real `searchStore` given `setIndexStats({ totalDocuments: 12, ... })`, the panel does not contain "Indexed:"; it fails on the current code
- [ ] A new `src/tests/lib/features/search/SearchStatus.test.ts` (none exists) pins the surviving owner with the real store: "12 notes indexed" for the same stats, "Indexing..." while indexing, the semantic progress message while semantic indexing, and nothing when `indexStats` is null
- [ ] `SearchPanel.svelte` no longer imports `Loader2`; the mode buttons and results are unchanged
- [ ] No existing unit or E2E test asserts "Indexed:" or "notes indexed" today (checked at `dd4f06376`); `pnpm vitest run` stays green

## Notes

- **Source:** review-2026-11-04.md "Shell layout" row "Small items" ("Duplicate index status ... Remove duplicate").
- **Owner decision:** which surface keeps the count. Recommended and assumed here: the status bar, because it is always visible and already shows progress. If the owner prefers the panel, this ticket becomes "hide `SearchStatus` while the Search lens is open" instead.
- **Layer:** `features/search` only.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/81-search-panel-stops-repeating-index-status-status.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
