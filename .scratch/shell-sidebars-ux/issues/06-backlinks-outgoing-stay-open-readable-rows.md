# 06: Backlinks and Outgoing links stay open, always show the open note's links, and backlink rows show folder and a plain snippet

**Origin:** design review 2026-11-17, proposals P71, P72, P74 (backlinks half) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (cards `#P71`, `#P72`, `#P74`), research `.scratch/shell-sidebars-ux/research/verdict-rs-links-toc.md`, `verdict-rs-relationships.md` and `breakdown.md` (old tickets 05, 11). Replaces `.scratch/open-itens/issues/014-backlinks-outgoing-links-always-show-open-note.md` (whole) and the `LinkItem` half of `.scratch/open-itens/issues/209-search-results-link-rows-reserve-gutter-their.md`; the `SearchResult.svelte:175-178` and `LayoutSection` chevron halves stay in 209.

**What to build:**

1. **Stay open.** An expanded Backlinks or Outgoing links section stays expanded when you switch notes, hide and show the sidebar, or restart, and shows the new note's links. Today both collapse and reset on every switch (`BacklinksPanel.svelte:33-39`, `OutgoingLinksPanel.svelte:29-35`, deliberate since `77c8cbcda`). Mechanism, the one ticket 05 uses for Properties: `backlinksExpanded` and `outgoingLinksExpanded` in `LayoutSettings` (`settings.types.ts:85-110`, `settings.store.svelte.ts:55-80`), read with `=== true`, never cleared by a store `reset()`.
2. **Fetch on switch.** On a path change while open, the panel calls `fetchData()` under `untrack`, with no store reset; while closed it fetches nothing. The layout prefetch at `src/routes/(app)/+layout.svelte:129` stays; `:122-124` follows any setter change. A -> B -> A issues one `get_backlinks_v2` per switch (one indexed lookup, `index.rs:760-770`); accept it.
3. **A -> B -> A is not empty.** Each store records the path its data belongs to, one record per list (`linkedMentions`, `relationshipBacklinks`, `outgoingLinks`). The skip in `backlinks.service.ts:143` and `outgoing-links.service.ts:68` fires only when the store holds this path at this version (and content length for outgoing), replacing the per-path Maps. A list renders only when its record equals `editorStore.activeTabPath`; otherwise the body is empty (no rows, no "No backlinks found").
4. **Relationships on their own.** In `BacklinksPanel.svelte`, derive `hasMentions` and `hasRels` in the component (`:61-62` checks only `linkedMentions`); each group renders only with rows, the Relationships `mt-2` (`:81`) only below the mentions group, and "No backlinks found" shows only when both are empty. The relationship label turns underscores into spaces and trims, one inline expression at `:96` (`depends_on_project` -> `depends on project`, `_group` -> `group`). No store getter, no Rust or DTO change.
5. **Backlink rows.** `LinkItem.svelte` shows the source note's name on line one and its folder on a muted line two (`entryFolder(vaultStore.path, sourcePath)`, `file-entries.logic.ts:38`; none at the vault root), the vault-relative path as the button `title`, and a snippet in plain text clamped to two lines (`line-clamp-2` replaces `truncate` at `:25`). New pure `backlinkSnippetText(snippet)` in `backlinks.logic.ts`: reuses `markdownToPlainText` (`src/lib/utils/markdown-plain-text.ts`), then removes `#{1,6} ` and `[-*+] [.] ` markers that follow a join space (Rust joins every line with one space, `entry.rs:383-386`, so only the first marker is at a line start; plain ` - ` hyphens stay). The positioned-highlight branch (`:26-27`, unreachable because `backlinks.logic.ts:21` sets `linkStart = linkEnd = 0`) is unchanged.
6. **Calendar action.** `ShowInCalendarButton` stops being `absolute right-1 top-0.5` (`LinkItem.svelte:34`), so it takes space only when it renders (no 28 px gutter on every row). It must stay a sibling of the entry `<button>`, never inside it: `ShowInCalendarButton.svelte:65` is itself a `<button>` and the entry button wraps the title row (`LinkItem.svelte:16-31`). Make the outer `div` (`:15`) a flex row holding the entry button (`flex-1 min-w-0`) and the calendar button side by side.
7. **Help.** `help/documentation/07-sidebar-panels.md:74,92` (stays open), `:76-78` (Relationships can appear without mentions and can list a note also under linked mentions), `25-types-and-relationships.md:248` ("underscores rendered as spaces", drop "leading"); the `+layout.svelte:91-104` comment.


