# Verdict: Right sidebar links and TOC cluster (P71, P74, P75, P115)

Adversarial check of `scout-rs-links-toc.md` against HEAD `ab143a411`. Read-only. I opened every cited source line, the four proposals in `review.md`, the prototype sections (`right-sidebar.html` :436-472, :807, :990, :1090-1172, :1254-1263), open-itens 014, 046, 205, 209 and their ledger rows (:51, :83, :221, :225, all `todo`), the sibling scouts `scout-rs-relationships.md`, `scout-rs-properties-layout.md` and `scout-nl-empty-states.md`, the help pages, `docs/agents/indexing-watcher-rules.md` and the ADR index. I grepped `.scratch` (archived excluded) for the panel, store, service and TOC file names.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P71 | yes | `BacklinksPanel.svelte:33-39` and `OutgoingLinksPanel.svelte:29-35` collapse and `store.reset()` on a path change while expanded. `+layout.svelte:129` fetches linked mentions 150 ms after every switch, panel open or not. The 014 stale skip is real: `backlinks.service.ts:143` and `outgoing-links.service.ts:68` skip on a per-path history while each store holds one path-less list. Commit `77c8cbcda` made the collapse deliberate, help `07-sidebar-panels.md:74,92` documents it. |
| P74 | yes | `OutgoingLinksPanel.svelte:65-70` one line `alias ?? target` + `› heading`, no tooltip. `LinkItem.svelte:22,25` both `truncate`, `:29` raw text. `backlinks.logic.ts:21` sets `linkStart = linkEnd = 0`, so the highlight branch `:26-27` never runs in production. `entry.rs:376-398` `compute_snippet` is the note's leading 280 bytes with every line joined by ONE SPACE. |
| P75 | yes | `OutgoingLinksPanel.svelte:73-80` `div.opacity-60`, red, no handler. `index.rs:157-158` returns `None` for an empty target and the index only holds notes, so embeds and `[[#H]]` are "broken" today (046). |
| P115 | yes | `TableOfContentsPanel.svelte:62` decorative `ChevronRight`; no `aria-current`, no current-heading state in `toc.store.svelte.ts`; no heading command in `commands.ts`. The tab-switch collapse (`:11-32`) is deliberate (`80ee3491a`: "coming back finds the section collapsed, as before") and the review's validation says so. |

## Where the scout is wrong or incomplete

