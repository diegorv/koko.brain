# PRD: Icon rail and one note list replace the left-sidebar modes

Status: approved by the owner on 2026-10-31 (prototype variant A, then a 28-question grilling).
Decision record: [ADR 0033](../../docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md),
`proposed` until the rail shell becomes the default; that ticket sets it `active` and amends
ADR 0026.

## Sources

- Discovery: `.scratch/ux-sidebar/discovery-2026-10-31.md` on the local branch
  `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). The
  synthesis wins where the `work/01..05` reports disagree with it.
- Tolaria comparison, including its note action bar: `.scratch/ux-sidebar/work/06-tolaria-comparison.md`
  on the same branch.
- Prototype (throwaway, in-memory fake vault): `src/routes/prototype-sidebar/` on the same branch.
  `VariantA.svelte` is the approved layout, `NoteToolbar.svelte` the action bar,
  `proto.svelte.ts` the lens model. Run it with `./node_modules/.bin/vite dev --port 1430` in the
  `ux-sidebar-discovery` worktree and open `/prototype-sidebar?theme=<name>`; restart the server after
  every edit (vite ignores `/.claude/` in its watcher).
- Independent bug tickets on main: `.scratch/sidebar-fixes/issues/01-08`. Several of them touch
  the components this feature reuses; see "Ordering with sidebar-fixes".

## Problem

The left sidebar has three modes (Files, Types, Calendar) plus a hidden fourth (Search) that are
three different kinds of tool sharing one slot. Each grew its own header strip (duplicated in three
files), its own context menu, rename flow, pin concept and empty state. Switching needs the sidebar
visible and Search closed. Types is the only mode that opens a second, resizable column. Bookmarks
are set but never listed. Lifecycle actions (Organize, Archive, Favorite) sit inside the Properties
panel and vanish when the right sidebar is hidden. The default mode is `types` while ADR 0026 says
the file tree is the default.

## Goal

One navigation model: every pick on the left is a **lens**, every lens fills the same **note list**,
and "New here" in the list creates a note that inherits what the lens knows. A per-note **action
bar** puts the lifecycle and view actions above every note.

## Terms

These are the words the tickets use. "Collection" is not used for the new concept because it
already names the `.view` collection feature.

| Term | Meaning |
|------|---------|
| Rail | The always-visible icon column at the far left. |
| Lens | What the user picked: a rail item, or a navigator entry (a type, a view, a day, a folder), or a note's neighbourhood. A lens resolves to a label, a plain-language rule and the notes to list. |
| Navigator | The panel between the rail and the note list, shown only for Types, Calendar and Files. A pick there sets the lens. |
| Note list | The single list column every lens fills: a header (label, rule, "+ New here") and one row style. |
| Action bar | The bar above every markdown note (Tolaria's BreadcrumbBar). |
| Hub | A note whose type definition sets `_hub: true`; it offers "New linked note". Person notes offer "New 1:1". |
| Note date | The day a note belongs to: frontmatter `date`, else frontmatter `created`, else the file's disk creation time. |

## Layout

```
Rail (48 px) | Navigator (Types / Calendar / Files only) | Note list | Editor tabs + action bar + editor | Right sidebar
Status bar
```

- The rail uses the app background (`background` token), readable icons, and a highlighted active
  item. It never hides.
- Navigator and note list are resizable panes with their own saved sizes (the classic shell's sizes
  are untouched).
- Cmd+1 hides the navigator and the note list; Cmd+2 shows them. Cmd+Shift+B toggles the same pair.
- The editor tabs keep today's look and behavior. Cmd+B toggles the right sidebar.
- The right sidebar works as today (Properties, TOC, Backlinks, Outgoing links), including the
  auto-hide on the Calendar and Tasks tabs and the collapse of TOC / Backlinks / Outgoing on tab
  switch (commit `77c8cbcd`, performance). Relationships live there; there are no hub pages.

## Rail

From the top: **Search**, **Inbox** (count badge), **Today**, **Favorites**, a divider, **Types**,
**Calendar**, **Files**. **Archive** sits at the bottom. There is no Reading entry.

## Lenses

| Lens | Note list shows | Rule text (example) | "+ New here" creates |
|------|-----------------|---------------------|----------------------|
| Inbox | Not organized, not archived, not a type definition: today's predicate, unchanged | "not organized, not archived" | A plain note with `_organized: false` |
| Today | Pinned (favorites), then My people, then notes whose note date is today | "pinned; my people by last 1:1; note date is today" | A plain note with `date: <today>`; the header also has "Daily note" |
| Favorites | `_favorite: true`, not archived | "favorite, not archived" | A plain note with `_favorite: true` |
| Archive | `_archived: true` | "archived" | Nothing (no button) |
| Search | SearchPanel results, with match snippets | the query | Nothing (no button) |
| Type | Notes of that type, not archived | "type is Project, not archived" | A note of that type in the type's folder, from the type's template (today's `createNoteOfType` path) |
| Untyped | Notes with no type, not archived (only when `showUntypedNotes` is on) | "no type, not archived" | A plain note |
| View | The `.view` query result, ordered by its Sort | the view's label | A note of the view's type when the view filters exactly one `_type`, else a plain note |
| Day | Notes whose note date is that day | "note date is 2026-10-27" | A plain note with `date: <that day>` |
| Folder | The folder's direct children, every file kind (markdown, canvas, kanban, `.view`, PDF, image) | "in Work/projects/" | A note in that folder |
| Neighbourhood | The note, then its outgoing links, backlinks and relationship groups | "Project Alpha and everything linked to it" | Nothing (no button) |

- "A plain note" lands where Cmd+N puts one today (the quick-capture folder).
- The note list has no Open / Archived / Favorites tabs: archived notes live in Archive, favorites in
  Favorites. The view Sort and Filter popovers stay in the header for view lenses.
- Row: type icon, title, a subtitle (type, note date, folder), and the `_list_properties_display`
  pills when the type or view sets them. Inbox notes show in italics. Search rows are the existing
  search result rows.
- Each row keeps the file operations of today's Types note list (open in new tab, duplicate, copy
  path, change icon, favorite, reveal, rename, move to trash), and rows can be dragged onto a
  navigator folder to move them.

### Today

1. **Pinned**: every favorite, not archived.
2. **My people**: the markdown files directly in `oneOnOne.workPeopleFolder` (the work half of the
   1:1 picker's list), each with the days since their
   last 1:1 ("never" when none), flagged with the `warning` token past `oneOnOne.dueAfterDays`
   (a new setting, default 14). Each row offers "New 1:1".
3. **Today**: notes whose note date is today.

A **1:1** for a person is any note whose `_related_to` links that person, wherever it lives. Its
day is its note date; "last 1:1" is the latest such day. Body wikilinks and folders do not count:
with the default settings the 1:1 folder is the same as the daily, weekly, monthly and capture
folders, so a daily note that mentions a person would otherwise reset their count. Older 1:1s
without `_related_to` do not count; "New 1:1" always writes it from now on. The collection view engine cannot express this (its
expressions evaluate one record and have no cross-note aggregate), so it is a pure logic function
over the vault entries snapshot.

## Navigators

- **Types**: Views, then Types with counts, then Untyped when `showUntypedNotes` is on. A flat list,
  not a tree of notes. "New view" and "New type" stay, as do today's type and view context menus
  (new note of type, rename type, open definition, copy path, change icon, reveal).
- **Calendar**: the mini month (respecting `weekStartsOn`), then the periodic notes for the shown
  period (week, month, quarter, year; each opens or creates its note), then "Open Calendar tab",
  which opens the Calendar tab on the picked day. Picking a day sets the Day lens and offers that
  day's daily note. This keeps the sidebar's entry points to weekly, monthly and quarterly notes
  and the free date picker, and adds one for yearly notes (periodic wikilinks already open all of
  them).
- **Files**: folders only. Picking a folder sets the Folder lens. Folder operations live on the
  navigator rows (new folder, new note / canvas / kanban / collection in it, rename, delete, move by
  drag, folder note, change icon, reveal, copy path). Expanded folders persist.

## Note action bar

Above every markdown note (not on canvas, kanban, graph, calendar, tasks or collection tabs), in
both shells.

- **Left:** the note's type (or "Note"), then the filename.
- **Hub actions:** "New 1:1" on Person notes (reuses the 1:1 note creation, and always writes
  `_related_to: [[Person]]` even when the template does not); "New linked note" on hub notes (a plain
  note with `_belongs_to: [[hub]]` in the hub's folder).
- **Right, in order:** Favorite (Cmd+D, filled when on), Organized (Cmd+E, filled when on),
  Neighbourhood (rail shell only), Raw (Cmd+\), note width (normal / wide, one global setting),
  TOC (shows the right sidebar with the TOC section open), Reveal in Finder, Copy path (absolute), a
  More menu (Copy deeplink as `kokobrain://open?...`, Archive or Restore, Delete), and the
  right-sidebar toggle.
