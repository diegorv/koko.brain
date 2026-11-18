# Scout: Right sidebar links and TOC cluster (P71, P74, P75, P115)

Checked against HEAD `ab143a411` (main). Read-only. The haiku raw files (`research/raw/P71.md`, `P74.md`, `P75.md`, `P115.md`) were used as leads; every load-bearing claim below was re-read in code. Corrections to the raw files are listed under "Corrections to the scouts". Prototype: `.scratch/design-review/prototypes/right-sidebar.html` (P71 at 449-453 and script 1145-1172, P74 at 437-440 and 1090-1108, P75 at 469-472 and 1254-1263, P115 at 443-447 and 1105-1144). No screenshot was opened; the prototype and code are the references.

## Code map (what runs today)

Panels are mounted by `src/lib/app/AppShell.svelte:279-288` in the right sidebar: Properties, TOC (only while `settingsStore.layout.tableOfContentsVisible`), Backlinks, Outgoing links. Each is a `SidebarSection` (`src/lib/core/layout/SidebarSection.svelte`, stateless Collapsible wrapper; open flag is owned by the caller). The panels unmount when the right sidebar is hidden.

| File | Role |
|---|---|
| `src/lib/features/backlinks/BacklinksPanel.svelte` | `expanded` local `$state(false)` (:16); `handleOpenChange` fetches on open (:21-23); `fetchData` (:25-31) calls `fetchBacklinksV2` + `fetchRelationshipBacklinks`; path effect collapses and `backlinksStore.reset()` (:33-39); `vaultIndexVersion` refetch only when expanded (:46-51); template (:54-102): non-markdown / indexing / empty / Linked mentions + Relationships branches |
| `src/lib/features/backlinks/LinkItem.svelte` | one backlink row: icon + `entry.sourceName` (:22, `truncate`), snippet `<p class="... truncate">` (:25), raw `snippet.text` (:26-30), absolute `ShowInCalendarButton` (:34, no gutter) |
| `src/lib/features/backlinks/backlinks.service.ts` | `fetchBacklinksV2` (:131-163, `dedupeInflight` by path) with per-path skip map `lastFetchedBacklinksVersion` (:19, set :164, cleared only by `resetBacklinks` :257-263); `fetchRelationshipBacklinks` (no cache) |
| `src/lib/features/backlinks/backlinks.logic.ts:17-23` | `noteEntryV2ToBacklinkEntry`: `snippets: [{ text: entry.snippet, linkStart: 0, linkEnd: 0 }]` |
| `src/lib/features/backlinks/backlinks.store.svelte.ts` | `linkedMentions`, `relationshipBacklinks`, `unlinkedMentions` (:25-30 `reset`); holds no path |
| `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte` | same shape as Backlinks: `expanded` (:14), path effect collapses and `outgoingLinksStore.reset()` (:29-35), version effect (:42-47); resolved row = button with `link.alias ?? link.target` + `› heading` on one line (:60-72); unresolved = `div.opacity-60` red, no handler (:73-80) |
| `src/lib/features/outgoing-links/outgoing-links.service.ts` | `deduplicateByTarget` (:25-35, lowercase target, first wins); `fetchOutgoingLinksV2` (:65-90) with per-path key map `lastFetchedOutgoingKey` (`${version}:${contentLen}:${path}`, :16); `resetOutgoingLinks` (:96-99) |
| `src/lib/features/outgoing-links/outgoing-links.store.svelte.ts` | `outgoingLinks`, `unlinkedMentions`, `reset()`; holds no path |
| `src/routes/(app)/+layout.svelte:105-141` | tab-switch effect: 150 ms later calls `fetchBacklinksV2(path)` for every non-virtual tab (:129), panel open or not, then `markUnlinkedDirty()`. Comment at :95-103 describes the two panel effects |
| `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte` | `expanded` derived from `tocStore.expandedPath === activeTabPath` (:11-12); tab-switch effect clears it and `tocStore.reset()` (:18-27); `onDestroy` clears it (:29-32); `rebuildToc` effect while expanded (:34-39); rows are buttons with `title={heading.text}` and `openNoteAt(path, {kind:'offset', offset: heading.pos})` (:55-64); decorative `ChevronRight` (:62) |
| `src/lib/plugins/table-of-contents/toc.store.svelte.ts` | `headings`, `expandedPath`, setters, `reset()`; no current-heading state |
| `src/lib/plugins/table-of-contents/toc.logic.ts` | `extractTocHeadings` (`pos` = char offset into raw `content`, `line` = zero-based line), `stripHeadingChrome` |
| `src/lib/plugins/table-of-contents/toc.service.ts` | `rebuildToc`, `showTableOfContents(path)` (action bar button, `NoteActionBar.svelte:98`) |
| `src/lib/core/editor/open-note-at.service.ts:19-45` | `openNoteAt`: sets `editorStore.setPendingScrollPosition`; consumed by `MarkdownEditor.svelte:590-` |
| `src/lib/core/editor/editor.store.svelte.ts:16,43,107` | `editorView` (CodeMirror view) is exposed; no viewport or current-line state |
| `src/lib/app/commands.ts:322-337` | Layout commands incl. `layout:toggle-table-of-contents`; no heading command. `AppCommand` = `{id, label, category, shortcut?, action}` (`command-palette.types.ts`), a flat list; the palette has no second-step picker |
| `src/lib/app/AppOverlays.svelte:18` | mounts `<QuickSwitcher />` and the other overlay dialogs |
| `src/lib/utils/markdown-plain-text.ts:39` | `markdownToPlainText` (finders-ux 03, resolved); used by `SearchResult.svelte:84` |
| `src/lib/core/note-creator/note-creator.service.ts:79` | `openOrCreateNote({filePath,title,buildContent})`: create_note IPC, index update, tree add, open |
| `src/lib/app/editor-host.ts:152-172` | `appEditorHost.createNote` (periodic routing, `markdownTarget`, explicit-organization flag): what a click on a missing wikilink in the editor does |

