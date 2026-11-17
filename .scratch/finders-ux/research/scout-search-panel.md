# Scout: Search panel (P58, P59, P158, P161, P162)

Checked against main at `f2cd7f97b` (working tree clean apart from `.scratch/design-review/`). All line numbers are current HEAD. Read-only; nothing edited.

Files in scope (all `src/lib/features/search/`): `SearchPanel.svelte` (171 lines), `SearchResult.svelte` (178), `search.service.ts` (425), `search.store.svelte.ts` (90), `search-hybrid.logic.ts` (73). Only caller of `SearchResult.svelte` is `SearchPanel.svelte`; only caller of `SearchPanel.svelte` is `src/lib/app/AppShell.svelte:246`. `performSearch` is driven by a 200 ms debounced `$effect` in `src/routes/(app)/+layout.svelte:169-180`.

## Facts that change the review's framing

1. **The "Both" badge is invented by the frontend.** Hybrid mode calls the Rust `search_hybrid`, which returns plain `SemanticResult[]` chunks (no source). The adapter hard-codes `source: 'both'` (`search.service.ts:169`). Real per-result sources exist only on the fallback path (`mergeResults`, `search-hybrid.logic.ts:28-63`), reached only when `search_hybrid` throws (`search.service.ts:174-178`). So in practice every hybrid card says "Both".
2. **The default state for Semantic/Hybrid is "disabled because the setting is off", not "model missing".** `settingsStore.search.semanticSearchEnabled` defaults to `false` (`settings.store.svelte.ts:108`). `initSemanticSearch` (which sets `modelAvailable`) runs at startup only when that setting is on (`app-lifecycle.service.ts:467-477`), and it flips the setting back off if the model is missing (`:478-484`). So `modelAvailable` stays `false` for a user who never enabled it, and the disabled-button tooltip in P59 must say "turn on in Settings > Search", with the model download as the second case. The review text ("tooltip saying the model is unavailable") is only half of it.
3. **Under 3 characters, `search_semantic` and `search_hybrid` return `Ok([])`, not an error** (`src-tauri/src/commands/semantic.rs:804`, `:991`, both `chars().count() < 3`). Hybrid does not fall through to FTS for a 1-2 char query (the fallback only runs on a throw), so Hybrid shows nothing where Text would show hits. The rule exists only in Rust; nothing in docs/ or help/ mentions it (grep for "3 char" finds nothing relevant).
4. **Hybrid ignores `tag:`/`path:` operators** (sends `parsed.text.trim() || raw`, `search.service.ts:147-153`); that is existing Issue 160, not in this cluster, but P161's hint line should say the operators work in Text mode only, or 160 must land first.
5. **The `<mark>` highlight has no CSS rule** (`grep` of `src/app.css`: no `mark` selector). In the real screenshot (`screens/search-results-light.png`) the matched words show no visible highlight at all. `app.css:320` already defines `--lp-highlight-bg: #fbbf2444` (editor `==highlight==`), a candidate to reuse without adding a theme token (see Open questions).

---

## P58. Hybrid results hide the note name, and every card says "Both"

**Still real: yes.**

Current code:
- `search.service.ts:161-170`: adapter sets `title: r.heading ?? r.sourcePath.split('/').pop() ?? r.sourcePath`. With a heading, title = heading; without one, title = file name **with `.md`** (the adapter does not strip it, unlike `mergeResults` at `search-hybrid.logic.ts:57`). A chunkless path materialised by Rust (`<path>#fts`, heading None, see `docs/SEARCH.md` line 136) therefore shows "Foo.md".
- `SearchResult.svelte:47-53`: `title` for a hybrid result is `hybridResult.title`; `:55-68`: subtitle is `§ heading` if there is a heading, else the full path. So with a heading, title and subtitle both carry the heading ("Goals" / "§ Goals") and the note name appears nowhere.
- `SearchResult.svelte:95`, `:144-154`: `badgeSource = hybridResult?.source`; badge text "Both" / "Semantic" / "Text" with three colour classes (`search-semantic-bg/fg` tokens at `app.css:45-46`, `:183-184`, `:247-248`).
- Semantic mode (not hybrid) already shows the note name as title via `titleFromPath` (`SearchResult.svelte:36-38, 49`) and `§ heading` as subtitle, so the bug is hybrid-only (as the review says).
- `HybridSearchResult.source` is a required `'text' | 'semantic' | 'both'` (`search.types.ts:46`).