- When the bar runs out of width, Neighbourhood, width, TOC and the two path actions fold into More.
- The bar replaces `LifecycleActions` in the Properties panel. Its writes read and update the
  active note's own frontmatter, not the Properties panel's store, which is only filled while the
  right sidebar is shown (it is hidden by default).

## Shortcuts

| Key | Action | Change from today |
|-----|--------|-------------------|
| `/` (outside text input) | Search on the rail | new |
| Cmd+Shift+F | Search on the rail (rail shell); SearchPanel (classic) | rail shell routes it |
| Cmd+1 / Cmd+2 / Cmd+Shift+B | Hide / show / toggle navigator + note list | Cmd+1/2 new; Cmd+Shift+B retargeted in the rail shell |
| Cmd+D | Favorite | taken from CodeMirror's select-next-occurrence (removed from the editor keymap) |
| Cmd+E | Organized | new |
| Cmd+\ | Raw | moved from Cmd+K; Cmd+K becomes free |
| Cmd+B | Right sidebar | unchanged |
| Cmd+Shift+E | nothing | the Cycle Sidebar View command and its rebindable setting are removed with the classic shell |

Multi-cursor "select next occurrence" is left without a shortcut: Cmd+Shift+L stays "copy block
link", which already wins over CodeMirror's select-all-matches.

