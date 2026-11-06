# A view dialog that edits the whole view

The New view / Edit view dialog (`src/lib/features/type-definitions/ViewDialog.svelte`) edits a name and filters. Everything else a `.view` reads is set by hand in YAML or not at all: no UI writes `limit`, `_sort`, `_order`, `_group` or `_rail_view`, or hides an existing view. The dialog also gives no feedback on what its filters match until it is saved, and a hidden view cannot reach it.

This feature turns the dialog into the one place to set up a view, with a live preview of the notes it lists, and fixes the view bugs that the dialog depends on. View engine and `.view` tab bugs found in the same sweep live in `.scratch/view-engine-fixes/`.

## Vocabulary

`.view` is the only file kind since view-unification (ADR-0004, 2026-11-05 amendment); `.collection` is retired. In these Issues:
- **`.view` tab**: a `.view` opened in an editor tab, shown as table, calendar or linear-calendar with a tab strip of its `views`. Code: `src/lib/features/collection/CollectionView.svelte`, `fileType: 'collection'`.
- **Inline block**: a ` ```collection ` fence in a note, which embeds the same YAML format.
- **The rail list**: the note list of a picked view.

The `collection` internal names (`features/collection`, `fileType`, the fence) stay, as ADR-0004 records.

## Owner decisions (2026-11-05)

- **Scope.** Under the name, four sections: **Filters** (with the live preview), **Sort & limit**, **Display**, **Behavior**. Collection-editor concerns stay out: view `type`, calendar keys, `order` (columns), `formulas`, `properties`, adding or removing views.
- **Layout.** One scrolling column of collapsible sections. Each section shows a one-line summary when collapsed (`23 notes`, `title, max 50`, `rocket, Work`, `pinned, hidden`). Filters starts expanded. New view and Edit view use the same sections.
- **Name with several views.** With one view in the file, the name is written as `_sidebar_label` and as that view's `name`. With several views, it is written as `_sidebar_label` only: view names are tab names in the `.view` tab, and the dialog never renames them. Behavior gets a selector for `_rail_view` (shown with several views); picking another view reloads This view's filters, the view sort and the limit from that view.
- **Save writes only what the user changed** (decided 2026-11-06, reversing the 2026-11-05 "save everything", after the research below). Save writes only the fields whose draft differs from what was loaded; an unchanged Save writes nothing. There is still no per-key conflict check: a field the user touched overwrites the file. With one view in the file, `views[0].name` follows the label only when it equalled the old label, so New table's `All` survives. Why: "save everything" was already lossy before any field was added (`research/synthesis-modal.md` R1, `research/synthesis-completeness.md` C1, C5):
  - An unchanged Save renamed the view to the label (`yaml-parser.ts:318`).
  - Every untouched filter went through the Filter panel round trip, which is not an identity: `x != true` becomes `x == false`, `x == date('X')` becomes `x == 'X'`, `x > '5'` becomes `x > 5`, `{and: []}` becomes JSON text, an empty `or` is dropped. Inline blocks run the raw filter, so their rows changed (`view-engine-fixes/08`).
  - Writing every field in canonical spelling would rename every alias (`icon:` to `_icon:`).

## Defaults taken by the agent (override any of them)

| # | Default | Why |
|---|---|---|
| D2 | The dialog's writer edits the parsed YAML Document (`parseDocument`, `set`, `setIn`, `delete`) instead of re-serializing, so comments, key order and untouched bytes survive | Checked on 2026-11-05 with the repo's `yaml` 2.9.1: head and inline comments survive `set`, `setIn` and `delete` with `toString({ lineWidth: 0 })`. ADR-0029:74 is about the frontmatter serializer, which builds a new document. `properties.logic.ts` already uses `parseDocument` |
| D4 | Edit view opens from three more places: the note-list row menu of a `.view` (hidden ones included), a new context menu on a rail pin, and a header menu on a view's rail list. It ships before the Behavior section can hide a view | Today `handleEditView` needs a visible Types row (`TypesNavigator.svelte:147-152`), so hiding a view from the dialog would remove the way back to it, and every New table file is already out of reach |
| D5 | Switching `_rail_view` while that view's filters, sort or limit are touched discards those edits, with an inline warning first | Simplest. A per-view draft adds state for a rare case |
| D6 | New view keeps writing `_sort: title`, shown as set in the Sort section | Today's behavior (`type-sidebar.logic.ts:353`) |
| D7 | "All views" filters can be added with a "+ All views" toggle when the file has none | Today the section shows only when root filters exist |
| D8 | A file whose YAML parses but has an invalid view entry still blocks the dialog | Today's behavior. Menu-only editing of a broken file can come later |
| D9 | The name is validated only when it is touched or the view is new | A Duplicate copy shares its label and opens with Save disabled today |
| D10 | Save is blocked while the preview reports a filter error and the filters were touched | Such a filter hides the rail's Sort and Filter (`RailNoteList.svelte:192`) |
| D12 | Renaming or deleting one of the views from the tab strip of a `.view` tab keeps `_rail_view` in sync (Issue 01), amending ADR-0027:40, which accepted a stale `_rail_view` | The `_rail_view` selector writes the key, so editor tab operations must not break it silently |

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| 01 | Tab rename and delete keep `_rail_view` in sync | | ready-for-agent |
| 02 | Edit view saves only what the user changed (draft, patch, Document writer) | 01 | ready-for-agent |
| 03 | Section layout and live Filters preview | 02 | ready-for-agent |
| 04 | Edit view opens from anywhere, hidden views included | 03 | ready-for-agent |
| 05 | Sort & limit section | 04 | ready-for-agent |
| 06 | Display section | 05 | ready-for-agent |
| 07 | Behavior section | 06 | ready-for-agent |

**Start (owner, 2026-11-06): the foundation first**, in two waves of two: 01 with `view-engine-fixes/02`, then 02 with `view-engine-fixes/01`. `view-engine-fixes/02` lands before 03, so the preview shows its error and failure count.

The Issues run in sequence. 01 and 02 share `yaml-parser.ts`; 02 to 07 share `ViewDialog.svelte`, `view-dialog.logic.ts` and help § View Files. 04 must land before 07, which lets the dialog hide a view.

## Out of scope

- A per-key conflict check on Save.
- The `.view` tab, the view engine and inline blocks: `.scratch/view-engine-fixes/`.
- The agent reference for `.view` files: `docs/agents/view-files.md`.

## Evidence

`research/` holds the sweep of 2026-11-05: 50 Haiku scouts, 15 Sonnet analysts, 10 Opus validators (`research/validated/`) and 5 Opus syntheses (`research/synthesis-*.md`). Nothing was run in the app. The agent re-checked in code: B1 (`renameView`/`removeView` ignore `_rail_view`), the dialog's always-sent `viewFilters` and `name` rewrite, and the Document API comment behavior. Line numbers are from `5f8003d67` and will drift. Each Issue starts with a failing test, and a failing test that does not fail is a finding to report, not something to patch around.