Fix shape: adapter title = note name (strip `.md`; reuse the logic in `titleFromPath`), subtitle = parent folder + `§ heading`; hide the badge when it carries no information. Cleanest: make `source` optional on `HybridSearchResult` and have the adapter omit it (the legacy `mergeResults` fallback keeps setting it, where it varies). Alternative: panel passes a "hide badge" flag. Owner/implementer decision, see questions.

Existing Issues touching the same behaviour: none that change title/badge. Neighbours in the same files: 209 (gutter in `SearchResult.svelte`), 160 (hybrid mode ignores operators), 045 (operator filtering in the FTS branch).

Tests that pin the old behaviour (will need updating, not just adding):
- `src/tests/lib/features/search/search.service.test.ts:254-283` asserts `hybridResults[0].source` is `'both'` (`:282`) and the adapted title.
- `src/tests/lib/features/search/SearchResult.test.ts:132-137` ("renders the source badge at the label role") finds a "Both" span; `:107-117` `hybridFixture` has `source: 'both'`.
- `src/tests/lib/features/search/search-hybrid.logic.test.ts` covers the legacy merge (unaffected unless `source` becomes optional on the type).
- No test exercises the `search_hybrid` throw -> legacy merge fallthrough (`search.service.ts:174-178`); the `it(` list has none. A test for it is cheap and protects the case where a badge still varies.
- E2E: none. `e2e/mocks/tauri-core.ts:335-337, 360-366` makes the model unavailable and returns `[]` for semantic and hybrid, so E2E can never reach a Hybrid card.

Open questions (owner): none blocking. Minor: root-level notes have no folder; what does the subtitle show (just `§ heading`, or nothing)? Shared with P158.

---

## P59. Search failures, short queries and disabled modes all read as "No results found"

**Still real: yes** (and slightly broader than written: see facts 2 and 3).

Current code:
- `SearchPanel.svelte:115-120`: branch order is `isSearching` -> empty query hint -> `!hasResults` => "No results found" -> results. One string covers: no match, a swallowed error, a sub-3-char Semantic/Hybrid query, and a model that is installed but not loaded or with no index built.
- Errors are logged only: `search.service.ts:229-240` (FTS failure falls back to in-memory, silent), `:257-261` (semantic failure sets `[]`), `:269-270` (outer catch `error('SEARCH', ...)`, no store state), and hybrid failure falls through with a debug line only (`:174-178`).
- `search.store.svelte.ts`: no error or "short query" field; `reset()` at `:72-89`.
- Mode buttons: `SearchPanel.svelte:85-95`, `disabled={m.value !== 'text' && !searchStore.modelAvailable}`, `opacity-40`, no title, no explanation. A native `disabled` button gets no hover/focus events, so a tooltip needs `aria-disabled` plus a click guard (the prototype does exactly that: `.scratch/design-review/prototypes/finders-search-tags-graph.html:611`, tooltip "Semantic and Hybrid search need the embedding model, which is not installed. Open Settings, Search").
- Settings link target exists: `settingsPanelStore.open('search')` (`core/settings/settings-panel.store.svelte.ts:11-14`; `'search'` is a valid `SettingsSection`, `settings.types.ts:360`). `components/ui/tooltip` exists.
- Index/indexing state already has its own UI ("Building index...", `SearchPanel.svelte:98-111`); the review's "indexing state already exists" holds. Issue 220 plans to delete that block.
- The 3-char rule is mirrored nowhere in TS. The panel needs it: `parseSearchQuery(raw).text.trim() || raw` (what the service sends) with `[...s].length < 3` (Rust counts `chars()`, i.e. Unicode scalars, not UTF-16 units). Drift risk between Rust and TS; a shared constant is not possible across the IPC boundary, so keep one named constant with a comment pointing at `semantic.rs:804, 991`.

