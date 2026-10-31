---
type: ADR
id: "0033"
title: "An icon rail and one note list replace the left-sidebar modes"
status: proposed
date: 2026-10-31
---

## Context

The left sidebar holds three modes in one slot (`layout.sidebarMode`: `files`, `types`,
`calendar`, default `types` at `src/lib/core/settings/settings.store.svelte.ts:53`), plus Search,
which overrides whichever mode is set (`src/lib/core/layout/AppShell.svelte:129-137`). They are
three different kinds of tool: a vault tree, a type navigator that alone opens a second resizable
column (`AppShell.svelte:81-83, 143-155`, `TypeNoteList`), and a month grid that is the only sidebar
entry point to weekly, monthly and quarterly notes. Each mode grew its own header strip, each
mounting the same `SidebarModeToggle` (`FileExplorerHeader.svelte:14`, `TypeSidebar.svelte:188`,
`CalendarPanel.svelte:57`), plus its own context menu, rename flow and pin concept. Lifecycle
actions live inside the Properties panel (`PropertiesView.svelte:168`), so they are gone whenever
the right sidebar is hidden. ADR 0026 says the file tree is the default; the code says `types`.

The audit is `.scratch/ux-sidebar/discovery-2026-10-31.md` on the branch
`docs/ux-sidebar-discovery`; the owner approved a prototype (variant A, same branch,
`src/routes/prototype-sidebar/`) and the product decisions in `.scratch/sidebar-redesign/PRD.md`.
This ADR stays `proposed` until the rail shell becomes the default (ticket 23 of
`.scratch/sidebar-redesign/issues/`), which sets it `active` and amends ADR 0026.

## Decision

**Use an always-visible icon rail whose every pick is a lens, and one note list column that every
lens fills; Types, Calendar and Files become navigators that set the lens instead of modes that
replace the sidebar.**

- The rail lists Search, Inbox, Today, Favorites, then Types, Calendar, Files, with Archive at the
  bottom. A lens resolves to a label, a plain-language rule and the notes to list, and it decides
  what "+ New here" writes (folder, type, date, `_organized: false`, `_favorite: true`).
- The day a note belongs to has one owner, a pure function in `utils/`: frontmatter `date`, else
  frontmatter `created`, else the disk creation time.
- Lifecycle and view actions move from the Properties panel to a per-note action bar above every
  markdown note, modelled on Tolaria's BreadcrumbBar. It writes the active note's frontmatter
  directly, so it does not depend on the Properties panel being mounted.
- The rail shell, the lens model and the note list live in `features/`. Plugin-owned parts (the
  Calendar navigator and Day lens from `plugins/calendar` and `plugins/periodic-notes`, Today's My
  people and "New 1:1" from `plugins/one-on-one`) register into it, following ADR 0003's
  registration rule instead of a `features/` to `plugins/` import.
- The change ships expand-contract behind a temporary `layout.shell` setting. The classic modes,
  `layout.sidebarMode`, the Cycle Sidebar View command and keybinding, and the bookmarks feature
  (merged into `_favorite`) are removed at the end.

## Alternatives considered

- **Keep the three modes and tidy the chrome**: one shared header, a fixed toggle. Rejected: the
  modes stay three different tools, Search stays hidden and each mode keeps its own list and menus.
- **One stacked sidebar with no rail (Tolaria's layout)**: Inbox, Favorites, Views, Types and
  Folders as collapsible groups feeding one note list. Rejected by the owner in the prototype: with
  a calendar and periodic notes on top it becomes a long scroll, and nothing is reachable while the
  panels are hidden.
- **Timeline plus filters**: one chronological list narrowed by facets. Rejected in the prototype:
  folder and type navigation become filter juggling.
- **A Types accordion that expands into notes**: rejected because it reads like a second file tree.
- **Hub pages with relationship tabs** in the editor area: rejected; relationships stay in the
  right sidebar (Backlinks, Outgoing links, Properties).

## Consequences

- Once active, this replaces ADR 0026's consequence that the file-tree sidebar is the default. The
  file tree survives as the Files navigator, folders only; a folder's files are listed in the note
  list.
- Every navigation surface shares one row style and one row context menu, so rename, delete and
  favorite behave the same whatever lens listed the note.
- The Calendar navigator keeps the sidebar entry points to weekly, monthly and quarterly notes and
  the free date picker for the Calendar tab, and adds one for yearly notes (periodic wikilinks
  already open all of them).
- The rail, navigator and note list together cost width; Cmd+1 / Cmd+2 hide and show the navigator
  and the list, and the rail never hides.
- Today's "last 1:1" counts notes whose `_related_to` links the person. The collection view engine
  cannot express it (its expressions evaluate one record), so it is a pure function over the vault
  entries snapshot.
- Cmd+D (Favorite) is taken from CodeMirror's select-next-occurrence, and Raw moves from Cmd+K to
  Cmd+\.
- Until the contract step two shells coexist, so shell-independent work (action bar, note date,
  theme tokens) must work in both.
- Re-evaluation trigger: the editor becomes too narrow to use with the panels open at common window
  sizes, or a new top-level area needs a rail slot that does not fit the lens model.
