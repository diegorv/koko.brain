# 07: Outgoing links: only missing targets are broken, two-line rows, a Broken links group whose rows create the note

**Origin:** design review 2026-11-17, proposal P75 and the outgoing half of P74 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (cards `#P74`, `#P75`), research `.scratch/shell-sidebars-ux/research/verdict-rs-links-toc.md` and `breakdown.md` (old ticket 22). Replaces `.scratch/open-itens/issues/046-outgoing-links-marks-row-broken-only-when.md` (its "attachment row opens the file" criterion is revised).

**What to build:** in `src/lib/features/outgoing-links/` (`outgoing-links.service.ts`, `outgoing-links.logic.ts`, `OutgoingLinksPanel.svelte`):

1. **Only missing targets are broken.** A same-note heading link (`[[#Action Items]]`, empty target plus heading) resolves to the note itself; an embed or link to an existing file (`![[photo.png]]`) resolves against the file tree with the editor's rule. Today both are red (`src-tauri/src/vault/index.rs:157-158` returns `None` for an empty target, and the index holds notes only).
2. **Two-line resolved rows.** The alias or file name, then the folder and heading (`Projects › Goals`), with `target#heading` on hover (`title`). A root target has no folder.
3. **Broken links group.** Broken links move to a "Broken links" label with a count below the resolved rows. Each is a button (alert icon, no `opacity-60`, a "Create" pill, `title="Create <target>.md"`) that creates the note and opens it, exactly as clicking the missing link in the editor does (periodic routing, `.md`, the unorganized flag). A failed create shows an error toast and leaves `outgoingLinksStore` unchanged. A resolved `[[Note#H]]` opens the note at H. A binary attachment row is drawn as resolved and is not a button (`openFileInEditor` would toast "Cannot open binary file", `editor.service.ts:158-162`).
4. **Service.** After the IPC, an empty target plus heading resolves to the note itself; other unresolved targets go through `resolveWikilinkCached` + `buildResolutionCache` over `flattenFileTree(fsStore.fileTree).filter(isLinkTargetFile)`; `deduplicateByTarget` keys on lowercase target plus heading (so `[[#One]]`/`[[#Two]]` and `[[Note#A]]`/`[[Note#B]]` each give two rows). Recommended: move `treeLinkIndex()` (`src/lib/app/editor-host.ts:75-84`, core-only dependencies) into a core module so the editor and the panel share one per-tree cache; `editor-host.ts` imports it. No Rust change.
5. **Pure helpers.** `outgoingLinkLabel(link)` returning `{ title, sub, tooltip }` (title `alias ?? basename(target)`, or the heading for a same-note link; sub `dirname(target) › heading`, omitting empty parts; tooltip `target#heading`) and `partitionOutgoingLinks(links)` returning `{ resolved, broken }` in order, in `outgoing-links.logic.ts` (an empty stub today).
6. **Clicks.** `followWikilink(editorStore.editorView?.state.facet(editorHost) ?? NOOP_HOST, target, { heading, blockId: null })` (`src/lib/core/markdown-editor/editor-host.ts:104`, `src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17-22`). Not `openOrCreateNote` (it would make `[[2026-11-17]]` a root note) and not moving the create flow into `core/` (a new core -> plugins edge fails `src/tests/lib/architecture/layer-rules.test.ts`). Precedents for reading `editorStore.editorView` from features: `note-writer.service.ts:69`, `file-history.service.ts:90`.
7. **Help.** `help/documentation/07-sidebar-panels.md:90` describes the group ("target note does not exist" stays true).