Existing Issues touching the same behaviour:
- `.scratch/open-itens/issues/057` (ready-for-agent): the empty-query branch never clears `isSearching`, so "Searching..." sticks. Same `performSearch` lines (`:127-136`) and the same panel branch (`:115-118`) that P59 rewrites. Land 057 first.
- `.scratch/open-itens/issues/205` (ready-for-agent, blocked on 204): migrates `SearchPanel`'s "No results found" onto `EmptyState` and says error text in Settings moves to `InlineAlert`. Its own conflict note lists `SearchPanel` with 045, 057, 160 and 220. 205 states "Searching..." and "Type to search across all files" stay plain text. P59's new states must pick a side: use the 204 primitives (if landed) or plain markup that 205 later converts.
- `.scratch/open-itens/issues/204` (ready-for-agent): the primitives themselves; `src/lib/components/ui/` has no `empty-state` / `inline-alert` today (`ls` confirmed). The error-with-Retry in the review's P08 principle is the same pattern as `RailNoteList.svelte:873` (`role="alert"` box).
- `.scratch/open-itens/issues/220` (ready-for-agent, owner decision recorded 2026-11-06): remove the panel's "Indexed: N notes" block (`SearchPanel.svelte:98-111`). It sits between the mode buttons and the results; P59/P161/P162 edit lines right around it.
- `.scratch/open-itens/issues/160` (ready-for-agent): tag click should force Text mode. Interacts with P59's short-query rule: a click sends `tag:work`, parsed text is empty, so `|| raw` makes the Semantic/Hybrid short-query check pass on `tag:work`. Moot once 160 lands.
- `.scratch/open-itens/issues/161` is **fuzzy matching in Rust** (not P161). Do not confuse the numbering.
- Review P30 (another cluster) also edits the `isSearching` branch (keep previous results dimmed, "50+ results"). Same lines as P59; sequencing note only.
- Review P08 (another cluster) proposes `searchStore` error state + "Search failed: <message>" with Retry; P59 and P08 item (1) are the same work. Tickets must not both build it.

Tests covering this code:
- `src/tests/lib/features/search/SearchPanel.test.ts:173-193` asserts the Semantic/Hybrid buttons have `.disabled === true` until `setModelAvailable(true)`; switching to `aria-disabled` breaks `modeButton('Semantic').disabled` (`:174-175`). `:195-213`: prompt, "No results found" (test title already says "a failed search leaves the results empty", i.e. pins the exact behaviour P59 changes), "Searching...".
- `src/tests/lib/features/search/search.service.test.ts:82-285` (`performSearch`): `:244` "clears semantic results when semantic search fails" (pins the silent behaviour), `:129-165` FTS fallback.
- `src/tests/lib/features/search/search.store.test.ts` (store getters/reset; a new error field needs a getter test per CLAUDE.md).
- E2E: `e2e/specs/search.spec.ts:31-37` asserts `getByText('No results found')` for a nonsense Text query; must still pass (no-match copy unchanged). No E2E for the new states; the mock reports the model unavailable always, so the disabled-mode tooltip is E2E-testable (open Search, hover Semantic) but Hybrid/Semantic results are not.
- Rust: `search_semantic`/`search_hybrid` 3-char behaviour has no test I could find (`grep` in `src-tauri` finds only the two guards and an unrelated one in `search/hybrid.rs:85`). No Rust change needed for P59.

Owner-only questions:
- Short query: show "Type at least 3 characters" (review) or silently fall back to FTS results in Hybrid for 1-2 chars (arguably better UX, but a behaviour change in `performSearch`)? Default to the review's wording.
- Disabled-mode tooltip wording and whether the Settings link opens `settingsPanelStore.open('search')` directly (assumed yes).
- Use 204/205 primitives or not (sequencing, see grouping).

