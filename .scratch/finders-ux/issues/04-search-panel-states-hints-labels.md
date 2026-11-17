# 04: Search states: short query, error, disabled mode; operator hints; a11y labels; index status only in the status bar

**Origin:** design review 2026-11-17, proposals P59, P161 and P162 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-search-panel.md` (ticket B) and `.scratch/finders-ux/research/breakdown.md` (02). Absorbs `.scratch/open-itens/issues/220-search-panel-stops-repeating-index-status-status.md`. The span-only result markup of P162 is in 03.

**What to build:** in `src/lib/features/search/SearchPanel.svelte`, with store, service and logic support:

1. **Short query.** In Semantic or Hybrid, a query under 3 code points shows "Type at least 3 characters" instead of "No results found". No Text fallback. The check is a pure helper in `search.logic.ts` (for example `isBelowSemanticMinimum(query)`) with a named constant `SEMANTIC_MIN_QUERY_CHARS = 3` and a comment pointing at `src-tauri/src/commands/semantic.rs:804` and `:991`. It counts code points and applies the same `parsed.text.trim() || raw` rule the service uses.
2. **Error state.** `searchStore` gains a `searchError` field (getter, setter, cleared by `reset()`). The service sets it when `search_semantic` fails in Semantic mode and in the outer catch, logs with `error()` from `#lib/utils/debug.js` instead of `debug()`, and clears it on a new or empty query. Do not write partial results on error. The panel shows "Search failed" with a Retry button that calls `performSearch`, inside `role="alert"`. Use plain markup matching the existing panels (the `text-xs text-file-explorer-muted-fg text-center py-4` paragraphs plus the shared `Button`). The FTS-to-in-memory fallback and the hybrid-to-legacy fallthrough still return results, so they are not errors.
3. **Disabled modes.** A semantic mode is available when `settingsStore.search.semanticSearchEnabled && searchStore.modelAvailable` (today the panel checks only `!searchStore.modelAvailable`, `SearchPanel.svelte:89-90`). The Semantic and Hybrid buttons use `aria-disabled="true"` instead of native `disabled` while unavailable. If the current mode is Semantic or Hybrid and it becomes unavailable (the setting is turned off), the panel switches `searchStore.mode` to Text and shows the inline note below. Activating one (click, Enter or Space) does not change `searchStore.mode`; it shows an inline note under the mode toggle with the reason and a link-styled button "Open Settings > Search" that calls `settingsPanelStore.open('search')`. The link lives in the panel, not inside a tooltip, because tooltip content is not keyboard-reachable. The reason, also used as the button's tooltip, is "Semantic search is off. Turn it on in Settings > Search." when `settingsStore.search.semanticSearchEnabled` is false, and "Semantic search is starting..." when the setting is on but `searchStore.modelAvailable` is false. Read both: turning the setting off in-session does not reset `modelAvailable`. The note goes away when the mode becomes available or the user activates Text.
4. **Operator hint.** In Text mode only, the empty state keeps "Type to search across all files" and adds one line, "Try tag:work or path:Projects". Operators are ignored in Semantic and Hybrid by design (`help/examples/search-types/README.md:18-19`), so there is no hint there.
5. **Labels.** The input gets `aria-label="Search vault"`. The mode toggle is `role="group" aria-label="Search mode"` and each mode button has `aria-pressed`. The `~` toggle gets `aria-label="Fuzzy matching"` and `aria-pressed`, and keeps its `title`.
6. **One status region.** One persistent `role="status"` element (the same DOM node across state changes) carries the Searching / N results / No results found / short-query text. 05 reuses this node.
7. **Index status only in the status bar (from 220).** Remove the panel's "Index stats + progress" block (`SearchPanel.svelte:98-111`) and the `Loader2` import (`:4`) it leaves unused. The status bar's `SearchStatus` stays the single owner of the index status.
8. **Help.** `help/documentation/06-search-and-navigation.md` says Semantic and Hybrid need 3 or more characters and are off until enabled in Settings > Search, and mentions the operator hint.

Out of scope: a "semantic index is still building" message for a Semantic search during the first index build.

Size: this is the largest ticket in the feature; build all of it in one run.