Not in this ticket: a shared link-row component (only the pure label helper is shared); moving `markdownTarget` and the create flow into `core/note-creator`; opening an attachment with the system app; the backlink rows and a snippet window (ticket 06).

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh sidebars.spec.ts`

- [ ] Failing test first, `src/tests/lib/features/outgoing-links/outgoing-links.service.test.ts` (real `fsStore`, `vaultStore`; Tauri mocked): IPC returns `photo.png`, `{target:'', heading:'Action Items'}` and `Missing`, all unresolved, with `photo.png` in the tree: after the fetch the first two have a `resolvedPath`, only `Missing` is unresolved. `[[#One]]`/`[[#Two]]` and `[[Note#A]]`/`[[Note#B]]` each give two rows.
- [ ] If `treeLinkIndex` moves: the editor-host coverage stays green, the moved module has a unit test, `layer-rules.test.ts` passes.
- [ ] Failing test first, `outgoing-links.logic.test.ts`: `outgoingLinkLabel({target:'Projects/Roadmap', alias:null, heading:'Goals'})` is `{title:'Roadmap', sub:'Projects › Goals', tooltip:'Projects/Roadmap#Goals'}`; an alias becomes the title; `{target:'', heading:'Tasks'}` titles `Tasks`; a root target has no folder in `sub`; `partitionOutgoingLinks([])` gives two empty lists and order is kept.
- [ ] `OutgoingLinksPanel.test.ts` (real stores; a real `EditorView` built with `editorHost.of(host)` set through `editorStore.setEditorView`): broken rows render after resolved rows under "Broken links" with count 2, each a `button` without `opacity-60`; no label when none; `:124` is rewritten on purpose for the new markup.
- [ ] Clicking broken `[[Folder/New]]` calls `host.createNote('Folder/New', ...)`; clicking `[[Roadmap#Goals]]` calls `host.openLink(<abs Roadmap>, { heading: 'Goals', blockId: null })`; a `createNote` resolving `false` toasts and leaves `outgoingLinksStore.outgoingLinks` unchanged; a row whose `resolvedPath` is a `.png` is not a button and not red.
- [ ] A missing note stays unresolved (`OutgoingLinksPanel.test.ts:124` intent stays true).
- [ ] E2E `e2e/specs/sidebars.spec.ts`: `:51-61` updated to the new accessible name (`Roadmap`, sub-line `Projects`); a new fixture note (not `Welcome.md`, which other specs pin) with `[[Nowhere]]` shows it under "Broken links", and clicking it creates `Nowhere.md` through the mocked `create_note` (`e2e/mocks/tauri-core.ts:74-80`) and opens it.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P75.** Unresolved outgoing links are dead, dimmed rows. Each is a div at opacity-60 in red, with no action. Make them buttons that create the note, group them under "Broken links", and drop the opacity. Validation: keep.
- **P74 (outgoing half).** Two-line rows: the title, then the folder or target and the heading in muted text, plus a path tooltip. Validation: keep. (Backlinks half is ticket 06.)
- **046 (absorbed).** Outgoing links marks a row broken only when its target is missing; the owner's 2026-11-06 frontend-only ruling applies. Its "attachment row opens the file" criterion is replaced by item 3: binary rows are drawn resolved and are not buttons.

## Problem

Embeds and same-note heading links show as broken even though their targets exist, and truly broken links are dimmed rows with no action. Path, alias and heading share one truncated line, so a row cannot be identified without opening it.

## Evidence

Checked at `ab143a411`.

- `OutgoingLinksPanel.svelte:58-82`: the single `{#each}`; `:60-72` resolved button (one line, `link.alias ?? link.target` and `› heading`, no tooltip); `:73-80` `div.opacity-60`, red, no handler.
- `index.rs:157-158`: the index resolves notes only and returns `None` for an empty target.
- `src/lib/app/editor-host.ts:75-84` `treeLinkIndex()`, `:125` `resolveWikilinkCached`; the editor's create flow routes periodic targets through `periodicTarget`, which imports `plugins/periodic-notes` (`editor-host.ts:33-34, 54-59`), so moving it into `core/` is a new layer violation.
- `src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17-22`: `followWikilink` resolves or creates exactly as an editor click does and silently ignores binaries (`:18`).
- `outgoing-links.service.ts:60-75`: the per-path skip key; ticket 06 replaces it with the store path record this ticket builds on.
- `e2e/fixtures/test-vault.ts:5-12`: the E2E vault has no note with a missing link, so the broken-link case needs a new fixture note.

## Why blocked

- 06: (Backlinks and Outgoing links stay open, always show the open note's links, and backlink rows show folder and a plain snippet: the outgoing store path record and the panel body)

## Sequence with

Ticket 33 (links follow in the active tab; blocked by this ticket) changes the `OutgoingLinksPanel.svelte` row `onclick`s. Ticket 05 edits the `SidebarSection` call line `:51`. Open-itens 205 rewrites the empty `<p>`s of the same panel; open-itens 024/025 touch `app/editor-host.ts` (rebase only). `help/documentation/07-sidebar-panels.md` and `sidebars.spec.ts`: 05, 06.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 07.1 a broken row creates and opens the note, as the editor does, rather than create, stay and toast; 07.2 attachment rows are non-interactive.