1. **The P75 create route is wrong, and its recommended fix breaks the layer test.** The scout recommends `openOrCreateNote` and, as a follow-up, "move `markdownTarget` and the create flow into `core/note-creator`". The editor's flow (`app/editor-host.ts:152-172`) routes periodic targets through `periodicTarget`, which imports `plugins/periodic-notes` (`editor-host.ts:33-34, 54-59`). Moving it into `core/` is a new core -> plugins edge, and `layer-rules.test.ts` fails on any new violation (the baseline holds only three `utils/` edges). Plain `openOrCreateNote` creates `[[2026-11-17]]` as a root note instead of the daily note, and the owner uses periodic notes. There is a layer-safe route the scout missed: `core/markdown-editor/editor-host.ts:104` exports the `editorHost` facet, and `core/.../live-preview/wikilink-navigation.ts:17-22` exports `followWikilink(host, target, anchor)`, which resolves or creates exactly as an editor click does (periodic routing, `.md`, unorganized flag, error -> `false`). The panel reads `editorStore.editorView?.state.facet(editorHost) ?? NOOP_HOST` in the click handler (precedents for reading `editorStore.editorView` from features: `note-writer.service.ts:69`, `file-history.service.ts:90`). No `app/` import, one create rule.
2. **"An attachment row opens the file" (046 criterion, scout T3 criterion 6) cannot pass.** `openFileInEditor` rejects binaries with `toast.error('Cannot open binary file in the editor: ...')` (`editor.service.ts:158-162`). After 046 resolves `![[photo.png]]`, the resolved-row click (`OutgoingLinksPanel.svelte:63`) would show that error. `followWikilink` silently ignores binaries (`wikilink-navigation.ts:18`). The criterion must say what a binary row does (recommended: drawn as resolved, not red, and not a button).
3. **Scroll-spy as specified marks the wrong heading after every TOC click.** The prototype probes `scrollTop + 24` and scrolls the clicked heading to the top (`right-sidebar.html:1121-1124`). The app does not: `openNoteAt` hands off to `MarkdownEditor.svelte:590-612`, which dispatches `EditorView.scrollIntoView(pos, { y: 'center' })`. The clicked heading lands mid-viewport, so a top probe selects the heading above it as soon as the click's own scroll events arrive. The scout's design point 5 calls this a last-heading edge case. It happens on nearly every click, and its criterion 4 ("clicking a row marks it current immediately") passes in jsdom (where `openNoteAt` is mocked and nothing scrolls) while the real app shows the wrong row. Fix: probe at the viewport's vertical centre, the same line `openNoteAt` targets, and prove it in E2E by clicking a mid-note heading.
4. **The "no listener while collapsed" criterion is vacuous, and the jsdom claim is wrong.** "Assert `aria-current` absent" while collapsed passes because a collapsed section renders no rows at all, whether or not a listener runs. The scout says the bridge "cannot be proven by a unit test without mocking the view". 29 test files already build a real `EditorView` in jsdom (`src/tests/lib/core/markdown-editor/test-helpers.ts`). The panel test can install one with `editorStore.setEditorView(view)`, dispatch `scroll` on `view.scrollDOM` and assert that `tocStore` changes only while expanded and stops after collapse and unmount. `lineBlockAtHeight` exists in the installed `@codemirror/view` 6.43.15 (`index.d.ts:917`).
5. **`markdownToPlainText` alone leaves most snippet markdown in place.** It strips block markers per line (`markdown-plain-text.ts:13-21, 41-43`), but Rust has already joined every line with a space (`entry.rs:383-386`, mirrored by the E2E mock `vault-index.ts:89-98`). Only the very first `#` is at a line start. In `# Roadmap Intro ## Goals - [ ] Ship [[Welcome]]`, the `##` and `- [ ]` survive. The scout's criterion 1 fixture has its only block marker at position 0, so it passes while the problem stays. A Rust fix (join with `\n`) is not free: `EventBlock.svelte:39` takes `snippet.split('\n')[0]`, `EventPopover.svelte:177` shows the snippet, and the snippet is cached on disk. Recommended: a small pure helper in `backlinks.logic.ts` that runs `markdownToPlainText` and then removes the heading (`#{1,6} `) and task-box (`[-*+] [ ] `) markers that follow a join space, with a fixture in the real Rust shape. Plain ` - ` hyphens stay, because they also occur in prose.
6. **The positioned-snippet criterion is speculative.** Scout T2 criterion 3 makes `LinkItem` strip `before` and `after` separately for a highlight branch that production never reaches (`backlinks.logic.ts:21`). That is code for the deferred T6. Leave the positioned branch as it is (`LinkItem.test.ts:74` stays green unchanged) and strip only the branch that runs.
7. **The open flag cannot be "cleared by the store's reset".** Scout T1 criterion 7 puts the flag in the store and clears it in `reset()`. Design point 2 then calls `store.reset()` on every switch while open, which would collapse the panel on exactly the event P71 is about. `+layout.svelte:124` also calls `outgoingLinksStore.reset()` when the last tab closes. The TOC precedent keeps `expandedPath` out of `tocStore.reset()` (`toc.store.svelte.ts:23-26`). Simpler still: once the store records which path its data belongs to, the switch effect no longer needs a reset. It just fetches, and the panel hides data whose path is not the active one.
8. **One path record does not cover Relationships.** `relationshipBacklinks` is written by a different fetch (`backlinks.service.ts:177-186`) at a different time from the layout's linked-mentions prefetch. If you collapse on A, switch to B and expand, linked mentions show B (prefetched, path matches) next to A's relationships until B's relationship fetch returns. `scout-rs-relationships.md:46` flags the same window. Each list needs its own path record, or the panel shows Relationships only when their own path matches.
9. **The shared `{#if}` chain is not a trivial rebase.** The scout says P72 edits the template and P71 the script. But scout T1 criterion 6 (no "No backlinks found" while B is pending) rewrites the `:61-62` branch, which is the line rs-relationships T1 (P72) rewrites to account for relationships. The scout also missed `scout-nl-empty-states.md` T2, which rewrites the "Not available" branch of all three panels (`BacklinksPanel.svelte:57-58`, `OutgoingLinksPanel.svelte:53-54`, `TableOfContentsPanel.svelte:47-48`). Open-itens 205 rewrites the same empty `<p>`s. All four edit one chain, so they need an explicit order.
10. **Scout T2 and T3 split one block across two tickets.** Both rewrite `OutgoingLinksPanel.svelte:58-82`: T2 the resolved branch, then T3 the whole `{#each}` into two groups, rewriting what T2 just wrote. Below, the outgoing row work is regrouped into one ticket and the backlinks row into another.
11. **The shared row component is not justified.** The two rows differ (snippet and calendar action vs heading sub-line and Create pill). The only logic worth sharing is pure (title, sub-line and tooltip from a target), and it belongs in `outgoing-links.logic.ts`. Drop the component (CLAUDE.md, simplicity).
12. **The 209 gutter as written costs 28 px on every row.** `pr-7` on every LinkItem truncates every title earlier to make room for a button that renders only for event notes (`ShowInCalendarButton.svelte:64`). Make the action a flex sibling of the title line instead of `absolute right-1 top-0.5` (`LinkItem.svelte:34`). Then it takes space only when it renders.
13. **Missed help and test pins for the TOC and the command.** `help/documentation/16-table-of-contents.md` exists (the scout did not search for it): `:11` describes the collapse, `:18` the click. `commands.test.ts:151` pins exactly 43 built-in commands, so adding "Go to heading" breaks it and the count must change on purpose. The command lists in `06-search-and-navigation.md:73` and `20-keyboard-shortcuts.md:120` need the row. "Go to Search", "Go to Inbox" and the other `Go to <rail item>` commands already live in category `Navigation` (`commands.ts:69-70`), so the palette will list them together.
14. **Aligning the TOC breaks more pins than the scout lists, and its default goes against the review.** Besides `TableOfContentsPanel.test.ts:77` and the E2E `table-of-contents.spec.ts:20-31`, alignment also flips `:92` ("comes back collapsed after it unmounts open"), the `onDestroy` reset (`:29-32`) and `toc.service.test.ts`, which pins `expandedPath`. `review.md` P115 validation reads "revise. The collapse on tab switch is deliberate", and the prototype calls it "an owner decision". The scout's reason (no IPC to protect) is half right: `77c8cbcda` also cites CPU, and an open TOC reparses on every keystroke (`:34-39`). That cost is small and it is the same while open today. So alignment stays an owner-gated criterion, and the ticket ships "keep" without an answer.
15. **`+layout.svelte` writes the stores directly.** `:122-124` calls `backlinksStore.setLinkedMentions([])`, `setUnlinkedMentions([])` and `outgoingLinksStore.reset()`. If T1 changes setter signatures to carry a path, these lines change too. The scout lists `+layout.svelte` only for its comment.
16. **The P71 open-state mechanism should match P43.** `scout-rs-properties-layout.md:44,116-124` recommends a persisted layout boolean (`propertiesCollapsed`, read with `=== true`) for Properties. The scout recommends an in-memory flag for Backlinks and Outgoing. Two mechanisms for the same "remember open or closed" in one sidebar is avoidable. Recommended: whatever the owner picks for P43, here too. With P43's default, that is `backlinksExpanded` and `outgoingLinksExpanded` in `LayoutSettings`. It also covers sidebar hide and show for free, and it shares a key list with rs-properties-layout T1 and claude-code-integration 03 (a textual conflict only).
17. **Smaller drift.** The Backlinks template is `:54-106`, not `:54-102`. The TOC action bar wiring is `EditorView.svelte:69` (`NoteActionBar.svelte:98` is the button). The E2E vault has no note with a missing link (`e2e/fixtures/test-vault.ts:5-12`), and `Welcome.md` is pinned by other specs, so a broken-link E2E needs a new fixture note. Root-level notes: precedent says omit the folder line (`SearchResult.svelte:64-67`, `QuickSwitcher.svelte:131`). That settles the scout's open point.
18. **Cost of the 014 fix.** Once the skip means "the store holds this path at this version", A -> B -> A browsing issues one `get_backlinks_v2` per switch. Today the return to A is skipped, wrongly. That is one indexed lookup (`index.rs:760-770`), so accept it and say so in the ticket.

