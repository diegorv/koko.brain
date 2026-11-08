# View engine and `.view` tab fixes

The view-editor sweep of 2026-11-05 (`.scratch/view-editor/research/`) also looked at how views are shown: the rail list of a view, the Types navigator and pins, the `.view` tab (table, calendar, linear-calendar) and inline blocks. These Issues fix what it found outside the dialog. They are ranked by how likely the owner is to hit them: a single user who works in tables a lot, with no external sync.

## The problems

- **Silent wrong results.** A misspelled or wrong-type method drops notes with no error (02). Column and sort keys such as `file.tags` and aliases read null (03). A DESC sort lists notes without the value first, so a "top N" `limit` returns empty rows (04). The rail and the editor run a lossy round trip of the filter, so odd shapes list different notes than inline blocks do (08).
- **Destructive or misleading UI.** The tab strip's menu acts on the last right-clicked tab and Delete does not ask (01). Add filter writes an empty filter at once, and the picker offers keys the expression language cannot reference, which can lock the rail toolbar (07). Linear-calendar bars drift right in short months (05). Calendars hide notes without a date while the count includes them (06).
- **Missing affordances.** No view switcher in the rail for multi-view files (09); the rule line hides `limit` and the sort source (10); refused tab renames are silent and `addView` repeats `Untitled` (11); several view writers skip the prompt index refresh or fail silently (12); the Properties panel lists every vault property (13); New here misses the type in a `&&` filter (14); keyboard and labels in the `.view` tab (15); inline blocks cannot pick a view or change month (16).
- **Docs and tooling.** `help/documentation/12-collection.md` still presents "Collection" as the feature and has wrong examples (17). An agent has no way to check a `.view` without the app (18).

Vocabulary (`.view` tab, inline block, rail list) as in `.scratch/view-editor/PRD.md` § Vocabulary: `.view` is the only file kind; the `collection` internal names stay (ADR-0004).

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| 01 | Tab-strip menu acts on the right tab, and Delete asks first | 02 | ready-for-agent |
| 02 | Filters report unknown methods and per-note failures | | ready-for-agent |
| 03 | Columns and sort keys resolve like expressions | 02 | ready-for-agent |
| 04 | DESC sort lists notes without a value last | 03 | ready-for-agent |
| 05 | Linear-calendar bars line up with their day columns | | ready-for-agent |
| 06 | Calendars say how many notes have no date | 01, 03, 11 | ready-for-agent |
| 07 | The Filter panel cannot write an empty or unparseable filter | 01, 02 | ready-for-agent |
| 08 | The rail and the editor run the file's filter; bad shapes are errors | 04, 07, 09, 10, 15 | ready-for-agent |
| 09 | Rail view switcher for multi-view files | 07 | ready-for-agent |
| 10 | Rule line names the limit and the sort source | 09 | ready-for-agent |
| 11 | Small `.view` tab write feedback | 07 | ready-for-agent |
| 12 | View writers refresh promptly and fail loudly | | ready-for-agent |
| 13 | Properties panel matches the table's columns | 06, 11 | ready-for-agent |
| 14 | New here infers the type from a compound `&&` filter | 08 | ready-for-agent |
| 15 | `.view` tab keyboard and labels | 13 | ready-for-agent |
| 16 | Inline blocks choose a view and navigate months | 03, 06 | ready-for-agent |
| 17 | Help docs speak of views, and their examples work | 03, 14 | ready-for-agent |
| 18 | A `.view` checker for agents | 02 | ready-for-agent |

**Chains inside this feature** follow shared files: `CollectionView.svelte` (02, 01, 07, 11, 06, 13, 15, 08), `RailNoteList.svelte` (02, 07, 09, 10), `collection.logic.ts` (02, 03, 04, 08), `lens.logic.ts` (09, 10, 08), `collection-block-widget.ts` (02, 03, 06, 16). 05 and 12 touch none of them.

The order across both features is in `.scratch/view-editor/PRD.md` § Issues (reviewed 2026-11-06).

**Order against view-editor.** Each Issue that shares a file with `.scratch/view-editor/` names the view-editor Issue to run after in its Notes ("Run after (other feature)"). relay-lite does not enforce it across features:
- 01: after view-editor 01 (shared test file `CollectionView.view-writes.test.ts`).
- 02: **before** view-editor 03 and 04 (`queryViewLens`, `RailNoteList.svelte`), never in parallel with them.
- 04: before view-editor 05, so 05 needs no DESC info line.
- 11: after view-editor 02 and before view-editor 05, so 05's limit field meets only integers.
- 07: never in parallel with view-editor 04 (`RailNoteList.svelte`).
- 10: after view-editor 04 (`RailNoteList.svelte`).
- 08: after view-editor 03 (`lens.logic.ts`).
- 09: after view-editor 07 and 04.
- 12: beside view-editor 04 or after view-editor 07, never in parallel with view-editor 02, 03, 05, 06, 07 (`type-sidebar.logic.ts`, `type-definitions.service.ts`).

## Owner decisions (2026-11-06)

- **04**: notes without the value sort last in both directions; the pinned test may change.
- **08**: a list or a map without `and`/`or`/`not` under `filters:` becomes a filter error everywhere; the rail and the `.view` tab run the filter as written.
- **11**: `limit` must be a finite integer of at least 1; anything else is a parse error.
- **16**: the inline block key is `_block_view`.
- **18**: the checker is a vitest file driven by an environment variable; no new dependency.
- **Usage**: the owner's vault has property names with accents or spaces (07 is urgent); the owner does not use calendar or linear-calendar views (06 and 05 rank low).

## Not proposed

- Bases parity (`groupBy`, `summaries`, `columnSize`, `this`, `file.links`, `hasLink`): the owner's workflow does not depend on them. `docs/agents/view-files.md` lists them as ignored.
- The rail re-read and re-query on every entries bump, and the property-index rebuild per editor: not measured.
- `link()` cells inside a clickable row: tracked as `audit-2026-11-04/08`.
- `ux-polish/53` looks done for `.view` (`layout.logic.ts:23-28`, per `research/validated/A14.md`); the owner can close it.

## Evidence

`.scratch/view-editor/research/synthesis-visualization.md` (B1 to B11, I1 to I11) and `synthesis-issues.md` (List 2). The agent re-checked 01 (`tabContextIndex` never cleared), 04 (`compareForSort` and the DESC negation) and 05 (`daysInMonth` over a 31-column track) in code. Nothing was run in the app. Line numbers are from `5f8003d67`.