**Blocked by:** 03

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/search.spec.ts`.

- [x] Failing test first, `SearchPanel.test.ts`: in Semantic or Hybrid with a 1-2 character query, the panel shows "Type at least 3 characters", not "No results found"; Text mode is unchanged. `search.logic.test.ts` covers the helper (empty, 2 and 3 code points, an operator-only query).
- [x] Failing test first: a `search_semantic` rejection in Semantic mode, or the outer catch, sets `searchStore.searchError`; the panel shows "Search failed" with a Retry button in `role="alert"` that re-runs `performSearch`; results stay empty; a new search or an empty query clears it. `search.store.test.ts` covers the getter and `reset()`. The FTS fallback and the hybrid fallthrough stay silent and still return results.
- [x] Failing test first: unavailable mode buttons have `aria-disabled="true"` (the `.disabled` assertions at `SearchPanel.test.ts:175-176` change on purpose, and the test at `:173-178` must also turn the setting on before it expects the modes to become available); activating one leaves `searchStore.mode` unchanged and shows the reason with an "Open Settings > Search" link; clicking the link calls `settingsPanelStore.open('search')` (assert the real `settingsPanelStore` state); the reason text depends on `semanticSearchEnabled` and `modelAvailable`.
- [x] With the mode on Semantic, turning `semanticSearchEnabled` off switches the mode to Text and shows the inline note with the link.
- [x] The Text-mode empty state keeps "Type to search across all files" and adds the operator hint; there is no hint in Semantic or Hybrid.
- [x] Tests assert `aria-label` on the input and on `~`, `aria-pressed` on the modes and on `~`, and `role="group"` on the mode toggle, with `getAttribute`.
- [x] One persistent `role="status"` element (the same node across state changes) carries the status text.
- [x] Failing test first (from 220), `SearchPanel.test.ts`: with the real `searchStore` given `setIndexStats({ totalDocuments: 12, ... })`, the panel does not contain "Indexed:".
- [x] A new `src/tests/lib/features/search/SearchStatus.test.ts` pins the surviving owner with the real store: "12 notes indexed" for the same stats, "Indexing..." while indexing, the semantic progress message while semantic indexing, and nothing when `indexStats` is null.
- [x] `SearchPanel.svelte` no longer imports `Loader2`; mode buttons and results are otherwise unchanged.
- [x] `e2e/specs/search.spec.ts:31-37` ("No results found" for a nonsense Text query) stays green; the help doc is updated.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P59.** Search failures, short queries and disabled modes all read as "No results found". Separate states: "Type at least 3 characters" in Semantic and Hybrid, an error state with Retry, and a tooltip on disabled modes saying the model is unavailable, with a Settings link.
- **P161.** Search operators and the fuzzy toggle are undiscoverable. Show one hint line in the empty state ("Try tag:work or path:Projects"). Give the "~" toggle `aria-pressed` and the label "Fuzzy matching".
- **P162.** Search panel markup and async status changes are silent to assistive tech. Add `aria-label` on the input and `aria-pressed` on the modes, and use spans inside SearchResult.
- **220 (absorbed).** The Search panel stops repeating the index status the status bar already shows. Remove the panel's "Index stats + progress" block and the `Loader2` import it leaves unused. Owner decision 2026-11-06: the status bar keeps the index count.

## Problem

Hybrid and Semantic return nothing under 3 characters, disabled modes give no reason, and errors are only logged, so all three read as "No results found" and the user concludes the note does not exist. The `tag:` and `path:` operators are never shown in the panel, and the fuzzy toggle is a bare "~". The input, mode buttons and `~` have no accessible names or pressed state, and status changes are not announced. The index status is shown twice while the Search lens is open.

## Evidence

Checked at `bb57e6165`.

- `src-tauri/src/commands/semantic.rs:804` and `:991`: `chars().count() < 3` returns nothing, with no FTS fallback.
- `src/lib/features/search/SearchPanel.svelte:84-96`: mode buttons with native `disabled` and no `aria-pressed`; `:98-111` the index block with `Loader2` (`:4`); `:115-120` Searching / empty hint / "No results found"; `:154-168` input with only a placeholder and the bare `~` toggle.
- `src/lib/features/search/search.service.ts:257-261`: `search_semantic` failure logged with `debug()` and results set to `[]`; `:269-270` outer catch logs only; `:174-178` hybrid fallthrough; `:229-240` FTS-to-in-memory fallback.
- `src/lib/core/settings/settings.store.svelte.ts:108`: `semanticSearchEnabled` defaults to false. `src/lib/app/lifecycle/app-lifecycle.service.ts:477-482`: a missing model at startup turns the setting back off with a toast, so "model not installed" is never the standing reason.
- `src/lib/core/settings/settings-panel.store.svelte.ts:11`: `open(section?: SettingsSection)`; `'search'` is a section.
- `src/lib/features/search/SearchStatus.svelte:9-28` reads `isIndexing`, `isSemanticIndexing`, `semanticProgress`, `indexStats` and `semanticStats`, and is mounted for the app's lifetime at `src/lib/app/AppShell.svelte:304`. The panel block reads the same five fields and writes nothing, so removing it loses no information; the only difference is that the status bar shows chunks only when semantic search is enabled, which is the better rule. `SearchStatus.test.ts` does not exist yet. No unit or E2E test asserts "Indexed:" or "notes indexed".

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: a too-short Hybrid query shows the "Type at least 3 characters" message (no Text fallback); a disabled mode shows its reason and a link that opens Settings > Search (an inline note in the panel, so the link is keyboard-reachable); the status bar owns the index status, so the panel's duplicate index block goes (per 220's trace); error and empty states use plain markup matching the existing panels.

- 2026-11-17, branch `issue/04-search-panel-states-hints-labels`: search panel short-query, error (Retry) and disabled-mode states with Settings link; Text-mode operator hint; aria-label/aria-pressed/role=group labels and one persistent role=status; index status moved to `SearchStatus` (status bar) only. Fix round: tab indentation on the `~` toggle attributes; keyboard finding rejected (native buttons). Tests: pnpm check exit 0; SearchPanel.test.ts exit 0; full suite at 0c83a3dfb exit 0 (643 files, 17098 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED.
