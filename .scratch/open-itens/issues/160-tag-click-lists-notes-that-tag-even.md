# 160: A tag click lists the notes with that tag even when Semantic or Hybrid was the selected search mode

**Origin:** `audit-2026-11-05` Issue 49, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Both tag-click entry points call openSearch(`tag:${tag}`) (src/lib/features/tags/TagsView.svelte:17-18, src/lib/app/editor-host.ts:165), and openSearch only sets the query (src/lib/features/search/open-search.service.ts:11-15), not the mode. In hybrid mode performSearch sends parsed.text.trim() || raw, i.e. the literal 'tag:work', to search_hybrid and returns (src/lib/features/search/search.service.ts:145-173); semantic mode does the same at :243-256. The operator filters exist only in the text branch (:181-228), and SearchPanel renders semanticResults / hybridResults in those modes (SearchPanel.svelte:136-143), so the user sees chunks semantically close to the string 'tag:work' instead of the tagged notes. Fix direction: a tag click shows the operator-only answer, for example openSearch selects Text mode when its query carries operators and no words (which also covers a kokobrain://search link), keeping the user's mode for every other query.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/search/open-search.service.test.ts: with the real searchStore set to mode 'semantic', openSearch('tag:work') leaves searchStore.mode === 'text' and query 'tag:work'. It fails today.
- [ ] openSearch('meeting') and openSearch() keep the current mode.
- [ ] After the tag click, performSearch lists the tagged notes and does not call search_semantic or search_hybrid (search.service.test.ts).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. It needs the search mode switched away from Text first.
- **Trigger:** Switch the Search panel to Semantic or Hybrid (the choice stays for the session), then click a tag in the Tags view or Cmd+click a #tag in a note.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/tags/TagsView.svelte:17-18 and src/lib/app/editor-host.ts:165 openSearch(`tag:${tag}`) -> src/lib/features/search/open-search.service.ts:11-15 sets query, rail item, focus; no mode -> src/lib/features/search/search.store.svelte.ts:21 mode is session $state -> src/lib/features/search/search.service.ts:145-153 hybrid sends 'tag:work' to search_hybrid; :243-253 semantic sends it to search_semantic; operator handling only at :181-228 -> src/lib/features/search/SearchPanel.svelte:136-143 renders semantic/hybrid lists in those modes. help/examples/search-types/README.md:18 says semantic and hybrid ignore operators, but the tag click gives the user no way to see that.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-05` (from index-spec-5). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). openSearch (open-search.service.ts:11-15) sets only the query, the rail item and focus. In hybrid mode, parsed.text is empty for 'tag:work', so search_hybrid receives the raw 'tag:work' and the function returns (:145-173). Semantic mode does the same (:243-256). SearchPanel renders the semantic and hybrid lists in those modes. Search mode is session $state in search.store (default 'text'), so the user has to switch modes first, which keeps likelihood low.

## Comments