Checked with no further overlap: open-itens 020 (watcher indexes; cites `backlinks.service.ts:112-117` `rebuildIndex`, other lines), 162 (queryjs `file.inlinks`), 210 (owned by rs-properties-layout). `tasks-view-ux` scouts cite these panels only as style precedents. `finders-ux` 01-16 are all resolved. No ADR conflicts: ADR-0006 (`untrack` for the fetch in the switch effect), ADR-0034 (any computed getter gets a test) and ADR-0003 (no `#lib/app/` from features) are respected by the tickets below.

## Ticket breakdown

Order: T1 -> T3 -> T4 (shared `outgoing-links.service.ts` and `OutgoingLinksPanel.svelte`). T2 can start any time. T5 and T6 are independent of the links tickets and of each other. Cross-cluster sequencing: rs-relationships T1 (P72) before T1, because both edit the `BacklinksPanel.svelte:57-63` branch chain. nl-empty-states T2 and open-itens 205 rebase onto whichever lands first. Gate for all: frontend only (`pnpm check` + `pnpm vitest run`). T1 and T4 to T6 also add E2E (`bash scripts/e2e.sh`).

### T1. Backlinks and Outgoing links stay open across note switches and always show the open note's links (P71, M, replaces open-itens 014)

**What to build:**
- The open flag survives a note switch and a sidebar hide and show (mechanism per owner Q1: by default a layout boolean like P43's, read with `=== true`). It is never cleared by a store's `reset()`.
- On a path change while open, the panel calls `fetchData()` under `untrack`, with no store reset. While closed, the panel fetches nothing. The layout prefetch at `+layout.svelte:129` stays.
- Each store records the path its data belongs to: one record per list (`linkedMentions`, `relationshipBacklinks`, `outgoingLinks`). The skip in both services fires only when the store currently holds this path at this version (this version and content length for outgoing), replacing the per-path Maps (014's fix direction). The store's `reset()` and every write keep the record in step.
- Each panel renders a list only when its recorded path equals `editorStore.activeTabPath`. While it does not, the body is empty: no rows, no "No backlinks found".
- Update `help/documentation/07-sidebar-panels.md:74,92` and the `+layout.svelte:91-104` comment. `+layout.svelte:122-124` follows any setter change.

**Blocked by:** rs-relationships T1 (P72), sequencing only. rs-properties-layout T1, only if the open flag becomes a layout key (same key list and fixtures).

- [ ] Failing test first, `backlinks.service.test.ts` (real stores, mock only `@tauri-apps/api/core`, 014 criterion 1): at a fixed `vaultIndexVersion`, `fetchBacklinksV2(A)`, then `fetchBacklinksV2(B)` with `activeTabPath` following, then back to A and `fetchBacklinksV2(A)`. `linkedMentions` holds A's entry. Also: after `backlinksStore.reset()`, the same call refills A (014 criterion 3).
- [ ] Failing test first, `outgoing-links.service.test.ts` (014 criterion 2): after `outgoingLinksStore.reset()`, `fetchOutgoingLinksV2(A, content)` at the same version and length refills A's links.
- [ ] `BacklinksPanel.test.ts`: expanded on A, `editorStore.addTab(B)`, `flushSync`. The section is still `data-state="open"`, and `fetchBacklinksV2` and `fetchRelationshipBacklinks` were called with B. Same in `OutgoingLinksPanel.test.ts` with `(B, B's content)`. Both fail today.
- [ ] `BacklinksPanel.test.ts`: real store seeded with A's linked mentions and relationships (recorded for A), active tab B, panel expanded with B's fetch pending. Neither A's mention nor A's relationship row renders, and the text "No backlinks found" is absent. Then the closed-switch-open case: collapsed on A, switch to B, expand. A's relationship row does not render before B's relationship fetch resolves.
- [ ] The open flag survives `unmount` and remount of the panel, and `backlinksStore.reset()` / `outgoingLinksStore.reset()` do not clear it (store or settings test per Q1, real store).
- [ ] Collapsed on A, switch to B, bump the version: the panel's own fetches are not called (existing "does not fetch while collapsed" cases at `BacklinksPanel.test.ts:62` and `OutgoingLinksPanel.test.ts:61` stay green).
- [ ] Burst-save and guards stay green (014 criteria 4 to 6): two calls for one path and version issue one IPC (`backlinks.service.test.ts` about :478, `outgoing-links.service.test.ts` about :216). A version bump, a content-length change and `resetBacklinks` / `resetOutgoingLinks` still refetch. The active-path guard drops a result whose tab changed mid-IPC and does not record it.
- [ ] Every new store getter has a store test (ADR-0034).
- [ ] E2E `sidebars.spec.ts`: expand Backlinks on Roadmap, open Welcome, and Welcome's backlink entries show with no second click. The two existing cases (:35, :51) stay green.

### T2. Backlink rows: folder line, plain two-line snippet, path tooltip, calendar action beside the title (P74 backlinks half, S, replaces the LinkItem half of open-itens 209)

**What to build:** `LinkItem.svelte`:
- Line 1 is the source name. A muted line 2 shows `entryFolder(vaultStore.path, sourcePath)` (`file-entries.logic.ts:38`), omitted at the vault root.
- The button gets a `title` with the vault-relative path.
- The unpositioned snippet goes through a new pure `backlinkSnippetText(snippet)` in `backlinks.logic.ts` (`markdownToPlainText`, then removal of `#{1,6} ` and `[-*+] [.] ` markers after a join space; see finding 5). It is clamped with `line-clamp-2` instead of `truncate`. The positioned branch (`:26-27`) is unchanged.
- `ShowInCalendarButton` moves from `absolute right-1 top-0.5` to a flex sibling of the title line, so it takes space only when it renders.

**Blocked by:** none (T1 does not touch `LinkItem.svelte`).

- [ ] Failing test first, `backlinks.logic.test.ts` (pure, no mocks): `backlinkSnippetText('# Roadmap Intro ## Goals - [ ] Ship [[Projects/Welcome|Start]] and **bold**')` is `Roadmap Intro Goals Ship Start and bold`. `'a - b'` keeps its hyphen. An empty string gives `''`.
- [ ] `LinkItem.test.ts` (real stores, mock only `editor.service` and Tauri): a `Projects/Roadmap.md` source shows `Roadmap` on line one and `Projects` on line two. A root note has no second line. The button `title` is `Projects/Roadmap.md`, and the snippet `<p>` has `line-clamp-2` and not `truncate`.
- [ ] `LinkItem.test.ts:74` (positioned highlight) stays green unchanged.
- [ ] `LinkItem.test.ts`, with the event fixture of `:99`: the calendar action is not `absolute`, sits in the title line's flex row after the name, and still opens the day. For a non-event source, no extra element renders in that row (`:94` stays green).
- [ ] E2E `sidebars.spec.ts:35-49` (`/^Welcome/`, `/^2026-Q2/`, count 2) stays green unchanged.

### T3. Outgoing links: only missing targets are unresolved (open-itens 046 scope, S, replaces open-itens 046)

**What to build:** in `outgoing-links.service.ts`, after the IPC:
- A link with an empty target and a heading resolves to the note itself.
- Any other unresolved target resolves against the file tree with the editor's rule (`resolveWikilinkCached` + `buildResolutionCache` over `flattenFileTree(fsStore.fileTree).filter(isLinkTargetFile)`).
- `deduplicateByTarget` keys on lowercase target plus heading.

Recommended: move `treeLinkIndex()` (`app/editor-host.ts:75-84`, which depends only on core) into a core module, so the editor and the panel share one per-tree cache and cannot disagree again. `editor-host.ts` then imports it. This scope matches the owner's 2026-11-06 frontend-only ruling on 046. No Rust change. Help `07-sidebar-panels.md:90` stays true ("target note does not exist").

**Blocked by:** T1 (same service file).

- [ ] Failing test first, `outgoing-links.service.test.ts` (real `fsStore` / `vaultStore`, mock Tauri; 046 criterion 1): IPC returns `photo.png`, `{target:'', heading:'Action Items'}` and `Missing`, all unresolved, with `photo.png` in the real `fsStore.fileTree`. After the fetch, the first two have a `resolvedPath` (the image and the note itself), and only `Missing` is unresolved.
- [ ] `[[#One]]` and `[[#Two]]` give two rows; `[[Note#A]]` and `[[Note#B]]` give two rows.
- [ ] If `treeLinkIndex` moves: its existing coverage through the editor-host tests stays green, the moved module has a unit test, and `layer-rules.test.ts` passes.
- [ ] A missing note stays unresolved (`OutgoingLinksPanel.test.ts:124` stays green).

### T4. Outgoing link rows: two lines, path tooltip, and a "Broken links" group whose rows create the note (P74 outgoing half + P75, M)

**What to build:**
- Pure helpers in `outgoing-links.logic.ts` (currently an empty stub):
  - `outgoingLinkLabel(link)` returns `{ title, sub, tooltip }`: title `alias ?? basename(target)`, or the heading for a same-note link; sub `dirname(target) › heading`, omitting empty parts; tooltip `target#heading`.
  - `partitionOutgoingLinks(links)` returns `{ resolved, broken }` in order.
- `OutgoingLinksPanel.svelte` renders the resolved rows (two lines), then, when there are any, a "Broken links" label with a count, then one button per broken row (alert icon, no `opacity-60`, a "Create" pill, `title="Create <target>.md"`).
- Clicks go through the editor host, as an editor click does: `followWikilink(editorStore.editorView?.state.facet(editorHost) ?? NOOP_HOST, target, { heading, blockId: null })`.
  - A broken row creates the note (periodic routing and the unorganized flag included) and opens it.
  - A resolved `[[Note#H]]` opens the note at H, which also covers same-note heading rows.
  - A binary attachment row (`isBinaryFile`) is drawn as resolved and is not a button.
- A `false` result from `createNote` shows `toast.error` and leaves `outgoingLinksStore` untouched.
- Help `07-sidebar-panels.md:90` describes the group.

**Blocked by:** T1, T3.

- [ ] Failing test first, `outgoing-links.logic.test.ts` (pure): `outgoingLinkLabel({target:'Projects/Roadmap', alias:null, heading:'Goals'})` is `{title:'Roadmap', sub:'Projects › Goals', tooltip:'Projects/Roadmap#Goals'}`. With an alias, the title is the alias. `{target:'', heading:'Tasks'}` titles `Tasks`. A root target has no folder in `sub`. `partitionOutgoingLinks([])` gives two empty lists, and order is kept.
- [ ] `OutgoingLinksPanel.test.ts` (real stores; a real `EditorView` built with `editorHost.of(host)`, where `host` is a stub port, set via `editorStore.setEditorView`): broken rows render after the resolved rows under "Broken links" with count 2, each a `button` without `opacity-60`. A note with none renders no label. `:124` is rewritten on purpose for the new markup.
- [ ] Clicking broken `[[Folder/New]]` calls `host.createNote('Folder/New', ...)`. Clicking a resolved `[[Roadmap#Goals]]` calls `host.openLink(<abs Roadmap>, { heading: 'Goals', blockId: null })`. A `createNote` resolving `false` shows the error toast, and `outgoingLinksStore.outgoingLinks` is unchanged.
- [ ] A row whose `resolvedPath` is a `.png` is not a button and is not red.
- [ ] E2E `sidebars.spec.ts`: `:51-61` is updated to the new accessible name (`Roadmap`, sub-line `Projects`). New case: a new fixture note (not `Welcome.md`) with `[[Nowhere]]` shows it under "Broken links". Clicking it creates `Nowhere.md` through the mocked `create_note` (`tauri-core.ts:74-80`) and opens it.

### T5. TOC: no decorative chevrons, current heading follows the editor (P115 scroll-spy part, M)

**What to build:**
- Remove the per-row `ChevronRight` (`TableOfContentsPanel.svelte:62`) and re-tune `padding-left` and `.toc-indent-lines` so level-1 text lines up with other sidebar text.
- Pure `headingIndexAtLine(headings, line)` in `toc.logic.ts` compares by `heading.line` (zero-based, CRLF-safe), not `pos`.
- `tocStore` gains the probe line, with a getter, a setter and a reset.
- A bridge in the panel: an `$effect` on `editorStore.editorView` and `expanded`, a passive `scroll` listener on `view.scrollDOM`, throttled with `requestAnimationFrame`, removed on collapse and destroy. It writes the doc line at the viewport's vertical centre (`view.lineBlockAtHeight(scrollTop + clientHeight / 2)`, line number - 1), or the last line when scrolled to the bottom. Centre, not top, because `openNoteAt` centres the target (finding 3).
- Rows get `aria-current="true"` (tint, primary colour, semibold, inset left bar per the prototype CSS). A click also sets the current heading at once. `title={heading.text}` stays (`table-of-contents.spec.ts:17` depends on it).
- Help `16-table-of-contents.md` gets the current-heading cue.
- Only on owner Q4 "align": the open state stops being per note (a boolean in place of `expandedPath`; no clear on tab switch or destroy), `showTableOfContents` sets it, and help `16-table-of-contents.md:11` changes.

**Blocked by:** none. The "Not available" branch `:47-48` is shared with nl-empty-states T2 (rebase).

- [ ] Failing test first, `toc.logic.test.ts` (pure): `headingIndexAtLine` returns the last heading whose `line <= line`, `-1` before the first heading and for `[]`, and the last index past the end.
- [ ] `TableOfContentsPanel.test.ts`: heading rows contain no `svg.lucide-chevron-right`, the section chevron (`data-sidebar-section-chevron`) remains, and every row keeps `title`. Fails today.
- [ ] `TableOfContentsPanel.test.ts`: after `tocStore.setProbeLine(n)`, exactly one row has `aria-current="true"`, and it moves with `n`. Clicking a row marks it current.
- [ ] `TableOfContentsPanel.test.ts` with a real jsdom `EditorView` installed through `editorStore.setEditorView`: a `scroll` event on `view.scrollDOM` writes the probe line only while expanded. After collapse, and after unmount, it no longer does.
- [ ] `toc.store.test.ts`: the probe-line getter, setter and reset.
- [ ] E2E `table-of-contents.spec.ts` with a new long fixture note (8 or more headings): click a mid-note heading in the TOC, and once the scroll settles that row has `aria-current="true"` (fails with a top probe). Scroll to the bottom, and the last heading is current.
- [ ] Owner decision recorded in Notes (Q4). On "align", rewrite `TableOfContentsPanel.test.ts:77` and `:92`, `toc.service.test.ts` (`expandedPath`) and the E2E "updates when switching files" (`:20-31`) on purpose: the TOC stays open on a tab switch and lists the new note's headings. On "keep", they stay as they are.

### T6. "Go to heading" command and picker (P115 command part, M)

**What to build:**
- A heading picker in `src/lib/plugins/table-of-contents/` (component plus a small open-state store). It is built on the `#lib/components/ui/command` primitives (finders-ux 01) and follows the precedents `TemplatePicker`, `OneOnOnePicker` and `ModActionPicker`. It is mounted in `AppOverlays.svelte` and opened by a new built-in command in `commands.ts`.
- It lists `extractTocHeadings(editorStore.activeTabContent)` in document order with an `H<level>` hint and filters by fuzzy match.
- Enter calls `openNoteAt(activeTabPath, { kind: 'offset', offset: heading.pos })`. This is the TOC click's rule, with the same CRLF limit as today.
- It works with the TOC section hidden or collapsed. With no active markdown tab, it toasts and does not open.
- Help: `06-search-and-navigation.md:73`, `20-keyboard-shortcuts.md:120` and `16-table-of-contents.md`.

**Blocked by:** none. Additive to `commands.ts` and `AppOverlays.svelte`.

- [ ] Failing test first, `commands.test.ts`: the command exists with the agreed id, label and category (Q5), and its action opens the picker (real store). `:151` changes from 43 to 44 on purpose.
- [ ] Picker test (real stores): with an active markdown tab, it lists the headings in order with their level, typing filters them, and an empty query lists all.
- [ ] Picker test, no mock needed: Enter sets `editorStore.pendingScrollPosition` to `heading.pos` (synchronous for the active note, `open-note-at.service.ts:38-48`) and closes. Escape closes without moving.
- [ ] No active tab, or a non-markdown tab: the action does not open the dialog and shows a toast.
- [ ] Works with `settingsStore.layout.tableOfContentsVisible` false.

## Dropped or deferred

- **P74 "window the snippet around the link":** deferred, not a ticket. The snippet is the leading 280 bytes (`entry.rs:376`), and the index keeps no body. A window needs a new read command and a ts-rs DTO (Both gate, `docs/agents/indexing-watcher-rules.md` item 1). Revisit only on an owner yes after T2 ships.
- **P71 count badge:** dropped by the review (eager fetch). Not revived.
- **P115 "chevrons collapse subtrees":** dropped in favour of removal (Q3).
- **The scout's shared link-row component:** dropped (finding 11).

## Open-itens Issues replaced

| Issue | Ledger | By | Notes |
|---|---|---|---|
| 014 | :51 `todo` | T1 | All six criteria carried. Its note that store resets bypass the services is handled by the store-held path record. |
| 046 | :83 `todo`, blocked by 014 | T3 (classification) + T4 (click behaviour) | Its "attachment row opens the file" criterion is revised (finding 2). |
| 209 | :225 `todo` | T2, LinkItem half only | `SearchResult.svelte:175-178` and the `LayoutSection` chevrons stay in 209 (amend it), or go to the cluster that owns them. |
| 205 | :221 `todo`, blocked by 204 | not replaced | Rebases on T1/T4/T5 empty-state markup, or they on it. |

## Owner questions

1. **P71 open state:** use the same mechanism as Properties (P43): persisted layout booleans, kept across notes, sidebar hide and show, and restarts? Or in memory only? (Recommended: the same as P43; with P43's default, persisted.)
2. **P75 click:** create and open the note, as an editor click on a missing link does? Or create, stay and toast, as the prototype does? (Recommended: create and open, through the editor host, so periodic links land in the periodic folder.)
3. **P115 chevrons:** remove, or make them collapse subtrees? (Recommended: remove.)
4. **P115 tab switch:** keep the TOC's per-note collapse (deliberate per the review), or keep it open across tabs like T1? (Recommended: align with T1 for one sidebar rule. Unanswered, T5 ships "keep".)
5. **"Go to heading" command:** label and category? (Recommended: `Go to Heading` in `Navigation`, next to the other Go to commands, with no default shortcut.)
6. **Attachment rows in Outgoing links:** non-interactive, or open with the system app (opener plugin)? (Recommended: non-interactive, as the editor does nothing on click either.)
7. **P74 link window (deferred):** worth a Rust command later? (Recommended: decide after using T2.)

## Not checked

- I did not run the app, the tests or E2E. The scroll-spy finding comes from reading `MarkdownEditor.svelte:590-612` (`y: 'center'`) and the prototype, and I did not observe it.
- I did not verify that reading `state.facet(editorHost)` from a jsdom `EditorView` works in the panel test harness. The facet is static and is read in a click handler, so it should.
- The `treeLinkIndex` move is a recommendation. I did not trace which tests reach it today beyond the editor-host imports.
- I did not open the screenshots in `.scratch/design-review/screens/`.