## Theming

Every built-in theme (all of `BUILTIN_THEMES`) must look right. New UI uses the region tokens
(`file-explorer-*` for rail, navigator and note list; `right-sidebar-*`, `editor-*`, `tab-*`,
`status-bar-*`) and never hard-coded colors. Two additions to the UI colors of every built-in theme,
also exposed in the theme editor and covered by the theme builder:

- A categorical type palette: one token per palette name (red, orange, yellow, green, teal, blue,
  purple, pink, gray). `_color` is the icon picker's color key and is rendered as a CSS color
  today. When its value is a palette name it resolves to that theme token; any other value (a hex
  from the picker) is used as it is today. Type icons inherited by a type's notes and tabs follow
  the same rule.
- A `warning` token, used for the overdue 1:1 days.

## Persistence

The rail shell saves in layout settings: the active rail item, the current lens (folder path, type
name, view path or day) and the Files navigator's expanded folders. A saved lens whose target no
longer exists falls back to Today. Open tabs and the calendar position are out of scope.

## Code placement

ADR 0003 lets `features/` import only `core/` and `utils/`. So:

- The rail shell, the lens model, the note list and the action bar live in `features/`.
- The note-date rule is a pure function in `utils/`, used by `plugins/calendar` and the lenses.
- Parts that need plugins register into the rail shell instead of being imported by it: the
  Calendar navigator and Day lens (`plugins/calendar`, `plugins/periodic-notes`), Today's My people
  and the "New 1:1" action (`plugins/one-on-one`). Each registration is wired at vault open,
  unwired at teardown, and pinned by a test, as the note-change consumers are.
- The shell is mounted from `AppShell`, which already composes the sidebar's feature and plugin
  components today.

## Rollout (expand-contract)

1. **Expand:** a `layout.shell` setting (`classic` | `rail`, default `classic`) chosen in Settings.
   The rail shell is built beside the classic modes. The action bar, the note-date rule and the theme
   tokens ship to both shells because they do not depend on the rail.
2. **Migrate:** each lens, navigator and entry point moves to the rail shell in its own ticket.
3. **Flip:** the default becomes `rail`, for new and existing settings; help pages describe the new
   shell.
4. **Contract:** bookmarks migrate into favorites and the bookmarks feature goes; then the classic
   shell goes: `layout.sidebarMode`, the mode toggle, the three header strips, the old Files / Types
   / Calendar panels that nothing reuses, the Cycle Sidebar View command and keybinding setting, and
   `layout.shell` itself. Loading old settings drops the stale keys.

### Bookmark migration

One-time, on vault open: every bookmarked markdown file gets `_favorite: true`. Bookmarks on folders
and non-markdown files cannot carry frontmatter; they are listed in one toast and dropped. Then the
Bookmark menu item, the bookmarks feature and `.kokobrain/bookmarks.json` are removed.

## Ordering with sidebar-fixes

The `/next-issue` workflow resolves "Blocked by" only inside one feature folder, so these edges are
written as file paths and are done when the file is gone from `main`:

