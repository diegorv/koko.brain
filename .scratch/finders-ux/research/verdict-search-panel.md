# Verdict: cluster "Search panel" (P58, P59, P158, P161, P162)

Checked at `bb57e6165` by reading the code. Nothing was run. The scout's line numbers hold. All five proposals are still real, and none is already fixed by a resolved Issue. Several of the scout's claims are wrong or incomplete, and the tickets below use the corrected facts.

## Corrections to the scout and the review

1. **Hybrid cards never carry `<mark>`.** The scout says FTS and hybrid snippets are FTS5 `snippet()` output with `<mark>`. That holds only for Text mode. The `search_hybrid` adapter sets `snippet: r.content.slice(0, 200)` (`search.service.ts:165`), the raw chunk text. A chunkless path that Rust builds from FTS has its marks removed on purpose (`src-tauri/src/search/hybrid.rs:187`, `docs/SEARCH.md` Known limitations). Highlights appear only on Text cards and on the legacy merge fallback. Markdown stripping is needed in every mode.
2. **"No visible highlight" proves nothing about the real app.** The screenshot was taken in browser E2E mode, and the mock `search_fts` returns `snippetLine.slice(0, 200)` with no `<mark>` (`e2e/mocks/tauri-core.ts:315-321`). Tailwind's preflight does not reset `mark` (grep of `node_modules/tailwindcss/preflight.css`), so in the real app the WebKit user-agent style should paint it yellow with black text, in light and dark themes alike. P158's highlight half is "theme the highlight", not "make it visible". Not checked in the running app.
3. **The disabled-mode reason is always "the setting is off", never "the model is not installed".** `semanticSearchEnabled` defaults to `false` (`settings.store.svelte.ts:108`). At startup, a missing model turns the setting back off and shows a toast (`src/lib/app/lifecycle/app-lifecycle.service.ts:477-482`; the scout cites a path that does not exist, `core/app-lifecycle/`). Turning the setting on downloads the model (`SearchSection.svelte:56-93`). So the copy is "off, turn it on in Settings > Search". The prototype's "the embedding model, which is not installed" is wrong. A short second case does exist: the setting is on but the model is not loaded yet (the startup defer or a download in progress).
4. **Operators are ignored in Semantic and Hybrid by design, not until Issue 160 lands.** `help/examples/search-types/README.md:18-19` documents it. Issue 160 only switches a tag click (`openSearch`) to Text mode, and typed operators stay inert in the other modes. P161's hint therefore belongs only in Text mode, for good.
5. **The overlapping error-state proposal is P16, not P08.** The scout cites "P08 item (1)". P08 is about auto-organize config. Item (1) of P16 ("Errors go to the wrong channel") asks for the same `searchStore` error with Retry as P59. P16 is not in this run's clusters. If P16 is ticketed later, it must drop item (1), because ticket B owns it.
6. **A settings link inside a tooltip cannot be reached from the keyboard.** A tooltip closes on blur, and its content is not in the tab order. The tooltip should give the reason only. Activating the disabled mode opens Settings > Search, so the link and the explanation are one control.
7. **Overlaps the scout missed:**
   - In this same run, `verdict-background-refresh.md` ticket B ("Search keeps the previous results on screen", blocked by 057) rewrites the same `isSearching` branch of `SearchPanel.svelte` and adds a `role="status"` spinner. P162 adds a status live region next to it. The two tickets must not run in parallel, and the panel needs only one polite live region.
   - Issue 209 (`ready-for-agent`, S) adds a `pr-7` gutter to the same subtitle and snippet elements that ticket A turns into spans. Any order works, but not in parallel. The second one to land keeps the other's change.
   - Issue 220 deletes the panel's "Indexed / Building index..." row (`SearchPanel.svelte:98-111`). After that, the review's note "the indexing state already exists" is true only in the status bar. A Semantic search during the first index build will then read "No results found" in the panel. See owner question 4 under B.
   - Review P17 (toolbar kit, `ToolbarSearch`) cites `SearchPanel.svelte:154-161`, the search input. It is in no cluster in this run, so it is only a text conflict.
8. **Observation, not ticketed:** turning the setting off in-session never resets `searchStore.modelAvailable` (it is set only at `search.service.ts:347`, and `handleToggle(false)` only stops the listener). Semantic and Hybrid stay enabled for the rest of the session. Ticket B's tooltip logic must read both `settingsStore.search.semanticSearchEnabled` and `modelAvailable`, and must not assume they agree.

