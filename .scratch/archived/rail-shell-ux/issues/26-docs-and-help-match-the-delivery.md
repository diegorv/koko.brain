# 26: Docs, help pages and examples match everything this delivery shipped

**What to build:** A final sweep after Issues 01-25 land, so the help folder, the examples and the docs describe the app as it now is, in one consistent voice. Every page that mentions the rail, lenses, the note list, Types > Views, `.view` / `.collection`, filters, types, lifecycle, meta-bind, QueryJS or Settings is read against the current code and corrected. The examples gain working samples of the new keys and flows. Drift the review found that no earlier Issue fixed is fixed here. Nothing in `src/` changes, except help-related tests when an example changes.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24

**Status:** resolved

**Gate:** docs and examples: `pnpm vitest run src/tests/help` (the example scoping, QueryJS contract and type-definitions view tests read `help/`). Add `pnpm check` when a test under `src/tests/help/` changes, and the full frontend gate (`pnpm check` + `pnpm vitest run` + `pnpm build`) only if a file under `src/` outside `src/tests/help/` changes.

- [x] One reference table of every `.view` key (top level and per view) in help 25, with type, default and effect: `_sidebar_label`, `_order`, `_sort`, `_open_in_editor`, `_list_properties_display`, `_icon` / `_color` / `_title_color`, `_group`, `_visible`, `_rail`, `_rail_view`, and the per-view keys; help 12 links to it instead of repeating it. Each row is checked against the parser and row builder
- [x] One reference table of every type-definition key in help 25 (including `_rail`), with the dead ones removed from the help or marked as not applied (wiring them is a behaviour change, out of scope here): `_view` and type `_sort` say what they do today, and the built-in type icons and colours are documented only if they are applied (review F61)
- [x] Help 12 says when to use `.collection` (editor tables and calendars) and when `.view` (menu entries), consistent with Issue 22
- [x] Help 07, 01 and 02 describe the rail as shipped: rail items and their order, pinned items, Settings > Rail, Cmd+1 / Cmd+2 and the palette Go to commands, the Views section (groups, hidden views, Move to Trash, New / Edit view dialog), the error and loading states of a view
- [x] Help 19 lists the Settings groups and sections as they appear in `SETTINGS_SECTION_GROUPS`, including Rail, the corrected Explicit organization text, the Inbox badge switches, the settings.json backup and "quit before editing" note, and the Auto Move debounce unit the UI uses (review F62)
- [x] Help 20 lists every keybinding and command the delivery added or renamed ("Toggle Rail Panels", hide/show rail panels, Go to, Open view)
- [x] Help 13 (QueryJS): what `kb.pages()` returns after Issue 12, the cache invalidation on save (review F43), the "Always" auto-run wording matching the code and the Settings text (review F63), no claim that Collection runs on QueryJS; Settings > QueryJS points to a section that exists (review F62)
- [x] Help 24 (meta-bind): typed writes, alias keys, table-cell inputs (Issue 07), and the button fields that are actually read; unread fields (`newTab`, `openNote`, `id`, `hidden`) are removed from help and from `help/examples/markdown-editor-vault/19-meta-bind.md` or marked as not supported (review F64)
- [x] Help 25 lifecycle: the `_organized` default (Issue 08), Explicit organization and the creation paths it covers (Issue 16), which lenses list type definitions and `.view` files (Issue 12); help 22 says type `_archive_to` needs Auto Move on (review F58)
- [x] Copy that names one concept two ways is unified across help and Settings text: Favorites vs Pinned, "Left Sidebar", "Sidebar" for the right sidebar only, Base folder of Periodic Notes also deciding Cmd+N and "+ New here" notes, system folder hidden from which lists (review F08, F14, F35)
- [x] `help/examples/type-definitions-features/` has working samples of the new `.view` keys (a grouped view, a hidden view, a pinned view, a multi-view `.view` with `_rail_view`, a filter with a date operator) and a pinned type; its README lists them and no longer puts lifecycle buttons in the Properties panel; `src/tests/help/type-definitions-views.test.ts` and `examples-scoping.test.ts` cover the new samples (extend, do not weaken)
- [x] `help/examples/collection-features/` samples still parse and run after Issues 02-06 and 13 (nested filters, date filters, filter errors, `limit` after ordering); any sample that relied on old behaviour is updated
- [x] `docs/FEATURES.md` matches the shipped features (no Tags panel claim, rail shell features listed); `docs/SEARCH.md` and `README.md` agree on the semantic model size (review F62)
- [x] ADRs read together without contradiction: ADR 0026 (type definitions; the removed `TypeSidebar.svelte`, `_sort`, `_view`, Explicit organization), ADR 0027 (every new underscore key listed once), ADR 0033 (pins, Settings > Rail, palette commands), ADR 0004 (the `.view` / `.collection` roles). Amendments are added, history is not rewritten
- [x] `help/documentation/README.md` and the help page list are in order, with no page describing removed UI

## Notes

- **Owner request (2026-11-04):** the delivery ends with an Issue that leaves docs and the help folder organized and up to date, documentation and examples.
- **Why one Issue at the end:** each earlier Issue updates the help lines for its own change; this one reads the pages as a whole after all of them, fixes what they missed and the drift no Issue owned (review section 4.5: F61, F62, F63, F64, plus F14, F35, F43, F58).
- **Method:** for each claim in a page, find the code that implements it; when the page and the code disagree, the code wins unless the code is a bug filed elsewhere, in which case the page describes the current behaviour and links nothing internal.
- **Language:** help pages and examples are English; example note names in Portuguese that already exist stay as they are.
- **Out of scope:** new features, and any behaviour change found during the sweep (file a new Issue instead).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` sections 4.5 and 8.
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/26-docs-and-help-match-the-delivery`: help pages 01, 02, 07, 12, 13, 19, 20, 22, 24, 25 and the help README brought in line with the shipped rail shell; `.view` and type-definition key tables in help 25; new `.view` samples in `help/examples/type-definitions-features/` with extended help tests; FEATURES.md, SEARCH.md, README.md and ADR 0004/0026/0027/0033 amendments. Fix round after review 1: Inbox can be hidden, dead type keys marked, sidebar wording unified. Tests: pnpm check exit 0; src/tests/help pass; full suite at df7b718b4: 491 files, 11657 tests passed, pnpm build passed (exit=0). Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md, no findings).
