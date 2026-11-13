# Issue 26 discovery

Docs sweep after Issues 01-25. Each claim below was checked against the code named.

## Files and changes

- `help/documentation/25-types-and-relationships.md`: type keys table (24-74) rewritten as the one reference (from `extractTypeMetadata`, `type-definitions.logic.ts:101-120`; icons via `file-icons.logic.ts:100-122`): built-in icon/colour table removed (`BUILTIN_TYPES` icon/color have no reader; only its `order` applies), `_view` and type `_sort` marked "not applied", `_icon` default "none". `.view` table (401-414) gains a Type column and the per-view keys (`yaml-parser.ts:40-120`, `collection.types.ts`), `columnSize`/`groupBy`/`summaries` marked unused. New "When a view cannot be shown" (Loading..., "This view no longer exists", "This view cannot be shown" + Open view, red mark on the row: `RailNoteList.svelte:527-555`, `TypesNavigator.svelte:395-455`). Today/Favorites wording, "Settings > Types", aliases `view` row.
- `help/documentation/12-collection.md`: link to help 25 key table, New Collection has no rename mode (`FilesNavigator.svelte:87,121-126`), `limit` after ordering, no "uses QueryJS internally" (466).
- `help/documentation/13-queryjs.md`: drop "used by Collection" (14, 1298); policy table "Always" = runs on a cache miss with no first-open mark (`queryjs-block-widget.ts:128-136`); any save, watcher change or Trash restore clears every result (`editor.hooks.ts:83`, `watcher-handler.service.ts:75,115`, `trash.service.ts:259`).
- `help/documentation/19-settings.md`: groups from `SETTINGS_SECTION_GROUPS` (`settings.logic.ts:217-262`: Calendar in Notes, Sentry in Integrations), Sentry section, Auto Move debounce in seconds 0.5-30 default 3 (`AutoMoveSection.svelte:123-136`), QueryJS policy text, Templates and Periodic Notes text.
- `help/documentation/01-getting-started.md`, `02-file-explorer.md`, `07-sidebar-panels.md`: a Rail section in 01 (items, order, pins, Settings > Rail, Cmd+1/2, Go to, Views); 02 folder menu New view, row menu Convert to view; 07 states it is the right sidebar only and links the rail.
- `help/documentation/22-auto-move.md`: `_archive_to` needs Auto Move on (`auto-move.service.ts:96`), generated rules are not listed in Settings; fix `#file-icons` anchor (help 02 has `#custom-file-icons`).
- `help/documentation/24-meta-bind.md` + `help/examples/markdown-editor-vault/19-meta-bind.md`: `newTab`, `openNote`, `id`, `hidden` are declared but never read (`meta-bind-button.logic.ts:20-49`; widget reads only label/style/tooltip/actions): removed from the sample, listed as not supported in help.
- `help/documentation/README.md`: index lines for 01, 02, 07.
- `help/examples/type-definitions-features/`: new `project-inbox.view` (`_group`), `drafts.view` (`_visible: false`), `health.view` (`_rail: true`), `projects-by-status.view` (two views, `_rail_view`), `dated-since-march.view` (`date >= date('2026-03-01')`, the Filter panel's "on or after" form, `filter.logic.ts:76`); `_types/Responsibility.md` gets `_rail: true`; `_sort`/`_view` dropped from `_types/*.md`; README rewritten (no Properties-panel lifecycle buttons); `project-inbox-example.md` says note action bar.
- `docs/FEATURES.md` (Tags panel, sidebar, rail features), `docs/SEARCH.md:112` model size ~542 MB (HF `model_quantized.onnx` is 569,694,530 bytes = 543 MiB; UI says ~542MB).
- ADRs: 0026 amendment (TypeSidebar removed, `_sort`/`_view`/built-in icons not applied, lifecycle actions in the action bar), 0027 amendment (one table of every underscore key in use), 0033 amendment (palette Go to / Open view, Cmd+1/2 commands, Views section). 0004 already states the roles.

## Settings copy (src/)

The criteria need Settings text to match code, so three strings change: `QueryjsSection.svelte` ("Always" text, "documented in the README" -> help page), `TemplatesSection.svelte` (system folder: the Files navigator folder list still shows it), `PeriodicNotesSection.svelte` (base folder also takes Quick Capture and plain New here notes). `settings.types.ts:232` comment says ~118MB. New test `src/tests/lib/core/settings/settings-copy.test.ts` (mount like `GeneralSection.test.ts`). Full frontend gate then applies.

## Tests

- Extend `src/tests/help/type-definitions-views.test.ts`: every sample `.view` parses with no ignored-key note; `viewNavigatorRows` hides `drafts.view`, groups `project-inbox.view` under Work after the ungrouped; `pinnedRailItems` returns `health.view` and the Responsibility type; `queryViewLens` runs `Active` of `projects-by-status.view`; the date view lists the March/May notes, not January. Entries and records built from the real example files.
- Extend `examples-scoping.test.ts`: the type-definitions-features `.view` list is pinned, so a new sample is checked by name.
- `queryjs-contract.test.ts` snapshots embed file sizes of `markdown-editor-vault`; editing `19-meta-bind.md` changes them: update only the size digits.

## Defaults taken

- Today's "Pinned" group label stays (code); help calls the notes favorites and names the group once.
- Behaviour drift found is described as is (out of scope to change).
