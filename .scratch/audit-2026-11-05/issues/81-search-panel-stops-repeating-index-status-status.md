# 81: The Search panel stops repeating the index status the status bar already shows

**Migrated from:** `.scratch/ux-polish/issues/14-search-panel-drops-duplicate-index-status.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. The Issue assumes an owner decision that is not recorded.

**Audit check at `5f8003d67`:** still_present (polish, low). The panel still renders its own 'Indexed: N notes · M chunks' row with a Loader2 spinner (src/lib/features/search/SearchPanel.svelte:98-111, Loader2 imported at :4), and SearchStatus is still mounted in the status bar (src/lib/app/AppShell.svelte:51, :305). src/tests/lib/features/search/SearchStatus.test.ts still does not exist.

**Stale in the text below:** Line refs moved: the panel block is now SearchPanel.svelte:98-111 (Issue says about 90-103), SearchStatus mount is AppShell.svelte:305 (Issue says about 299). The ticket still assumes the owner decision that the status bar owns the index status.

**Owner decision (2026-11-06):** the status bar keeps the index count; remove the Search panel row. Any wording below that assumes this decision, calls it recommended or unconfirmed, or asks to confirm it with the owner is superseded: the owner confirmed it on 2026-11-06.

**What to build:** (Assumes the owner decision "the status bar owns the index status"; see Notes.) While the Search lens is open the index state is shown twice: the panel's "Indexed: N notes · M chunks" row with its own progress spinner (`src/lib/features/search/SearchPanel.svelte` about lines 90-103) and the always-mounted status bar's `SearchStatus` ("N notes indexed", "Indexing...", semantic progress; `src/lib/features/search/SearchStatus.svelte`, mounted at `src/lib/app/AppShell.svelte` about line 299). Remove the panel's "Index stats + progress" block and the `Loader2` import it leaves unused.

Trace (CLAUDE.md "Removing or Refactoring Code"): the removed block only reads `searchStore.isIndexing`, `isSemanticIndexing`, `semanticProgress`, `indexStats` and `semanticStats` and writes nothing. `SearchStatus.svelte` reads the same five store fields (lines 9-28) and renders indexing, semantic progress and the note count; it is mounted in `StatusBar` for the whole app lifetime, so the information stays on screen whenever the panel is. The one difference: the panel shows chunks whenever `semanticStats` is set, the status bar only when semantic search is enabled, which is the better rule.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

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

- 2026-11-06: migrated from `.scratch/ux-polish/issues/14-search-panel-drops-duplicate-index-status.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
