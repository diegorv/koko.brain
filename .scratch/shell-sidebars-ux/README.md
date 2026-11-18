# shell-sidebars-ux

The design review of 2026-11-17 (`.scratch/design-review/review.md`) groups its proposals by surface, one prototype page per group in `.scratch/design-review/prototypes/<group>.html` (listed by `.scratch/design-review/index.html`). This folder carries three groups: the right sidebar (`prototypes/right-sidebar.html`), the note list and rail (`prototypes/note-list-rail.html`) and the app shell (`prototypes/shell-tabs-navigation.html`), 35 proposals in all.

Each proposal was checked against the code at `ab143a411` by a scout (`research/raw/Pxx.md`), a cluster analyst (`research/scout-<cluster>.md`) and an adversarial verdict (`research/verdict-<cluster>.md`), then combined in `research/breakdown.md` and checked by `research/coverage-check.md`. The breakdown proposed 45 tickets; the owner asked for close improvements to be grouped and approved the consolidated 34 below on 2026-11-17. `breakdown.md` keeps the old 01-45 numbering; each ticket's Origin line names the old tickets it merges.

## Owner decisions (2026-11-17)

- Granularity: the 34 consolidated tickets.
- Navigation (31 to 33): Replace. A plain click on a note row or link replaces the active unpinned markdown tab; Cmd/Ctrl+click and middle click open a new tab; Back undoes.
- Rail (29, 30): Tasks, Graph and Tags get rail entries, on by default and hideable. No direct rail shortcuts for now, so 30 stays needs-info.
- Files tree (14): the configured System and templates folders go last and muted, root level only, a custom order turns it off, counts are the direct file count.
- Tab labels (22): markdown tabs drop `.md`.
- Every other question in `research/breakdown.md` "Consolidated owner questions" ships with its recommended default; each ticket's Comments name the defaults it uses.

## Tickets

| NN | Ticket | Proposals | Blocked by |
|----|--------|-----------|------------|
| 01 | Palette commands toggle each right sidebar panel and open Trash | P104, P105 | none |
| 02 | Calmer status bar: 24px, no pulse, a save slot that does not shift | P176 | none |
| 03 | My people: setup button, "Nd ago", overdue icon, row ring | P120 | none |
| 04 | A refused property rename reverts and says why; list chips edit in place | P44, P122 | none |
| 05 | Right sidebar headers pinned with a Hide panel menu; Properties collapses; Info header and short dates | P43, P177, P123 | 01 |
| 06 | Backlinks and Outgoing stay open, show the open note's links; readable backlink rows | P71, P72, P74 | 05 |
| 07 | Outgoing links: only missing targets are broken, a Broken links group that creates the note | P75 | 06 |
| 08 | Table of contents: no decorative chevrons, current heading, Go to heading picker | P115 | none |
| 09 | Relationships: only kinds with links, one Add row, keyboard picker | P46 | none |
| 10 | Set type row, typed Add property, lossless type menu | P45 | 04 |
| 11 | Property rows stack key over value in a narrow sidebar | P121 | 04, 10 |
| 12 | The rail note list says why it is empty and what to do next | P29 | none |
| 13 | Files header "+" menu, every creator says "New <kind>" | P38 | none |
| 14 | Folder-lens rows stop repeating the folder; system folders last with counts | P117, P119 | 13 |
| 15 | One note-actions group (row menu, More, palette) with Mark organized on Inbox rows | P39 | 12, 14 |
| 16 | Filters show a count and Clear; named `.view` triggers; filter-aware empty table | P84 | 12 |
| 17 | Note-list header: Display popover, state dot, "+" visible down to 150 px | P33 | 16 |
| 18 | Shared roving-list util and arrow keys in Search results | part of P24 | none |
| 19 | Rail note list: one Tab stop, arrow keys, focus follows removals and rename | P24 | 12, 15, 18 |
| 20 | Palette "Go to X" lands focus in the note list; "New note here" command | P37 | 13, 19 |
| 21 | Tab strip shows what is off screen, tabs shrink, the toggle stops covering them | P34, P98 | none |
| 22 | Drag-reorder tabs, full path on hover, labels without `.md` | part of P34 | 21 |
| 23 | Tab menu: Close others, Close to the right, note actions | part of P39 | 15, 22 |
| 24 | Clickable breadcrumb (type and folders, no `.md`) and Reveal in note list | P102 | none |
| 25 | Kanban, `.view` and canvas title rows; source mode per tab | P18 | 16 |
| 26 | The empty editor becomes a launch point, no empty right sidebar | P97 | none |
| 27 | Zoom shows a chip and is remembered on this machine | P99 | none |
| 28 | Switch vaults: palette commands, Cmd+Shift+O, File menu | P103 | none |
| 29 | The day navigator stops being called Calendar; Tasks, Graph and Tags rail entries | P36 | none |
| 30 | Direct keys for rail items (needs-info) | part of P37 | 29 |
| 31 | Note-list rows open in the active tab with a per-tab history | P35 | none |
| 32 | Back and Forward: keys, palette, action bar, mouse buttons | part of P35 | 31 |
| 33 | Links follow in the active tab; the open-link modifier opens a new tab | part of P35 | 06, 07, 31 |
| 34 | One `pane-band` utility for the top-band copies (land last) | part of P18 | 17, 18, 21, 25, 26, 29 |

Free to start: 01, 02, 03, 04, 08, 09, 12, 13, 18, 21, 24, 26, 27, 28, 29, 31. A "Blocked by" edge means the later ticket builds on code or state the earlier one adds, or rewrites the same lines; each ticket's "Sequence with" section lists same-file overlaps that need only a rebase.

## Replaced open-itens Issues

`.scratch/open-itens` is abandoned. Each fully replaced Issue is marked wontfix with a pointer; partial ones keep their Status with the moved part removed.

| Old Issue | Replaced by | Whole or part |
|-----------|-------------|---------------|
| 014 Backlinks and Outgoing links always show the open note | 06 | whole |
| 046 Outgoing links marks a row broken only when its target is missing | 07 | whole (attachment-row criterion revised) |
| 156 relationship picker navigates with arrow keys | 09 | whole |
| 210 NoteInfo and Relationships heading follow the sidebar section recipe | 05, 09 | whole |
| 153 tab strip shows overflow and hides the .md extension | 21, 22, 24 | whole |
| 204 EmptyState, InlineAlert and Badge primitives | 12 | EmptyState half |
| 209 search results and link rows reserve a gutter | 06 | LinkItem half |
| 140 `.view` tab keyboard and labels | 16 | bullet 1 (toolbar names) |
| 207 chrome icon buttons share sizes and tooltips | 17 | note-list header clause |

## Not in this folder

Open-itens 023 (File History restore writes into the active tab) and 027 (an unparseable canvas is overwritten) stay open with no live owner; 205 (sidebar panels use the empty and error primitives) is not replaced. See `research/breakdown.md` "Open-itens Issues that stay open".