| sidebar-fixes ticket | Blocks |
|----------------------|--------|
| 01 file-tree failure toasts | the folder operations ticket (the new handlers follow its toast pattern) |
| 02 dead trash hint | the row prefactor (it extracts the row context menu that 02 edits) and the classic removal |
| 03 view sort order | the row prefactor (same note list file) and the View lens |
| 04 week start, 05 today and month label | the Calendar navigator |
| 07 stale cycle hint and Settings text | the rail shell's first ticket (same Settings section) and the classic removal |
| 08 help pages | the default flip (both rewrite the same help pages) |

06 (natural sort) does not block. Each ticket writes these as "also blocked by `<path>` in another
feature: do not start while that file exists on `main`", with no bare number that could be read as
a ticket of this feature.

## Decisions log

| # | Question | Decision |
|---|----------|----------|
| Q1 | Inbox rule | Today's predicate unchanged; `_organized` default, periods and "Explicit organization" go to a later data-rules phase |
| Q2 | Note date | `date`, then `created`, then disk creation time; one function used by Today, the Day lens and the mini-month dots |
| Q3 | My people | Person notes in `oneOnOne.workPeopleFolder` |
| Q4 | What a 1:1 is | Revised after review: any note whose `_related_to` links the person (the 1:1 folder is shared with daily and capture notes, so folder plus any link over-counted); threshold setting `oneOnOne.dueAfterDays` = 14 |
| Q5 | Reading | Removed from the rail |
| Q6 | Old modes | Full expand-contract behind `layout.shell`; Cmd+Shift+E freed with no replacement |
| Q7 | Bookmark vs Favorite | Migrate markdown bookmarks to `_favorite`, toast and drop the rest, remove bookmarks |
| Q8 | Favorites vs Today's Pinned | Keep both |
| Q9 | Editor frontmatter chips | Out of scope (follow-up) |
| Q10 | Cmd+D | Favorite everywhere; `Mod-d` leaves the editor keymap |
| Q11 | Raw key | Cmd+\ only; Cmd+K freed |
| Q12 | Cmd+1 / Cmd+2 / Cmd+Shift+B | All act on navigator + note list; the rail never hides |
| Q13 | Theming | Type palette + `warning` tokens in every built-in theme; a `_color` palette name resolves to its token, a hex stays as is |
| Q14 | Search rows | Existing search result rows with snippets |
| Q15 | Files | Direct children, every file kind, folder ops on the navigator and file ops on the list |
| Q16 | "New here" elsewhere | As in the Lenses table |
| Q17 | Action bar rollout | Ships first, in both shells; removes `LifecycleActions`; Neighbourhood only in the rail shell |
| Q18 | Hubs | `_hub: true` on the type definition; Person gets "New 1:1" |
| Q19 | 1:1 link | The app always writes `_related_to: [[Person]]` |
| Q20 | Restart | Rail item, lens and expanded folders persist |
| Q21 | sidebar-fixes ordering | Blockers written as file paths |
| Q22 | ADR | New ADR 0033 plus a dated amendment on 0026 |
| Q23 | Note width | One global setting |
| Q24 | Daily note | In the Today header; "Open Calendar tab" only in the Calendar navigator and on Cmd+Shift+C |
| Q25 | Note list tabs | Removed in the new list; classic keeps them until it goes |
| Q26 | Row | Prototype row plus `_list_properties_display` pills |
| Q27 | Inbox triage bar | Not now; returns with the Inbox data rules |
| Q28 | Export PDF | Not in this feature; the More menu ships without it |

## Out of scope and follow-ups

- **Inbox data rules:** the `_organized` default (flipping it floods the Inbox with about 10k
  imported notes), inbox periods, auto-advance, the unread "Explicit organization" setting, and the
  prototype's triage bar.
- **Export PDF:** no export exists in the app; it needs its own discovery.
- **Editor frontmatter chips** duplicating the Properties panel.
- **Reading** as a type or folder lens.
- Reveal-active-file, arrow-key navigation and multi-select in the lists (discovery finding 4).
- The prototype's workflows guide, hub page tabs, a single stacked sidebar with no rail, a
  timeline-plus-filters layout and a Types accordion that reads like a file tree were rejected; do not
  reintroduce them.

## Risks

- **Width.** Rail, navigator, note list and right sidebar together leave the editor narrow at
  1440 px (the discovery measured about 430 px with today's Types mode). Cmd+1 is the escape hatch;
  check the default pane sizes in the flip ticket.
- **Shortcut loss.** Cmd+D and Cmd+K change meaning for existing muscle memory.
- **Two shells at once.** Until the contract ticket, shell-independent work (action bar, tokens,
  note date) must work in both, and every rail ticket must leave the classic shell unchanged.
- **Cross-feature blockers** depend on the issue picker reading the file-path edges correctly.