---

## P158. Search cards show raw markdown, unstyled highlights and a redundant path

**Still real: yes.**

Current code:
- `SearchResult.svelte:74-84`: FTS and hybrid snippets are the Rust FTS5 `snippet(notes_fts, 2, '<mark>', '</mark>', '...', 30)` over **raw** note content (`src-tauri/src/db/fts_repo.rs:83`; `FtsSearchResult.snippet` doc in `src/lib/contracts/generated/FtsSearchResult.ts`). Semantic snippet = `content.substring(0, 200)` of a raw chunk (can cut mid-syntax). Legacy (in-memory fallback) snippets also raw.
- `:86`: `snippetIsHtml = !!ftsResult || !!hybridResult`; `:167-168` renders `{@html sanitizeSnippetHtml(snippet)}`; the sanitizer (`src/lib/utils/sanitize.ts:54-63`, re-exported by `search.logic.ts:30`) escapes everything but `<mark>`/`</mark>`. Semantic and legacy snippets are plain text nodes (`:170`).
- Subtitle for an FTS result is `ftsResult.path` (`:56`), i.e. "Projects/Kokobrain Launch Plan.md" under the title "Kokobrain Launch Plan"; the real screenshot shows it truncated to "Projects/Kokobrain Launch P...". Semantic with no heading: full `sourcePath`; legacy: `relativePath(vault, filePath)`.
- Card is a fixed `h-20 overflow-hidden` wrapper (`:135`) with a 2-line snippet clamp (`:166`), so any added content must fit 80 px.
- No `mark` CSS; theme tokens: `--lp-highlight-bg` already exists; the prototype used a throwaway `--mark-bg` (primary at about 32% alpha) and states "readable in both themes".
- No markdown stripper exists. `grep` for `stripMarkdown|plainText|toPlain` finds only `paste-html-link.logic.ts` (unrelated). `src/lib/utils/` has none. Review P74 (Backlinks/Outgoing link rows, other cluster) wants to share the same stripper, so it should live in `src/lib/utils/` as a pure module (layer rule: `utils/` is stateless), not in `features/search`.