Who reads the relevant stores: `backlinksStore.linkedMentions` and `relationshipBacklinks` are read only by `BacklinksPanel.svelte` (:61-90); `markUnlinkedDirty` is also called from `boot.ts:39` and the layout effect, but nothing in `src/lib` or `src/routes` calls `computeUnlinkedMentionsForFile` (open-itens 014 notes it, still true). `outgoingLinksStore` is read only by `OutgoingLinksPanel.svelte` and reset by the layout effect (:124). `tocStore` is read by the panel and written by the service and the panel.

Existing tests: `src/tests/lib/features/backlinks/{BacklinksPanel,LinkItem,backlinks.service,backlinks.logic,backlinks.store}.test.ts`; `src/tests/lib/features/outgoing-links/{OutgoingLinksPanel,outgoing-links.service,outgoing-links.logic,outgoing-links.store}.test.ts`; `src/tests/lib/plugins/table-of-contents/{TableOfContentsPanel,toc.logic,toc.service,toc.store}.test.ts`; `src/tests/lib/app/commands.test.ts` (:530 pins the toggle-TOC command); `src/tests/lib/utils/markdown-plain-text.test.ts`. Panel tests mock only the fetch services and `openFileInEditor` and use real `editorStore`/`vaultStore`/panel stores (`BacklinksPanel.test.ts:12-26`); service tests mock `@tauri-apps/api/core`. E2E: `e2e/specs/sidebars.spec.ts:35-61`, `e2e/specs/table-of-contents.spec.ts` (3 tests, the second pins "TOC collapses on file switch, re-expand"), mock `e2e/mocks/vault-index.ts:89-98,429-460` and `e2e/mocks/tauri-core.ts:74-80` (`handleCreateNote`).

## P71. Backlinks and Outgoing collapse on every note switch

**Still real: yes.**

Current behaviour:
- Both path effects collapse an open panel and reset the store on a path change: `BacklinksPanel.svelte:33-39`, `OutgoingLinksPanel.svelte:29-35` (the condition is `path !== lastFetchedPath && expanded`). Deliberate: commit `77c8cbcda` body says "Zero IPC calls until user clicks to expand. Switching tabs auto-collapses and resets"; help `help/documentation/07-sidebar-panels.md` says the same twice (Backlinks "When you switch to a different note, the panel collapses and clears itself", Outgoing "Switching to a different note collapses and clears it").
- "While closed, fetch nothing" holds for panel-originated fetches (Outgoing; Relationships; Backlinks on expand and on version bump), but NOT for Backlinks linked mentions: `+layout.svelte:129` fetches them 150 ms after every tab switch even when the panel is closed. So for Backlinks the data is usually already in the store when the panel opens.
- Stale data trap that P71 makes reachable (open-itens 014, re-verified): both services skip the IPC when the per-path memory says that path was fetched at this version (`backlinks.service.ts:141-150`, `outgoing-links.service.ts:65-70`), but the stores hold one path-less list. After A -> B -> A at a fixed `vaultIndexVersion`, the layout fetch for A is skipped and the store holds B's mentions; after the panel's own `store.reset()` the skip leaves the store empty. Today this only bites after a manual expand; with P71 it bites on every navigation with a panel open. So P71 cannot ship without 014's fix.

What the prototype wants: open/closed state survives a note switch; while open, refetch for the new note; while closed, no fetch; no count badge on collapsed headers (the review dropped it because it needs an eager fetch). The demo counts fetches: After never fetches while both panels are closed.