The scout's other claims check out: the hard-coded `source: 'both'` and the unstripped `.md` title (`search.service.ts:161-170`), the duplicated heading in title and subtitle (`SearchResult.svelte:47-68`), the 3-character floor in Rust (`semantic.rs:804`, `:991`, both `chars().count() < 3`, with no fallback to FTS), the single "No results found" branch (`SearchPanel.svelte:115-120`), no aria attributes on the input, mode buttons or `~` (`:86-94`, `:154-168`), `div` and `p` inside the result `<button>` (`SearchResult.svelte:136-173`), no stripper anywhere (the Rust `compute_snippet` in `vault/entry.rs:376` keeps the markdown on purpose), and the cited tests at `search.service.test.ts:254-283`, `SearchResult.test.ts:107-137` and `SearchPanel.test.ts:173-213`.

## Existing Issues checked

| Issue | Status | Relation | Decision |
|---|---|---|---|
| open-itens/057 | ready-for-agent, ledger todo | Same `performSearch` empty-query branch and panel `isSearching` branch | B is blocked by it (S, first wave) |
| open-itens/220 | ready-for-agent, owner decision 2026-11-06 | Deletes the block between the mode buttons and the results | B is blocked by it (S, first wave) |
| open-itens/209 | ready-for-agent | Gutter on the `SearchResult` text rows | Do not run in parallel with A; no block |
| open-itens/204 / 205 | ready-for-agent / blocked by 204 | 205 moves only "No results found" to `EmptyState` and keeps hint copy plain | Not a block: B ships plain markup, and 205's minimum scope does not cover the new states |
| open-itens/160 | ready-for-agent | Tag click forces Text mode | Independent; the hint is Text-only either way |
| open-itens/045 | ready-for-agent | Operator filtering after the 50-row cap | Independent; it makes the advertised operators reliable |
| open-itens/161 | ready-for-agent | Rust fuzzy candidates | Unrelated, despite the number |
| tasks-view-ux/113 (resolved) | resolved | a11y precedent | Read it for conventions |

No open Issue already plans any of the five proposals, so both tickets are new.

## Tickets

### A. Search result cards: note name and folder, plain-text snippets, themed highlight (P58, P158, P162 card markup), size M, blocked by none

Files: `SearchResult.svelte`, the hybrid adapter at `search.service.ts:161-170`, `search.types.ts:46` (`source` becomes optional), a new pure util in `src/lib/utils/` (for example `markdown-plain-text.ts`, shared later with review P74), one `mark` rule in `src/app.css`, and the "Search Results" section of `help/documentation/06-search-and-navigation.md`. Tests: `SearchResult.test.ts`, `search.service.test.ts`, `SearchPanel.test.ts:160-171`, and a new `src/tests/lib/utils/<util>.test.ts`.

