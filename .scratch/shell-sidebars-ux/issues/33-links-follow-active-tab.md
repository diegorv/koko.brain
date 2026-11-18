# 33: Links follow in the active tab; the open-link modifier opens a new tab

**Origin:** design review 2026-11-17, proposal P35 (links half, counted in new 31), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-history-breadcrumb.md` (ticket E) and `breakdown.md` (old ticket 43).

**What to build:**

1. **Behaviour.** A plain click on a wikilink in the editor, or on a Backlinks, Relationships or Outgoing links row, opens the target in the active tab by new 31's rule; with the open-link modifier (`isOpenLinkModifier(e, IS_MAC)`, Ctrl on Linux) it opens a new tab, and so does a middle click on a row. A link to the open note (a `[[#Heading]]` link, or a link to itself) only scrolls and adds no history. Following a revealed `[[...]]` on the cursor line already needs the modifier (`wikilink-click-target.ts:65-79`), so it now opens a new tab, which is what it does today.
2. **Host option.** `EditorHost.openLink(path, anchor?, options?: { newTab?: boolean })` in `src/lib/core/markdown-editor/editor-host.ts:54` (and the no-op host `:92`). `src/lib/app/editor-host.ts:143-146`: `newTab: false` goes to `navigateInActiveTab`, anything else (the default) to `openFileInEditor`, then `scrollToAnchor`. The default stays add-or-focus, so `openWikilinkTarget` (`:206`; Tasks, Kanban, Canvas), the meta-bind button's `open` action (`widgets/meta-bind-button-widget.ts:112`) and the dangling-link `createNote` need no change.
3. **Threading.** `followWikilink`, `followWikilinkInfo` and `followWikilinkClick` (`extensions/live-preview/wikilink-navigation.ts:17,28,45`) take `newTab`; the three mousedown sites pass `newTab: isOpenLinkModifier(e, IS_MAC)` (false on a plain click): `MarkdownEditor.svelte:273-289` (the capture-phase `handleEditorClick`), the table-cell link `widgets.ts:341-349` and the embed header `widgets.ts:675-681`. Keep `stopPropagation` and the `isMacContextClick` guard (live-preview rule 11).
4. **Rows.** `LinkItem.svelte:10` (Backlinks), `BacklinksPanel.svelte:93` (the relationship backlink rows), and `PropertiesView.svelte:263` (the Relationships block rows) use `navigateInActiveTab` on a plain click and `openFileInEditor` on a modifier or middle click. Outgoing links rows go through `followWikilink(host, ...)` after ticket 07 (create-on-missing, heading anchor); thread `newTab` through that call instead of calling `navigateInActiveTab` directly, so both behaviours stay. Old ticket 43's code list left out `PropertiesView.svelte:263`, though its text names "Relationships" rows; Properties link values elsewhere in that file are not changed.
5. Help `03-editor.md:109-116`, `05-wikilinks.md:48` ("opens in a new tab").

Read `docs/agents/live-preview-rules.md` before editing `widgets.ts`. Not in this ticket: quick switcher, search results, Tasks, Calendar, canvas nodes and deep links (unchanged add-or-focus); Properties link values.

**Blocked by:** 06, 07, 31

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/wikilink-navigation.spec.ts`.

- [ ] Failing test first, `wikilink-navigation` tests (stub host): a plain follow calls `openLink(path, anchor, { newTab: false })`, a modifier follow `{ newTab: true }`; a same-note `[[#H]]` only moves the cursor.
- [ ] Failing test first, `app/editor-host` test (real `editorStore`, Tauri mocked): `openLink(B, undefined, { newTab: false })` from markdown tab A swaps the tab to B with `back: [A]`; `openLink(A, anchor)` while A is active pushes nothing; `openLink(B)` with no option still adds or focuses a tab.
- [ ] `wikilink-click-target` tests stay unchanged and green; the click handler passes the modifier.
- [ ] `LinkItem.test.ts`, `BacklinksPanel.test.ts`, `OutgoingLinksPanel.test.ts` and the Relationships rows of `PropertiesView`'s tests: a plain click navigates, a modifier click and a middle click open a new tab (history service mocked, stores real).
- [ ] The meta-bind `open` action and `openWikilinkTarget` still add or focus a tab (existing tests stay green).
- [ ] E2E `wikilink-navigation.spec.ts:16-27` is rewritten for Replace (the tab count stays at baseline, Welcome replaced by Roadmap); a new case Ctrl/Cmd-clicks (`ControlOrMeta`) a link and sees baseline + 1.
- [ ] `feature-cycle.test.ts` and `layer-rules.test.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P35 (links half).** Following links becomes reversible: a plain click on a link replaces the active unpinned tab, with Cmd+click opening a new one (owner decision: Replace).

## Problem

Every link click, in the editor and in the right sidebar rows, adds or focuses a tab, so following a chain of links piles up tabs. The link path carries no event or option, so "modifier opens a new tab" has no channel: `host.openLink(path, anchor)` takes neither.

## Evidence

Checked at `ab143a411`.

- `src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17-21` `followWikilink` calls `host.openLink(resolved, anchor)`; `:28-38`, `:45-62` the click and info paths.
- `src/lib/app/editor-host.ts:143-146` `openLink` is `openFileInEditor` then `scrollToAnchor`; `:206` `openWikilinkTarget`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:273-289` capture-phase click with `stopImmediatePropagation`; `widgets.ts:341-349` and `:675-681` the other two mousedown sites.
- Row openers: `src/lib/features/backlinks/LinkItem.svelte:10`, `BacklinksPanel.svelte:93`, `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:63`, `src/lib/features/properties/PropertiesView.svelte:263`; all call `openFileInEditor`.
- `src/lib/core/markdown-editor/wikilink-click-target.ts:65-79` the modifier already means "follow a revealed link".

## Why blocked

- 06: Backlinks and Outgoing links stay open, always show the open note's links, and backlink rows show folder and a plain snippet
- 07: Outgoing links: only missing targets are broken, two-line rows, a Broken links group whose rows create the note
- 31: Note-list rows open in the active tab and record a per-tab history

## Sequence with

- Row files: new 06 (`LinkItem.svelte`, `BacklinksPanel.svelte`), new 07 (`OutgoingLinksPanel.svelte`; both are blockers) and new 09 (rewrites the Relationships block of `PropertiesView.svelte`, so rebase onto it if it lands first).
- `MarkdownEditor.svelte`: new 32 edits `:476-478` (view state of a leaving path). No edge, rebase only.
- `src/lib/app/editor-host.ts`: open-itens 024 and 025 (meta-bind `open`; merge order only).
- `help/documentation/03-editor.md`: new 21, 22, 23, 24, 25, 27, 31, 32.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: Replace (old 41.1). Defaults (not individually answered): the first-pass surfaces for links (old 41.2, numbered 31.1 in new 31) are editor wikilinks and the Backlinks, Relationships and Outgoing rows; no further questions of its own.