Design points a ticket must settle:
1. Where the open flag lives. Local `expanded` already survives a note switch (the panel stays mounted); it is lost when the right sidebar hides, because the panel unmounts. The TOC solved that with a store field (`tocStore.expandedPath`, 80ee3491a). Recommended: a boolean on each panel's store (in memory, reset only by vault teardown), not persisted across restart (owner question 1).
2. The path effect becomes "if open, reset the store, then `fetchData()` under `untrack`" (copy the `vaultIndexVersion` effect's shape at :46-51). Do not call `fetchData` from a tracked scope: it reads `editorStore.activeTab.content` (Outgoing, :22-26) and would subscribe the effect to content edits.
3. Wrong-note flash: the store has no path. Recommended fix (also 014's): the store records the path its data belongs to, the service skip fires only when the store currently holds this path at this version, `reset()` clears the record. The panel then renders the list only when the store's path equals the active path, and shows the neutral/loading state otherwise (not "No backlinks found", which would be a false claim while the fetch is in flight).
4. Duplicate fetch for Backlinks: the layout effect and the panel effect both fetch B (150 ms apart). `dedupeInflight` collapses concurrent same-path calls and the version skip elides the second one once the first wrote the store, so this is acceptable; assert one IPC for B in the service test, not two.
5. Relationships have no skip cache and are panel-only; they must refetch on switch while open.
6. Docs and comments to update with the change: `help/documentation/07-sidebar-panels.md` (the two "collapses and clears" sentences), `+layout.svelte:95-103` comment, and the `backlinks.logic.ts:9-15` header is unrelated.

Test files and seams: `BacklinksPanel.test.ts`, `OutgoingLinksPanel.test.ts` (existing cases at :62/:72/:81/:93 and :61/:71/:79/:91 stay green; none covers a path change), `backlinks.service.test.ts` (stale-skip describe near :470-501), `outgoing-links.service.test.ts` (:216), `backlinks.store.test.ts`, `outgoing-links.store.test.ts`. Mock only `@tauri-apps/api/core` in service tests and the fetch services in panel tests; stores real. A panel test for A -> B with the panel open: `editorStore.addTab(B)` then `flushSync()`, assert the Collapsible `data-state` is `open` (pattern at `TableOfContentsPanel.test.ts:44-50`) and the mocked service was called with B. E2E `sidebars.spec.ts:35,51` stay valid (they expand by click); add one case that expands, switches note and expects entries for the new note without a second click.

## P74. Link rows truncate identifying text and show raw markdown snippets

**Still real: yes. The "window around the link" half is not a UI change.**

Current behaviour:
- Outgoing resolved row: `OutgoingLinksPanel.svelte:60-72`, one flex line `alias ?? target` (the raw wikilink target, so `Projects/Roadmap` is the title) plus `› heading`, no `title` attribute, no folder.
- Backlinks row: `LinkItem.svelte:22` name `truncate`; `:25` snippet `truncate` (single line); `:26-30` renders `snippet.text` verbatim.
- Production snippets are never positioned: `backlinks.logic.ts:21` sets `linkStart = linkEnd = 0`, so the highlighted-link branch (`LinkItem.svelte:26-27`) never runs in the app (only in `LinkItem.test.ts:74`, a fixture with 4..15).
- The snippet is the LEADING 280 bytes of the source note's body, not a window at the link: `src-tauri/src/vault/entry.rs:365-398` (`compute_snippet`, "markdown structure is preserved verbatim", `SNIPPET_MAX_LEN` at :25), returned by `get_backlinks_v2` -> `idx.lookup_backlinks` (`index.rs:760-770`, clones whole `NoteEntry`s). The index stores no body, so a link beyond byte 280 is simply absent from the snippet; the review's "can cut off the link itself" understates it.
- `BacklinkEntry` (`backlinks.types.ts:9-13`) has no folder or heading; the folder derives from `sourcePath` with `entryFolder(vaultPath, path)` (`core/filesystem/file-entries.logic.ts:38`, already used by the quick switcher after finders-ux 07).
- `markdownToPlainText` already does the stripping the proposal wants (headings, list markers, `[[a|b]]` -> `b`, `[[a/b]]` -> `b`, emphasis, tolerates a cut `[[`); reuse is a direct import. Note it turns `[[Roadmap]]` into `Roadmap`, which is the desired "lose `[[ ]]`".
- E2E mock `e2e/mocks/vault-index.ts:89-98` `bodySnippet` mirrors the 280-byte leading snippet with only code fences stripped, so E2E shows raw markdown today and will show the stripped text after the change without a mock edit.

What the prototype wants: mention row = title, muted `folder · heading` sub-line, snippet `before`/highlighted `link`/`after` clamped to 2 lines, `title` tooltip `folder/name`. Outgoing row = title `alias ?? basename(target)`, sub-line `dirname(target) › heading`, tooltip `target#heading`. The prototype's `before/link/after` data model does not exist in production.

Design points:
1. Split the proposal: UI-only part (two-line rows, tooltip, stripped snippets, `line-clamp-2`, gutter) vs link-window part (needs source bodies; see candidate T6). Recommended: ship the UI-only part; the clamp shows about 2 lines of the note's lead, which is plain text after stripping.
2. Stripping vs offsets: if `linkStart/linkEnd` ever carry positions (T6), stripping must run on the `before` and `after` slices separately, because offsets index the raw text. Make LinkItem do that now (three segments, stripped separately, highlight kept) so the existing `LinkItem.test.ts:74` contract survives and T6 needs no row change.
3. Backlinks sub-line has no heading (the source note's heading for the link is unknown). Folder only; do not invent a heading. Root-level notes: omit the folder or show "Vault root" (pick one; the quick switcher precedent is in finders-ux 07).
4. Outgoing title becomes the basename: two links `[[A/x]]` and `[[B/x]]` look identical except for the sub-line; `deduplicateByTarget` keys on the full lowercase target so they stay separate rows. A heading-only link has an empty target (046 territory); its title must fall back to the heading, not an empty string.
5. Gutter: `ShowInCalendarButton` is absolutely positioned over the title row (`LinkItem.svelte:34`); open-itens 209 asks for a `pr-7` gutter. The button renders only for event notes (`LinkItem.test.ts:99`), so test with the event fixture.
6. Shared structure: both panels draw "icon + title + muted sub-line (+ snippet)". A small shared row component is justified (two users, and P75's broken row is a third variant); keep it in `features/backlinks` or a neutral spot and let layer rules decide (features may import other features if acyclic).

Test files and seams: `LinkItem.test.ts` (mocks `editor.service` and `@tauri-apps/api/core`; real stores), `OutgoingLinksPanel.test.ts:124` (asserts `spans.find` by `text-row` and text equal to the target; will change), `backlinks.logic.test.ts:41-43` (pins `linkStart: 0, linkEnd: 0`; unchanged if stripping lives in the component), `markdown-plain-text.test.ts` (unchanged). Any new pure helper (title/sub-line from a target) goes in a `.logic.ts` with a unit test and no mocks. E2E: `sidebars.spec.ts:51-61` uses `getByRole('button', { name: 'Projects/Roadmap' })`; Playwright string names are substring matches on the accessible name, which comes from content, not the `title` attribute, so the two-line row ("Roadmap" then "Projects") breaks it. Update that spec in the same change. `sidebars.spec.ts:35-49` (`/^Welcome/`, `/^2026-Q2/`, count `2`) stays valid as long as the title is the first text.

## P75. Unresolved outgoing links are dead, dimmed rows

**Still real: yes, but unsafe to ship alone.**

Current behaviour:
- `OutgoingLinksPanel.svelte:73-80`: `div.opacity-60` with `AlertCircle` and red text, no handler, mixed with resolved rows in one list (:58).
- "Unresolved" is `resolvedPath === null` from Rust `lookup_outgoing_links` (`src-tauri/src/vault/index.rs:859-875`, `resolve_with_cache` returns `None` for an empty target at :157-158) and the index only holds `.md`, `.markdown`, `.view` (`commands/vault.rs:310-318`, comment re-read). So `![[photo.png]]`, `![[board.canvas]]` and `[[#Heading]]` are all reported broken today. A Create button on those would offer to create `photo.png.md` or an empty-named note. This is open-itens 046 (blocked by 014), whose agreed scope (owner, 2026-11-06) is frontend only: resolve unresolved targets against `fsStore.fileTree` the way the editor does (`editor-host.ts` `resolveLink`), map an empty target with a heading to the note itself, dedupe by target + heading.
- `deduplicateByTarget` (`outgoing-links.service.ts:25-35`) folds all `[[#...]]` links into one empty-named row (046 criterion 2).
- No test or E2E covers a broken row or creating from the panel (grep of `e2e/` for broken/Outgoing confirms only the resolved case).
- Create path: `appEditorHost.createNote(target, anchor)` (`editor-host.ts:152-172`) is what the editor runs for a missing wikilink (`wikilink-navigation.ts:17-22`), including periodic-note routing (`periodicTarget`), `markdownTarget` (adds `.md`; private to that file) and `withUnorganizedFlag` when explicit organization is on. NO file under `src/lib/features` or `src/lib/plugins` imports `#lib/app/` today (grep), and `app/` is the composition root, so the panel must not import `appEditorHost`. The reusable core piece is `openOrCreateNote` (`core/note-creator/note-creator.service.ts:79`), which also opens the note. (The raw P75 scout suggested importing `appEditorHost`; that is the layer-rule trap it flagged as unconfirmed, and it is confirmed unavailable.)

What the prototype wants: resolved rows first (two-line, same as P74), then a "Broken links" label with a count pill, then one button per broken row (alert icon, title, `folder › heading`, a "Create" pill, `title="Create <target>.md"`), no `opacity`; clicking creates the note, a toast says "Created X in <folder or the vault root>" and the row moves to the resolved list.

Design points:
1. Order of work: classification first (046), then the group and button. Otherwise the group is wrong from day one.
2. New pure helper in `outgoing-links.logic.ts` (currently an empty stub with a re-export): partition into `{ resolved, broken }`, preserving order; unit test with no mocks.
3. Create target rules: `[[Folder/Name]]` -> `<vault>/Folder/Name.md`; `[[Name]]` -> vault root (the editor's behaviour); alias is only a label; heading is ignored for creation. To get periodic routing and the unorganized flag without importing `app/`, either move `markdownTarget` and the create flow into `core/note-creator` and let `editor-host` call it, or build the path locally and accept that a link such as `[[2026-11-17]]` creates a plain note in the panel. Recommended: extract and share (one create rule for editor and panel), as its own commit.
4. Behaviour after click (owner question 5): the editor opens the new note; the prototype stays and toasts. Recommended default: reuse `openOrCreateNote` as is (create and open), which also makes the index emit `vault-index-updated` so the panel refetch moves the row (traced in `note-creator.service.ts:66-78`, not run).
5. Failure: `openOrCreateNote` throws; surface via `toast.error`, leave the store untouched (CLAUDE.md "do not update stores with partial data").
6. Keep a `title` attribute and an accessible name on the button; keep the red icon but drop `opacity-60` (a11y contrast).

Test files and seams: `outgoing-links.service.test.ts` (real `fsStore`/`vaultStore`, mock Tauri; add 046's cases), `outgoing-links.logic.test.ts` (25-line stub, add partition tests), `OutgoingLinksPanel.test.ts:124-136` (rewrite for the new markup), `note-creator.service.test.ts` if the create flow is extracted. Mock `#lib/core/note-creator/note-creator.service.js` (side-effect service) in the panel test and assert the real arguments (path, title) plus the real store outcome; do not mock stores or the logic. E2E: `e2e/mocks/tauri-core.ts:74-80` `handleCreateNote` exists; add a broken-link case to `sidebars.spec.ts` (fixture needs a note with a missing link; `e2e/fixtures/test-vault.ts` not read in full).

## P115. TOC chevrons, current heading, "Go to heading", tab-switch state

**Still real: yes (chevrons, scroll-spy, command). The tab-switch collapse is a deliberate contract; changing it is the owner's call.**

Current behaviour:
- Per-row `ChevronRight` is decorative: `TableOfContentsPanel.svelte:62` (import :3); rows have no state or handler beyond `openNoteAt` (:60). Section-level chevron is separate (`SidebarSection.svelte:41-45`) and stays.
- No `aria-current` in the panel, no current-heading state in `toc.store.svelte.ts`, no heading-at-line function in `toc.logic.ts`.
- `grep -ri "go to heading" src/lib` returns nothing; `AppCommand` has only an `action`, so a "Go to heading" needs a second-step list. The review's evidence cite `commands.ts:324` is the toggle-right-sidebar label (loose); the TOC command at :329-337 only flips visibility.
- Editor side: `editorStore.editorView` is exposed (`editor.store.svelte.ts:16,43`); `MarkdownEditor.svelte` has no scroll listener except debug logging (:270, :560 behind `tabScrollLogOn()`); per-tab scroll is saved at :443-444 and restored at :419/:538. The view object is created once (:412) and reused across tabs via `showTabState`, so a listener on `view.scrollDOM` survives tab switches. `MarkdownEditor` normalizes CRLF to LF before building the doc (`toDocText`, :96-98) while `extractTocHeadings` computes `pos` on the raw content, so `pos` can drift from document offsets in CRLF notes. `heading.line` does not drift (split on `\n`, `HEADING_RE` tolerates `\r`).
- Tab-switch collapse: `TableOfContentsPanel.svelte:11,18-27,29-32`, pinned by `TableOfContentsPanel.test.ts:77` and `e2e/specs/table-of-contents.spec.ts:20-31`. Unlike links, the TOC has no IPC to protect: `rebuildToc` parses in-memory content (`toc.service.ts:9-15`), so the original "zero IPC" reason (77c8cbcda) does not apply to it.

What the prototype wants: no chevrons; the current heading gets `aria-current="true"` (tint, primary colour, semibold, inset 2px left bar, CSS line 334); scroll-spy sets it from the note's scroll position (last heading whose offset is above the top, last heading when scrolled to the bottom); clicking a row sets it immediately; a "Cmd+P: Go to heading" button shows a list of the note's headings with `H<level>` hints. The collapse behaviour is explicitly out of the prototype.

Design points:
1. Chevron removal changes the row's left padding (`padding-left: depth*16+8` plus the `gap-1` chevron slot) and the indent guides (`.toc-indent-lines`, 16px step, line at 12-13px in the panel style block). Re-tune so level-1 text starts at the same x as other sidebar text; assert structure in tests, eyeball the guides.
2. Scroll-spy source: viewport top (prototype) vs caret. Recommended viewport top, matching the prototype. Compare by LINE (`view.state.doc.lineAt(...)` of the block at the scroll top versus `heading.line`), not by `pos`, to dodge the CRLF drift. Pure function `headingIndexAtLine(headings, line)` in `toc.logic.ts`.
3. Bridge placement: keep it in the panel (an `$effect` keyed on `editorStore.editorView` and `expanded`, passive scroll listener, `requestAnimationFrame` throttle, removed on collapse/destroy) so nothing loads while the TOC is closed and no live-preview extension is added. If an editor extension is chosen instead, read `docs/agents/live-preview-rules.md` first.
4. Store: add the viewport line (or current heading index) to `tocStore` with getter, setter, reset, and a store test (ADR-0034 rule: every computed getter tested). The panel derives the current row from it; the bridge only writes the line.
5. Clicking the last heading may not scroll it to the top, so scroll-spy would keep highlighting the previous one; set the current heading on click as the prototype does, and let the next scroll event override it.
6. Keep `title={heading.text}` (E2E `button[title="Tasks"]` depends on it) and the row `onclick`.
7. "Go to heading" is a new surface, not a palette tweak: the palette is a flat command list. Recommended: a small dialog built on the command-dialog primitives (anchored, dense rows; finders-ux 01 resolved), mounted in `AppOverlays.svelte:18` beside QuickSwitcher, opened by a new command `note:go-to-heading` in `commands.ts` (near `note:toggle-favorite`, :339), listing `extractTocHeadings(activeTab.content)` of the active markdown tab, fuzzy filter via `fuzzyMatchPositions` (`utils/fuzzy-match.js`), Enter calls `openNoteAt(path, {kind:'offset', offset: heading.pos})`. It should work with the TOC section hidden or collapsed. Non-markdown or no active tab: no-op with a toast.
8. Tab-switch state: see owner question 3.

Test files and seams: `toc.logic.test.ts` (pure, no mocks), `toc.store.test.ts`, `TableOfContentsPanel.test.ts` (real `editorStore`/`tocStore`/`settingsStore`; `isOpen()` helper at :44-50 reads `data-slot="collapsible"`), `commands.test.ts` (`:505-530` pattern), a new picker component test (real stores; assert the real outcome `editorStore.pendingScrollPosition` equals `heading.pos`, no mock needed because `openNoteAt` only writes a store for the active note). jsdom has no CodeMirror layout, so the scroll bridge cannot be proven by a unit test without mocking the view; prove it in `e2e/specs/table-of-contents.spec.ts` (long note, scroll, assert `aria-current` moves). `e2e/mocks/tauri-core.ts` needs no change.

## Candidate tickets

Order: T1 -> T2 -> T3 (all edit `OutgoingLinksPanel.svelte`); T4 and T5 are independent of them and of each other; T6 is deferred. Gate for T1 to T5: frontend only (`pnpm check` + `pnpm vitest run`); T3 and T4 also add E2E specs (run with `bash scripts/e2e.sh`); T6 is Both (cargo + bindings).

### T1. Backlinks and Outgoing links stay open across note switches and always show the open note's links (P71, replaces open-itens 014)

Size: M. Files: `BacklinksPanel.svelte`, `OutgoingLinksPanel.svelte`, `backlinks.store.svelte.ts`, `outgoing-links.store.svelte.ts`, `backlinks.service.ts`, `outgoing-links.service.ts`, `+layout.svelte` (comment :95-103), `help/documentation/07-sidebar-panels.md`, tests listed under P71.
Blockers: none inside this cluster. Shared files: `BacklinksPanel.svelte` with rs-relationships P72 (template region :54-102 vs this ticket's script region :16-51, trivial rebase, either order); `SidebarSection.svelte` is not touched here (rs-properties-layout P43/P177 edit it). Must land before T2 and T3 (same panel file).
Acceptance criteria (each starts with a failing test):
1. `BacklinksPanel.test.ts`: expanded on A, `editorStore.addTab` B, `flushSync`; the Collapsible is still `data-state="open"` and `fetchBacklinksV2` and `fetchRelationshipBacklinks` were called with B. Fails today (collapses).
2. `OutgoingLinksPanel.test.ts`: same, `fetchOutgoingLinksV2` called with `(B, B's content)`.
3. Both panel tests: collapsed on A, switch to B, bump the version: the panel's own fetches are not called (existing "does not fetch while collapsed" cases stay green).
4. `backlinks.service.test.ts` (014): real stores and fixed `vaultIndexVersion`, `fetchBacklinksV2(A)`, `fetchBacklinksV2(B)`, set `activeTabPath` back to A, `fetchBacklinksV2(A)`: `linkedMentions` holds A's entry. Also: after `backlinksStore.reset()`, the same call refills A's entry. Both fail today.
5. `outgoing-links.service.test.ts` (014): after `outgoingLinksStore.reset()`, `fetchOutgoingLinksV2(A, content)` at the same version and length refills A's links. Fails today.
6. Panel test: after a switch A -> B with B's fetch still pending, the rendered list does not contain A's rows and does not say "No backlinks found" (store path record vs active path).
7. Store test (real store): the open flag survives unmount and remount of the panel (sidebar hide and show) and is cleared by the store's reset.
8. Existing burst-save tests (`backlinks.service.test.ts` ~:478, `outgoing-links.service.test.ts` ~:216) stay green: two calls for one path and version issue one IPC; a version bump, content-length change or `resetBacklinks`/`resetOutgoingLinks` still refetches; the active-path guard still drops a result whose tab changed mid-IPC and does not record it.

### T2. Link rows: two lines, plain snippets, path tooltip (P74 UI part, absorbs the LinkItem half of open-itens 209)

Size: M. Files: `LinkItem.svelte`, `OutgoingLinksPanel.svelte` (resolved-row markup), optionally a small shared row component and a `.logic.ts` helper for title/sub-line, `backlinks.types.ts` only if a field is added, tests listed under P74, `e2e/specs/sidebars.spec.ts:51-61`.
Blockers: T1 (same panel file). Shares `OutgoingLinksPanel.svelte` with T3 (T3 follows).
Acceptance criteria:
1. `LinkItem.test.ts`: an entry with snippet `# Roadmap Linked from [[Welcome|Start]] and **bold**` renders `Roadmap Linked from Start and bold`: no `#`, `[[`, `**` in the row text. Fails today.
2. `LinkItem.test.ts`: the row shows the source name on line one and the vault-relative folder on a muted second line (none for a root note, per the chosen rule), the button has a `title` with the vault-relative path, and the snippet paragraph has `line-clamp-2` and not `truncate`.
3. `LinkItem.test.ts`: a positioned snippet (`linkStart 4, linkEnd 15`) still highlights the link span with markdown stripped from `before` and `after` separately (keeps the :74 contract).
4. `LinkItem.test.ts`: for an event note the title and snippet container reserve the calendar-action gutter (`pr-7`) and the action stays clickable (209 criteria, LinkItem half).
5. `OutgoingLinksPanel.test.ts`: `{target:'Projects/Roadmap', alias:null, heading:'Goals'}` renders title `Roadmap`, sub-line `Projects › Goals`, tooltip `Projects/Roadmap#Goals`; with an alias the title is the alias; a heading-only link titles by heading.
6. `sidebars.spec.ts` outgoing case updated to the new accessible name and still green under `bash scripts/e2e.sh`; the backlinks case `/^Welcome/` stays green unchanged.

### T3. Outgoing links: only missing targets are broken, grouped under "Broken links" with a Create button (P75, replaces open-itens 046)

Size: L (cleanly splittable at 046: commit 1 is the classification fix, S to M, usable alone). Files: `outgoing-links.service.ts`, `outgoing-links.logic.ts`, `OutgoingLinksPanel.svelte`, `core/note-creator/note-creator.service.ts` (+ `app/editor-host.ts` if the create rule is extracted), tests listed under P75, `e2e/specs/sidebars.spec.ts`.
Blockers: T1 and T2 (same file and same row block). Layer rule: do not import `#lib/app/` from the feature. Cross-cluster: none found.
Acceptance criteria:
1. `outgoing-links.service.test.ts` (046): IPC resolves `[{target:'photo.png',resolvedPath:null},{target:'',heading:'Action Items',resolvedPath:null},{target:'Missing',resolvedPath:null}]` for A with `photo.png` in the real `fsStore.fileTree`; after the fetch the first two have a `resolvedPath` and only `Missing` is unresolved. Fails today.
2. `outgoing-links.service.test.ts`: `[[#One]]` and `[[#Two]]` give two rows, labelled by heading.
3. `outgoing-links.logic.test.ts`: `partitionOutgoingLinks` returns `{resolved, broken}` in order; empty input gives two empty lists.
4. `OutgoingLinksPanel.test.ts`: broken links render under a "Broken links" label with a count, after the resolved rows, each as a button with no `opacity-60`; a note with no broken links renders no label.
5. `OutgoingLinksPanel.test.ts`: clicking `[[Folder/New]]` calls the create service (mocked at the note-creator boundary) with `<vault>/Folder/New.md` and title `New`; clicking `[[New]]` uses the vault root. A rejected create shows a toast and leaves `outgoingLinksStore` untouched.
6. Same-note heading rows and attachment rows do not offer Create (they are resolved after criterion 1); clicking a heading row stays on the note, an attachment row opens the file.
7. `sidebars.spec.ts`: a note with a missing link shows it under "Broken links"; clicking it creates the note through the mocked `create_note` (`tauri-core.ts:74-80`).

### T4. TOC: no decorative chevrons, current heading highlighted (P115, scroll-spy part)

Size: M. Files: `TableOfContentsPanel.svelte`, `toc.store.svelte.ts`, `toc.logic.ts`, tests listed under P115, `e2e/specs/table-of-contents.spec.ts`; only if owner question 3 is "align": the open-state code and its pinned tests.
Blockers: none inside this cluster. Independent of T1 to T3 (different files). Shares `toc.logic.ts` with T5 (additive functions) and `TableOfContentsPanel.test.ts` with any later TOC work; neighbour clusters: none touch the TOC.
Acceptance criteria:
1. `toc.logic.test.ts`: `headingIndexAtLine(headings, line)` returns the last heading whose `line <= line`, `-1` before the first heading and for an empty list, the last index past the end.
2. `TableOfContentsPanel.test.ts`: heading rows contain no chevron icon (`svg.lucide-chevron-right`), keep `title`, and the section header chevron (`data-sidebar-section-chevron`) is still there. Fails today.
3. `TableOfContentsPanel.test.ts`: after `tocStore.setViewportLine(n)` exactly one row has `aria-current="true"` and it moves when `n` changes; none when there are no headings.
4. `TableOfContentsPanel.test.ts`: clicking a row marks it current immediately.
5. `toc.store.test.ts`: the viewport line getter, setter and reset.
6. `e2e/specs/table-of-contents.spec.ts` (real editor): with the TOC open on a long note, scrolling the editor moves `aria-current` to the heading above the fold; no listener work while the TOC is collapsed (assert `aria-current` absent).
7. (Per owner question 3, default align) `TableOfContentsPanel.test.ts:77` and the E2E "collapses on file switch" case are rewritten on purpose: the TOC stays open on a tab switch and shows the new note's headings; with "keep" the two tests stay as they are.

### T5. "Go to heading" command and picker (P115, command part)

Size: M. Files: new picker component and store under `src/lib/plugins/table-of-contents/`, `toc.logic.ts` (filter helper), `src/lib/app/commands.ts`, `src/lib/app/AppOverlays.svelte`, tests (`commands.test.ts`, a new picker test, `toc.logic.test.ts`).
Blockers: none hard. Reuses command-dialog primitives from finders-ux 01 (resolved). Shares `commands.ts` with any ticket adding a command (additive).
Acceptance criteria:
1. `commands.test.ts`: a command `note:go-to-heading` exists with category `Note`; its action opens the picker store (real store). Fails today.
2. Picker test: with an active markdown tab, the dialog lists its headings in document order with their level; typing filters by fuzzy match; an empty filter lists all.
3. Picker test (no mock needed): Enter on a row sets `editorStore.pendingScrollPosition` to `heading.pos` and closes the dialog; Escape closes without moving.
4. Picker test: with no active note or a non-markdown tab, the command does not open the dialog and shows a toast.
5. Works with the TOC section hidden or collapsed (`settingsStore.layout.tableOfContentsVisible` false).

### T6 (deferred, needs owner yes). Link-window snippets for backlinks (P74 window part)

Size: L, risky: Rust + IPC DTO. Do not start without owner question 4 answered yes. Shape if approved: a new read-only command (for example `get_backlink_contexts(path, sourcePaths)`) that reads only the visible rows' source files on demand while the panel is open, finds the first link to the target, returns a window around it with `linkStart/linkEnd`; ts-rs DTO under `src/lib/contracts/generated/` committed with the Rust change (CLAUDE.md rule 6 "Both"); the index and its disk cache stay untouched (no index or disk cache growth; read `docs/agents/indexing-watcher-rules.md` first); `LinkItem` already supports positioned snippets after T2; E2E mock `vault-index.ts` updated to match. Blockers: T2. Acceptance would start with a Rust test of the window cut at codepoint boundaries and a frontend test mapping the DTO to `ContextSnippet`.

## Overlapping Issues

| Issue | Status | Verdict |
|---|---|---|
| `.scratch/open-itens/issues/014-backlinks-outgoing-links-always-show-open-note.md` | `ready-for-agent` (ledger `todo`, no blocker) | REPLACE by T1. Keep its three failing-first tests, the "same path same version still one IPC" test, and the active-path guard criterion; T1 criteria 4, 5, 8 carry them. Its note that store `reset()` bypasses the services is handled by the store path record |
| `.scratch/open-itens/issues/046-outgoing-links-marks-row-broken-only-when.md` | `ready-for-agent` (ledger `todo`, blocked by 014) | REPLACE by T3 (its frontend-only scope, owner 2026-11-06, becomes T3 criteria 1 to 3 and 6). Its Blocked-by 014 is satisfied by T1 |
| `.scratch/open-itens/issues/209-search-results-link-rows-reserve-gutter-their.md` | `ready-for-agent` (ledger `todo`) | PARTIAL: the `LinkItem.svelte:34` half is replaced by T2 criterion 4. The `SearchResult.svelte:177` half (still `absolute right-1 bottom-1`) and the `LayoutSection` chevron alignment are other surfaces and stay in 209 (amend it to drop the LinkItem half) or go to whichever cluster owns them |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | `ready-for-agent`, blocked by 204 | DEPEND, not replace: it migrates the "No backlinks found", "No outgoing links", "No headings found" empty states and pins them in the three panel test files (`p.text-meta` markup). None of our proposals changes those empty states; if 205 lands after us, rebase its test edits, if before, T1/T2/T3/T4 use the primitive's markup |
| `.scratch/open-itens/issues/210-noteinfo-relationships-heading-follow-sidebar-section.md` | `needs-info` | EXCLUDE (Info/Relationships heading, other cluster) |
| `.scratch/finders-ux/issues/03-search-result-cards-name-folder-plain-snippets.md` | resolved | DEPEND, shipped: T2 reuses `markdownToPlainText` |
| `.scratch/finders-ux/issues/01-command-dialogs-anchored-dense-rows.md`, `07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | DEPEND, shipped: T5 reuses the command-dialog primitives; T2 reuses `entryFolder` |
| `.scratch/tasks-view-ux`, `frontmatter-rules`, `vault-organization-v2`, `preview-channel`, `claude-code-integration`, `mods-host-robustness` | live | No issue targets these panels or the TOC (grep of `.scratch/*/issues`). `claude-code-integration/issues/03-claude-chat-panel.md` adds a right-sidebar section, which may want the same open-state rule as T1; not a conflict |
| Neighbour proposals in this batch | not Issues | P72 (relationship backlinks, `BacklinksPanel.svelte` template) and P43/P177 (`SidebarSection`, sticky headers, remembered Properties state) share files or a persistence mechanism with T1; sequence with T1 and align the open-state mechanism if P43 adds persistence |

## Corrections to the scouts

- P71 raw: "while closed, fetch nothing already holds" is only true for the panel's own fetches. `+layout.svelte:129` fetches Backlinks linked mentions on every tab switch regardless of panel state. This matters for T1 (duplicate fetch, store path record) and for the dropped count badge (a Backlinks count would be free; an Outgoing count would not).
- P74 raw: the link is not "cut off" by the UI; the 280-byte snippet is the note's leading text and usually contains no link at all.
- P75 raw: importing `appEditorHost` from the panel is not available; no feature or plugin imports `#lib/app/`.
- P74/P75 raw: the unresolved-row lines cited by open-itens 046 (`:82-89`) are now `:73-80`.

## Owner-only questions

1. P71 persistence: is the open/closed state only in memory (survives note switches and sidebar hide/show, closed again after an app restart)? Recommended: yes, in memory, closed on launch. Persisting would need a settings key and should follow whatever P43 chooses for Properties.
2. P71 count badge on collapsed headers: the review dropped it. Backlinks could show one for free (the layout fetch already fills it), Outgoing could not. Recommended: no badge, as reviewed.
3. P115 tab-switch collapse of the TOC: keep (deliberate, pinned by `TableOfContentsPanel.test.ts:77` and the E2E) or align with T1 so all three sections keep their state? The IPC reason from 77c8cbcda does not apply to the TOC (local parse) and scroll-spy only helps while it is open. Recommended: align, in T4, with the two pinned tests rewritten on purpose.
4. P74 backlinks snippet: accept the note's cleaned leading text (T2) or also build link-window snippets (T6, Rust)? Recommended: ship T2 only; revisit after using it.
5. P75 what a click does: create and open the note (what a missing wikilink does in the editor; the prototype instead stays and toasts)? Recommended: create and open via `openOrCreateNote`, one create rule shared with the editor.
6. P115 chevrons: remove (recommended) or make them collapse subtrees?
7. P115 "Go to heading" surface: a small dedicated dialog opened by a palette command (recommended, no shortcut) or a palette sub-mode? A sub-mode means changing the palette's flat command model.

## Not checked

- No app run, no tests, no E2E run. The CRLF drift of `heading.pos`, the "row moves after create" flow and the E2E accessible-name break are read from code, not observed.
- `e2e/fixtures/test-vault.ts` was not read in full (needed to know whether a note with a missing link already exists for T3's E2E).
- CodeMirror API for the scroll-top-to-line mapping (`lineBlockAtHeight`/`elementAtHeight`) was not verified against the installed version; T4 must check it.
- `help/documentation` has a TOC mention only in the layout settings line (`07-sidebar-panels.md:163`); other help pages describing the TOC were not searched.
- Screenshots in `.scratch/design-review/screens/` were not opened.