Acceptance:
- Failing test first, util: the stripper turns ATX headings, `**`/`*`/`_`/`~~`/`==`, links and images, wikilinks (alias if present, else the target's last segment), checkboxes, list and quote markers, inline code, fences and callout markers into plain text. It keeps `<mark>`/`</mark>` and tolerates unbalanced syntax cut by `...` or the 200-character limit. Its output goes through `sanitizeSnippetHtml` afterwards (strip first, sanitize last).
- Failing test first, `search.service.test.ts`: a hybrid chunk for `Projects/a.md` with heading `Intro` adapts to title `a` (no `.md`) and no `source`. The `:282` assertion changes on purpose. A new test covers the `search_hybrid`-throws fallthrough: legacy merge results still carry a real `source`.
- Failing test first, `SearchResult.test.ts`: for every mode, the title is the note name, and the subtitle is the parent folder (none at vault root) plus `§ heading` when there is a heading. No subtitle repeats the file name. A hybrid card without `source` shows no badge, and one with `source` from the fallback still shows it (the existing badge test moves to a fixture that has `source`). The snippet shows no raw markdown.
- The result `<button>` contains only phrasing content (spans styled `block`/`flex`). The subtitle test stops using `querySelector('p')` and uses a stable hook such as `data-search-result-subtitle`.
- `mark` inside search results uses the existing `--lp-highlight-bg` token with `color: inherit`. This adds no theme token and does not change `theme-snapshot.test.ts.snap`. Because the rule is CSS, a test that reads computed style is not required.
- `e2e/specs/search.spec.ts` stays green (rows still contain the note name).
- The help text describes the card as it is now: note name, folder and heading, and snippet. The "relevance score" claim holds only for Semantic.
- Gate: `pnpm check` and `pnpm vitest run`.

### B. Search panel: distinct short-query, error and disabled-mode states, operator hint, accessible labels (P59, P161, P162 panel half), size M, blocked by 057 and 220

Files: `SearchPanel.svelte`, `search.store.svelte.ts` (a `searchError` field with getter, setter and `reset()`), `search.service.ts` (sets and clears the error; failures logged with `error()` instead of `debug()`), `search.logic.ts` (a pure `isBelowSemanticMinimum(query)` with a named constant `SEMANTIC_MIN_QUERY_CHARS = 3` and a comment pointing at `semantic.rs`; it counts code points and applies the same `parsed.text.trim() || raw` rule the service uses), and the help doc. Tests: `SearchPanel.test.ts`, `search.store.test.ts`, `search.service.test.ts`, `search.logic.test.ts`.

Acceptance:
- Failing test first: in Semantic or Hybrid with a 1-2 character query, the panel shows "Type at least 3 characters" instead of "No results found". Text mode is unchanged.
- Failing test first: when `search_semantic` rejects in Semantic mode, or when the outer catch fires, `searchStore.searchError` is set, the panel shows "Search failed" with a Retry button that calls `performSearch`, and the results stay empty (`search.service.test.ts:244` gains the error assertion). The FTS-to-in-memory fallback and the hybrid-to-legacy fallthrough still return results, so they are not errors. A new search or an empty query clears the error. The store getter has its own test.
- Failing test first: the Semantic and Hybrid buttons use `aria-disabled="true"` instead of native `disabled` while unavailable. Activating one does not change `searchStore.mode`; it calls `settingsPanelStore.open('search')`. Its tooltip reads "Semantic search is off. Turn it on in Settings > Search." when `semanticSearchEnabled` is false, and "Semantic search is starting..." when the setting is on but `modelAvailable` is false. The `.disabled` assertions at `SearchPanel.test.ts:173-175` change on purpose to `aria-disabled`.
- In Text mode, the empty state keeps "Type to search across all files" and adds one hint line, "Try tag:work or path:Projects". The hint is absent in Semantic and Hybrid. The `:195-199` `toContain` assertion stays green.
- The `~` toggle gets `aria-label="Fuzzy matching"` and `aria-pressed={fuzzyEnabled}` and keeps its `title`. The input gets `aria-label="Search vault"`. The mode toggle is `role="group" aria-label="Search mode"`, and each mode button has `aria-pressed`. Tests assert the attributes with `getAttribute`.
- A single persistent polite status element (`role="status"`) wraps the "Searching..." / "N results" / "No results found" / short-query text. A test checks that it is the same element before and after a state change. The error uses `role="alert"`.
- `e2e/specs/search.spec.ts:31-37` ("No results found" for a nonsense Text query) stays green.
- The help doc says Semantic and Hybrid need 3+ characters and are off until enabled in Settings > Search.
- Gate: `pnpm check` and `pnpm vitest run`.

Not split into B1 (labels and hint) and B2 (states). P59's switch to `aria-disabled` and P162's `aria-pressed` change the same `<button>` element. P161's hint and P59's short-query message change the same empty-state branch. Two agents in sequence would rewrite the same lines twice. The ticket is about 4 source files and 4 test files.

## Sequencing

057 and 220, then B. The P30 Search ticket from `verdict-background-refresh.md` goes before or after B, never at the same time, and the second one to land reuses the first one's live region. A runs any time except at the same time as 209. A and B share no lines. Their only shared file is `search.service.ts`, where A edits the hybrid adapter (:161-170) and B edits the catches (:174-178, :257-261, :269-270), which are separate hunks.

## Owner questions

1. Short query in Hybrid: show "Type at least 3 characters" (the default), or fall back to Text results for 1-2 characters?
2. Activating a disabled mode opens Settings > Search (the default, replacing the review's "link in the tooltip"). Is that acceptable?
3. Should B wait for the 204 primitives? Default: no. B ships plain markup, and 205 or a later follow-up converts it.
4. After 220, should a Semantic or Hybrid search during the first semantic index build say "Semantic index is still building" instead of "No results found"? Default: not in this ticket.