Implementation traps worth stating in the ticket:
- The stripper must run on text that contains `<mark>`/`</mark>` and keep those tags, and the result must still pass through `sanitizeSnippetHtml` (strip first, sanitize last). Highlights sit inside syntax (`**<mark>road</mark>map**`, `[[Projects/<mark>Road</mark>map|x]]`).
- FTS cut ends ("...") and the 200-char semantic cut leave unbalanced syntax (`[[Projects/Website...`, a lone `**`). The stripper has to tolerate unbalanced input.
- Cases to cover: ATX headings, `**`/`*`/`_`/`~~`/`==`, links and images, wikilinks with alias/heading, checkboxes (`- [ ]`, `- [/]`), list/quote markers, inline code and fences, frontmatter fragments (`tags: [design]`, shown in the screenshot), callout markers.
- Wikilink rendering is a style decision (show alias if present, else the target's last segment).

Tests:
- `SearchResult.test.ts:46-340` (click-through to offsets, calendar button, role classes). `:120-130` finds the subtitle with `target.querySelector('p')` and asserts `text-meta`/`text-file-explorer-muted-fg`; any change of subtitle element type breaks it (also relevant to P162).
- `SearchPanel.test.ts:160-171` renders FTS rows and asserts titles/snippet text (with `<mark>` fixtures).
- `src/tests/lib/utils/` pattern for a new `strip-markdown` test file; `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap` holds the `--search-semantic-*` tokens: adding a real theme token changes that snapshot and the theme editor (`theme-editor.logic.ts`, `theme-builder.logic.ts`); reusing `--lp-highlight-bg` or a `color-mix()` on `--file-explorer-primary` avoids that.
- E2E: `search.spec.ts` asserts row presence by `[data-search-result]` + `hasText: 'Roadmap'` (`:23-29`); stripping must not remove the note name. No visual test for `mark`.

Existing Issues touching the same behaviour: `209` (gutter for the calendar button, edits `SearchResult.svelte:175-178` plus `LinkItem.svelte`); no Issue covers snippet stripping or the highlight. Review P74 (other cluster) shares the stripper and P24 (keyboard model, other cluster) cites `SearchResult.svelte:137`.

Docs: `help/documentation/06-search-and-navigation.md` ("Search Results" section, lines ~125-133) describes "file name, snippet with highlighted terms, relevance score". Needs an edit if the subtitle becomes folder + heading, since the help text claims a "relevance score" that FTS cards do not show (only semantic shows a percent).

Open questions (owner): which highlight colour (reuse `--lp-highlight-bg`, a derived primary tint as in the prototype, or a new theme token with theme-editor and snapshot work). The review says "a theme token"; a literal reading means a new one.

---

## P161. Search operators and the fuzzy toggle are undiscoverable

**Still real: yes.**

Current code:
- Empty state: `SearchPanel.svelte:117-118`, "Type to search across all files". No mention of `tag:`/`path:`.
- Fuzzy toggle: `SearchPanel.svelte:163-169`, a `~` button, only in Text mode, `title` = "Fuzzy matching enabled/disabled", no `aria-label`, no `aria-pressed`. A `title` is the only accessible name signal; the visible label is the tilde.
- Operators are documented only in `help/documentation/06-search-and-navigation.md:139-144` ("Search Operators") and the fuzzy toggle at `:127-129`. Both are accurate for Text mode. Neither doc nor panel says the operators are ignored in Semantic/Hybrid (Issue 160 is the code side).
- Placeholder: `Search vault...` (`:157`).

Fix shape: hint line in the empty state ("Try `tag:work` or `path:Projects`"), shown only in Text mode (operators are inert elsewhere, until 160), `aria-label="Fuzzy matching"` + `aria-pressed={fuzzyEnabled}` on the `~` button, keep the `title`. Review notes "No recent queries" (not proposing them).

Tests: `SearchPanel.test.ts:195-199` asserts the exact text "Type to search across all files" (keep it as a substring; adding a second line is compatible). No test for the fuzzy toggle UI; `search.service.test.ts:484` covers `fuzzy` passed to `search_fts`, and `search.store.test.ts` covers `setFuzzyEnabled`. E2E: no fuzzy test.

Existing Issues touching the same behaviour: `160` (tag click mode), `161` (different thing: Rust fuzzy candidates), `045` (operator + cap correctness; the hint advertises operators, 045 makes them reliable on large vaults: worth landing before or alongside, but not a hard block). `205` would turn the empty state into a primitive, but keeps "Type to search across all files" as plain text, which is the natural home for the hint.

Open questions: none. (Hint copy and whether to hide it in Semantic/Hybrid are implementation choices; recommend hiding it there.)

---

## P162. Search panel markup and async status changes are silent to assistive tech

**Still real: yes** (the review's own validation: "revise, no global announce helper").

Current code:
- Input: `SearchPanel.svelte:154-162`, `type="text"`, placeholder only, no `aria-label`.
- Mode buttons: `:86-94`, no `aria-pressed`, no group role/label; the active one is only styled.
- Result button (`SearchResult.svelte:136-173`) contains `<div class="flex ...">` (row 1) and two `<p>` (rows 2-3). Block elements inside `<button>` are invalid HTML (phrasing content only).
- Status text ("Searching...", "N results", "No results found") is plain `<p>`, no live region. Nothing in `src/lib` is a shared announce helper; precedent for a local one: `TasksView.svelte:911` uses `role="status" aria-label="Refreshing tasks"` and the Tasks list has `aria-label`s throughout (resolved Issue `tasks-view-ux/113-keyboard-and-a11y.md`, which also set the project's own a11y conventions; read it before writing this ticket).
- The prototype's proposed markup: `role="group" aria-label="Search mode"` on the toggle, `aria-label="Search vault"` on the input (prototype lines 610-611, 666).

Fix shape: `aria-label` on input, `role="group"` + `aria-label` on the mode toggle with `aria-pressed` on each button, spans (`block`/`flex` classes) inside `SearchResult`'s button, and a `role="status"` wrapper around the "Searching.../N results/No results" text (cheap, local, covers the "async status changes" half of the title).

Tests: `SearchResult.test.ts:120-130` selects the subtitle via `querySelector('p')`: must change to a stable hook (`data-` attribute or class). `SearchPanel.test.ts` `modeButton(...)` helper and `.disabled` assertions (P59 overlap). No a11y assertion exists today for this panel; per CLAUDE.md rule 8, assert on rendered attributes (`getAttribute('aria-pressed')`). E2E: `search.spec.ts` uses `[data-rail-search-header] input` (not role/name), so adding `aria-label` is safe.

Existing Issues touching the same behaviour: none specific to search a11y. `tasks-view-ux/113` (resolved) is the precedent. Review P24 (keyboard model for lists; other cluster) cites `SearchPanel.svelte:35-38`; keep out of scope.

Open questions: none.

---

## Existing Issues index (Status as on disk)

| Issue | File | Status | Touches |
|---|---|---|---|
| 045 | `open-itens/issues/045-text-search-tag-path-returns-every-note.md` | ready-for-agent | `search.service.ts:199-223` operator filtering after cap (no UI) |
| 057 | `open-itens/issues/057-clearing-search-box-while-search-still-running.md` | ready-for-agent | `performSearch` empty branch + `SearchPanel.svelte:115-118` |
| 160 | `open-itens/issues/160-tag-click-lists-notes-that-tag-even.md` | ready-for-agent | `open-search.service.ts`, hybrid/semantic ignore operators |
| 161 | `open-itens/issues/161-fuzzy-search-finds-close-spelling-wherever-sits.md` | ready-for-agent | Rust fuzzy only; unrelated to P161 despite number |
| 204 | `open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` | ready-for-agent | creates `EmptyState`/`InlineAlert`/`Badge` (also a "Badge" primitive: relevant to P58's chip) |
| 205 | `open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent | migrates `SearchPanel` "No results found"; `SearchSection` alerts |
| 209 | `open-itens/issues/209-search-results-link-rows-reserve-gutter-their.md` | ready-for-agent | `SearchResult.svelte:175-178` gutter, plus `LinkItem`, `LayoutSection` |
| 220 | `open-itens/issues/220-search-panel-stops-repeating-index-status-status.md` | ready-for-agent (owner decision 2026-11-06) | removes `SearchPanel.svelte:98-111`; adds `SearchStatus.test.ts` |
| 066 | `open-itens/issues/066-status-bar-note-count-follows-notes-created.md` | ready-for-agent | `indexStats` refresh (status bar), no panel UI |
| 114, 108 | `open-itens/issues/114-...`, `tasks-view-ux/issues/108-...` | resolved | mention the files only |

Ledger: `open-itens/ledger.md` shows 045, 057, 160, 161, 209, 220 as `todo`. `tasks-view-ux/issues/113`, `239` are resolved Tasks-view a11y/search work (precedent only).

No ADR decides any of these (`docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md` puts Search in the rail; 0011/0012 cover FTS5/ONNX storage). `docs/SEARCH.md` documents modes and the hybrid pipeline; it says nothing about the 3-char floor or the badge. No help text records a deliberate choice for "Both" or the unlabeled `~`.

Help/docs edits implied: `help/documentation/06-search-and-navigation.md` (Search Results card description; note that Semantic/Hybrid need 3+ characters and are off until enabled in Settings > Search; optionally mention the hint).

---

## Suggested tickets

**Ticket A: Search result card (P58 + P158, plus P162's markup half)**
- Scope: `SearchResult.svelte`, the hybrid adapter in `search.service.ts:161-170`, optional `source` on `HybridSearchResult`, a new pure `src/lib/utils/<strip-markdown>.ts` (+ test), `mark` rule in `src/app.css`, help text.
- Why together: same component, same two test files (`SearchResult.test.ts`, `search.service.test.ts:254`), and P162's block-in-button fix is in the same markup that P58/P158 rewrite. Doing the spans separately would force two passes over the same `SearchResult.svelte` template and the same `querySelector('p')` test.
- Prefactor inside the ticket (first commit): the stripper as a pure util with its own tests, written to be reused by P74 (other cluster). If the P74 ticket exists, make the stripper a standalone small ticket and have both depend on it; otherwise keep it inside A.
- Size: M. One fresh context is enough (about 6 source files + 3 test files).
- Sequencing: do before or after 209 consistently (both edit the bottom of `SearchResult.svelte`); do not run in parallel.

**Ticket B: Search panel states and labels (P59 + P161 + P162 panel half)**
- Scope: `SearchPanel.svelte`, `search.store.svelte.ts` (error + short-query/disabled-reason state), `search.service.ts` (record the failure instead of only logging, hybrid/semantic/FTS), tooltip with Settings link, hint line, `aria-label`/`aria-pressed`/group on input, mode buttons and `~`, `role="status"` wrapper; tests in `SearchPanel.test.ts`, `search.store.test.ts`, `search.service.test.ts`; one E2E for the disabled-mode tooltip; help text.
- Why together: P59, P161 and P162 all edit the same three regions (mode buttons `:85-95`, empty-state branch `:115-120`, input + `~` `:154-169`) and the same test file; separate tickets would collide on every line.
- Size: M-L. If it feels too large for one context, split as **B1 = P161 + P162 panel labels/hint (S)** then **B2 = P59 states (M, blocked by B1)**. B1 first because it only adds attributes and one hint line, and B2 then edits the same branches with the labels already in place.
- Blocked by (recommended, not hard): 057 (same `isSearching` branch and `performSearch` head) and 220 (deletes the block between mode buttons and results). Both are small and ready-for-agent. 204 is optional: if it lands first, B uses `EmptyState`/`InlineAlert`; if not, B ships plain markup and 205 converts it later (205 already plans to). Decide before launching.
- Interplay to flag in the ticket text: 160 (operator hint is only true in Text mode until it lands) and review P08(1) / P30 (other clusters) which overlap P59's error state and the `isSearching` branch; only one ticket should own the store error field.

**Not grouped / out of scope for this cluster:** 045, 160, 161(Rust fuzzy), 205, 209, 220 stay as their own Issues. Nothing here needs Rust changes.

Order if all run: 057 and 220 (existing) -> B1 -> B2 -> A (or A in parallel with 057/220/B1 only if the editor of `SearchResult.svelte` differs from the editor of `SearchPanel.svelte`; A and B1/B2 share only the `querySelector('p')` test fixture, so they can run in parallel if 209 is not in flight).

## Owner-only questions (consolidated)

1. Highlight token: reuse `--lp-highlight-bg` / a derived primary tint (no theme-editor or snapshot churn), or a new first-class theme token (touches `theme-snapshot.test.ts.snap` and the theme editor)?
2. Badge removal: hide the badge on hybrid cards entirely (recommended; the Rust path no longer knows the source), or compute a real source some other way (would need a Rust contract change, `#[ts(export)]`, bindings regen)?
3. Short query in Hybrid: show "Type at least 3 characters" (review) or fall back to Text results for 1-2 chars?
4. Disabled modes: confirm the tooltip leads with "Semantic search is off. Turn it on in Settings > Search" (default state) and the model-not-installed message second.
5. 204/205 ordering: should the new empty/error states in B wait for the primitives?

## Not checked

- No browser run: `mark` default styling is inferred from the absence of a rule and the screenshot; not verified in the real app.
- Did not read `docs/agents/*-rules.md` (neither applies: no live preview or indexing/watcher change).
- Rust command behaviour read from source only, nothing executed. Test names are from `grep`, not run.
