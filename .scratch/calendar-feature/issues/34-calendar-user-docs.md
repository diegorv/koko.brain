# 34: Calendar user guide and project docs

**What to build:** users have a Calendar help page, `help/documentation/27-calendar.md`, that explains how to open and use the Calendar tab, the event note schema, which notes show, where new events go and the rules the calendar follows when it writes a note. The page is linked from the help index, from the related help pages and from the README feature list. Developers find `event-calendar` in the CLAUDE.md Project Structure and the `restore` source in Indexing rule 6. The archify runtime map shows six change sources. If the `archify` skill is not available (it was not found in the session that wrote this breakdown, and the repo has no `.claude` directory), both map files stay untouched and ticket 36 files the follow-up.

**Plan reference:** Task 33 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 772-802). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. Task 27 (plan line 637) also leaves one point to this page: a duplicate of an event whose frontmatter is lossy keeps its bytes, so the copy shows the original title.

**Blocked by:** 31, 32, 33

**Status:** ready-for-agent

**Touches:**
- `help/documentation/27-calendar.md` (new)
- `help/documentation/README.md` (modify)
- `help/documentation/08-periodic-notes-and-calendar.md` (modify)
- `help/documentation/18-trash.md` (modify)
- `help/documentation/19-settings.md` (modify)
- `help/documentation/20-keyboard-shortcuts.md` (modify)
- `help/documentation/25-types-and-relationships.md` (modify)
- `README.md` (modify)
- `CLAUDE.md` (modify)
- `docs/architecture/archify/kokobrain-runtime.architecture.json` (modify, only if the `archify` skill is available)
- `docs/architecture/archify/kokobrain-runtime.html` (modify, regenerated with the `archify` skill, only if it is available)

**Gate:** none (docs only). `git diff --cached --stat` lists only docs.

- [ ] `27-calendar.md` covers opening the tab, the views, the narrow-pane scrolling, creating, moving and resizing events, and how the tab differs from the sidebar month panel
- [ ] It covers the event note schema, the configurable event type (Settings > Calendar, and what to do after renaming the type), titles with `:` or `/` (sanitized filename plus `event_title`) and the Needs-attention reasons
- [ ] It covers which notes show (notes under the templates/system folder never do; archived events are hidden and counted) and a "Using existing Event notes" part: dateless `type: Event` notes (as taught in `25-types-and-relationships.md:477, 577`) are listed under "Unscheduled", not as problems; adding `date:`, plus `start` / `end` for a timed event, puts one on the calendar; a `date: 2024-03-02T14:00` value needs splitting into `date` and `start`
- [ ] It covers floating wall-clock times with no time zone (the grid always has 24 rows, also on 23 h and 25 h DST days) and where new events go: the event type `_folder` and template, the same as "New Event" in the type sidebar; template expressions such as `tp.date.now()` render the event's date; a template whose frontmatter has comments or nested values is refused
- [ ] It covers the write rules: frontmatter is reformatted to canonical YAML on the first calendar edit (ADR-0029); writes are refused when the frontmatter has comments, nested values, duplicate keys, conflicting alias keys, anchors or unparseable YAML; the ADR-0029 coercions still apply (empty values become `""`, list items become strings, alias keys become canonical); a calendar edit flushes the note's pending body edit, and deleting an event saves it first; duplicating an event whose frontmatter the calendar would refuse to rewrite copies its bytes unchanged, so the copy displays the original title (Task 27, plan line 637)
- [ ] It covers the undo scope and shortcuts (renames and moves made outside the calendar end the undo history for that event, with a toast), that a new event appears in text search after its first edit or the next vault open, that with the planned sync (`.scratch/p2p-sync`) conflict copies are ordinary Event notes and show as duplicate events until resolved, and a `.collection` recipe (`filter: _type == "Event"`, `dateProperty: date`)
- [ ] `help/documentation/README.md` has the page's row, and the page is cross-linked from `08-periodic-notes-and-calendar.md`, `18-trash.md` (restored notes are indexed at once), `19-settings.md` (new Calendar section), `20-keyboard-shortcuts.md` and `25-types-and-relationships.md` (Event notes with `date` show on the calendar)
- [ ] The `README.md` feature list mentions the Calendar
- [ ] `CLAUDE.md` Project Structure lists `event-calendar` under `features/` (`:65-68`); Indexing rule 6 adds `trash.service::restoreItem` to the write-path list (`:272`) and `restore` to the source list (`:274`), stating that it fires the Rust IPC on every call because nothing indexed the restored note
- [ ] Archify map: with the `archify` skill available, the `notechange` node's tag "5 change sources" becomes "6 change sources" in `kokobrain-runtime.architecture.json` and `kokobrain-runtime.html` is regenerated with the skill; without it, both files are untouched and the follow-up is left to ticket 36
- [ ] Gate green (`git diff --cached --stat` lists only docs); one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