Also remove the unused `Separator` imports at `BacklinksPanel.svelte:6` and `OutgoingLinksPanel.svelte:6` (review P174, part; found by `.scratch/ux-quick-wins/research/breakdown.md`).

Not in this ticket: a snippet window around the link (the snippet is the leading 280 bytes, `SNIPPET_MAX_LEN` at `entry.rs:24`, and the index keeps no body; a window needs a Rust read command and a ts-rs DTO); a count badge on collapsed headers (dropped by the review, it would restore the eager fetch removed in `77c8cbcda`); the outgoing rows (ticket 07); a shared link-row component.

**Blocked by:** 05

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh sidebars.spec.ts`

- [ ] Failing test first, `src/tests/lib/features/backlinks/backlinks.service.test.ts` (real stores, mock only `@tauri-apps/api/core`): at a fixed `vaultIndexVersion`, A then B then A leaves `linkedMentions` holding A's entry; after `backlinksStore.reset()` the same call refills A.
- [ ] Failing test first, `outgoing-links.service.test.ts`: after `outgoingLinksStore.reset()`, `fetchOutgoingLinksV2(A, content)` at the same version and length refills A.
- [ ] Failing test first, `BacklinksPanel.test.ts` and `OutgoingLinksPanel.test.ts`: expanded on A, `editorStore.addTab(B)`, `flushSync`: still `data-state="open"`, and the panel's fetches were called with B.
- [ ] Failing test first, `BacklinksPanel.test.ts` (real `backlinksStore`): expanded with one `belongs_to` relationship backlink and no mentions: no "No backlinks found", a "Relationships" trigger with count 1, the row's name and `belongs to`, no "Linked mentions" trigger; `depends_on_project` and `_group` render `depends on project` and `group` (exact `textContent`).
- [ ] Store seeded with A's mentions and relationships, active tab B, B's fetch pending: neither A row renders and "No backlinks found" is absent. Collapsed on A, switch to B, expand: A's relationship row does not render before B's relationship fetch resolves.
- [ ] The open flag survives `unmount` and remount, and `reset()` does not clear it (real store or settings). Every new store getter has a store test (ADR-0034).
- [ ] Unchanged: "does not fetch while collapsed" (`BacklinksPanel.test.ts:62`, `OutgoingLinksPanel.test.ts:61`); no list shows "No backlinks found" with `text-meta` (`:172-175`); mentions-only and both (`:177-197`); burst-save, version bump, content-length change, `resetBacklinks`/`resetOutgoingLinks` and the active-path guard (014 criteria 4 to 6).
- [ ] Failing test first, `backlinks.logic.test.ts` (pure): `backlinkSnippetText('# Roadmap Intro ## Goals - [ ] Ship [[Projects/Welcome|Start]] and **bold**')` is `Roadmap Intro Goals Ship Start and bold`; `'a - b'` keeps its hyphen; `''` gives `''`.
- [ ] `LinkItem.test.ts` (real stores, `editor.service` and Tauri mocked): a `Projects/Roadmap.md` source shows `Roadmap` then `Projects`; a root note has no second line; the button `title` is `Projects/Roadmap.md`; the snippet `<p>` has `line-clamp-2` and not `truncate`; `:74` (positioned highlight) stays green; with the event fixture of `:99` the calendar action is not `absolute`, is not nested in another button (`[data-show-in-calendar]`.parentElement.closest(`button`) is null), sits beside the entry button and still opens the day; a non-event source renders no extra element there (`:94` green).
- [ ] E2E `sidebars.spec.ts`: expand Backlinks on Roadmap, open Welcome, and Welcome's entries show with no second click; `:35-49` and `:51` stay green unchanged.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P71.** The Backlinks and Outgoing panels collapse on every note switch, with no counts. Keep the open or closed state across switches. While a panel is open, refetch for the new note; while closed, fetch nothing. Validation: revise, dropped the count badge.
- **P72.** Relationship backlinks are hidden when a note has no linked mentions. Show the empty state only when both lists are empty, and render each group on its own. Validation: keep.
- **P74 (backlinks half).** Sidebar link rows truncate the identifying text and show raw markdown snippets. Two-line rows: the title, then the folder or target and the heading in muted text, plus a path tooltip. Strip markdown from snippets and window them around the link with `line-clamp-2`. Validation: keep. (Outgoing half is ticket 07; the window is not built here.)
- **014 (absorbed).** Backlinks and Outgoing links always show the open note; all six criteria are carried above.
- **209 (absorbed, LinkItem half).** Search results and link rows reserve a gutter for their action buttons; the `LinkItem` gutter is replaced by item 6.

## Problem

Both link panels reset to collapsed on every note switch, so reading links while navigating costs two clicks per note. Going A -> B -> A can show "No backlinks found" for A, because the per-path skip fires while the store holds another path's list. A note with relationships but no linked mentions hides its relationship rows. Backlink rows truncate the source's identity and show raw markdown, and every row loses 28 px to a calendar button that renders only for event notes.

## Evidence

Checked at `ab143a411`.

- `BacklinksPanel.svelte:33-39` and `OutgoingLinksPanel.svelte:29-35` collapse and `store.reset()` on a path change while expanded; `+layout.svelte:129` fetches linked mentions 150 ms after every switch whether or not a panel is open; `+layout.svelte:122-124` writes the stores directly; `:91-104` the comment.
- `backlinks.service.ts:143` and `outgoing-links.service.ts:68`: the skip uses a per-path history while each store holds one path-less list. `relationshipBacklinks` is written by a different fetch (`backlinks.service.ts:177-186`), so each list needs its own path record.
- `BacklinksPanel.svelte:57-63` the `{#if}` chain, `:80-102` the Relationships block, `:96` the label (`replace('_', ' ')` replaces only the first underscore).
- Relationship backlinks are a subset of linked mentions in real vault data (the reverse index is built from every `[[...]]` in the file, frontmatter included, `entry.rs:252`, `parsing.rs:1063-1065`), so the relationships-only state is mostly reachable through the 014 bug; the template is wrong by construction either way.
- `LinkItem.svelte:20-34`: `truncate` at `:22,25`, raw `{snippet.text}` at `:29`, `absolute right-1 top-0.5` at `:34`. `entry.rs:376-398` `compute_snippet` joins every line with one space.
- `e2e/fixtures/test-vault.ts:5-12` and `Welcome.md` are pinned by other specs.

## Why blocked

- 05: (Right sidebar headers stay pinned with a Hide panel menu: the `LayoutSettings` key list and the `SidebarSection` structure; with an "in memory" answer to 06.1 the edge goes)

## Sequence with

`BacklinksPanel.svelte` and `OutgoingLinksPanel.svelte`: 05 (the `SidebarSection` call lines, blocker), 07 (blocked by this ticket, rewrites the outgoing body). Open-itens 205 rewrites the same empty `<p>`s: rebase onto whichever lands first. `src/routes/(app)/+layout.svelte`: 27 (`restoreZoom` call), 28 (menu listener mount). `LinkItem.svelte:10` and `BacklinksPanel.svelte:93` row `onclick`s: 33 (blocked by this ticket). `help/documentation/07-sidebar-panels.md` and `sidebars.spec.ts`: 05, 07. `claude-code-integration` 03 on `mvp-claude`: the `LayoutSettings` key list, a merge-time edit only.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 06.1 the open state is persisted layout booleans, the same mechanism as Properties in ticket 05 (with "in memory" the edge to 05 goes); 06.2 the TOC follows the same rule and stays open across note switches (ticket 08, default 08.2); 06.3 decide on a link-window snippet later, after using this ticket.
