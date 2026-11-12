# 116: Sources panel with source cards and default excludes

**Origin:** `tasks-view` Issue 13, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The only sourcing rule is one heading substring in a textbox, and nothing can be excluded (`commands/vault.rs:225` passes no excluded folders), so templates, the system folder, archived notes and type definitions all supply tasks. Replace the textbox with a Sources panel (PRD "Sourcing rules").

- **Source cards.** An "Edit" button after the rule sentence opens the panel: an inline region between the sentence and the list (the button carries `aria-expanded`), built from `#lib/components/ui/` `button`, `input`, `switch` and `dropdown-menu`. Cards are ORed, clauses inside a card are ANDed. "Add card" adds an empty card; inside a card, "Add clause" picks a kind, and each clause has a remove button. Clause kinds in this Issue, each matched against the row's note fields (Issue 12):
  - folder `{ kind: 'folder', path, negate? }`: vault-relative, leading and trailing `/` trimmed; matches when `row.folder === path` or starts with `path + '/'` (recursive). An empty path matches every note.
  - type `{ kind: 'type', type, negate? }`: `row.noteType` (from `isA`) equals `type`, case-insensitive.
  - note tag `{ kind: 'noteTag', tag, negate? }`: the value without a leading `#`; matches when a `row.noteTags` entry equals it or starts with it plus `/` (`#work` matches `#work/client`), case-insensitive.
  - heading `{ kind: 'heading', text, match: 'tag' | 'substring' }`: Issue 12's `matchesHeading(row.headings, text, match)`.

  Folder, type and tag clauses have a "Not" switch that sets `negate`. A card with no clauses matches every note. No cards means every note. Values are typed into plain text fields here; Issue 28 adds the lifecycle clause and the value pickers.
- **Default source:** one heading card `{ kind: 'heading', text: '<tag>', match: 'tag' }` per section tag saved by Issue 243 (`parseSectionTags` of `tasksView.sectionTag`, Issue 242), joined as OR across cards; with nothing saved, one `#to-list` card. The view lists what it lists today under Issue 115's rule. The section tag textbox and `tasksStore.sectionTag` are removed; `buildTaskIndex` no longer reads a tag. Until Issue 123 saves the whole query, the texts of the heading cards are written back to `tasksView.sectionTag` (space-joined), so the saved tags keep surviving a restart. When `sources` is not empty, a "Clear" button after the sentence sets `sources` to `[]`. The default stays the `#to-list` heading card (owner, 2026-11-12: the view never defaults to every task).
- **Excludes** (PRD assumption A4) in a second section of the panel: four switches, all on: archived notes (`row.archived`), type definitions (`noteType === 'Type'`, the rule of `isTypeDefinition`, `src/lib/features/type-definitions/type-definitions.logic.ts:91`), the templates folder and the system folder (`settingsStore.templates.folder` and `.systemFolder`, `settings.types.ts:169-177`; defaults `_system/templates` and `_system`, `settings.store.svelte.ts:95-96`; an empty setting excludes nothing). Plus lists of excluded folders (same prefix rule as the folder clause), notes (`relPath`), note tags (same rule as the tag clause) and types (case-insensitive). `TaskExcludes` is the PRD's shape. Excludes always win in this Issue; Issue 28 adds the archived override.
- **One sentence** for the whole query: `describeTaskQuery(query)` in `task-query.logic.ts` replaces `describeTaskRule` (Issues 04 and 07) and covers sources, excludes and quick filters. Sources: "from every note" for no cards, else "from notes " plus each card's clauses joined with " and ", cards joined with "; or ". Excludes: ", except " plus the active ones ("archived notes", "type definitions", "templates", "the system folder", then each listed folder, note, tag and type) joined with ", ". The quick-filter part is Issue 07's.
- **Empty state** names the stage that removed everything, in pipeline order: sources ("No note matches the sources", action "Edit sources" that opens the panel), excludes ("Every matching note is excluded", action "Edit excludes"), then Issue 07's quick filter messages. While `vaultStore.indexReady` is false it says "Loading tasks...", not "0 tasks".
- **Counts:** the total only. No per-card counts.
- Not persisted yet (Issue 16). The panel edits `tasksStore.query` (`TaskQuery` with `version: 1`, `sources`, `exclude`, and Issue 07's `quick`, which moves into it; the store's `quick` getter reads `query.quick`).

**Logic.** `selectSourceRows(rows, sources, excludes, folders: { templates: string; system: string })` in `task-query.logic.ts`, pure, run before the quick filters. `TaskQuery` gains `sources` and `exclude`.

**Blocked by:** 115

**Status:** ready-for-agent

**Answered:** PRD B6 (a), the option this Issue is specified for; no re-spec needed (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec's section-tag textbox goes away.

- [ ] Failing test first, `task-query.logic.test.ts`: each clause kind in this Issue, negation, AND inside a card, OR across cards, each default exclude, an excluded folder winning over a card that names it, and an empty template or system folder setting excluding nothing. With the default query and the default folders, a task in `_system/templates/` and one in an archived note are excluded. Fails today (no `selectSourceRows`).
- [ ] `describeTaskQuery` for: the default query; two cards; excludes plus a quick filter.
- [ ] `TasksView.test.ts` with real stores: adding a folder card through the panel limits the list to that folder, and the sentence says so; turning the templates exclude off brings a template task back.
- [ ] Empty state test: a folder card that matches no note says "No note matches the sources", and its action opens the panel.
- [ ] `help/documentation/10-tasks-and-todoist.md` replaces the Section filter row (`:101`) with a "Sources" section: source cards, the clause kinds of this Issue, the default excludes, and the rule sentence (PRD A12).
- [ ] Every `sectionTagInput.fill('')` and `getByRole('textbox', { name: /section tag/i })` in `e2e/specs/tasks-view.spec.ts` becomes a click on the sentence's Clear button, and the specs still assert the listed tasks.

## Notes

- **Size:** M to L. The lifecycle clause, the archived override and the value pickers were split into Issue 28 to keep this one run-sized.

## Comments

- 2026-11-12: the default source follows the saved section tags (Issues 242 and 243) and stays `#to-list` without them; the reference to the closed audit Issue 78 (227) was removed. Bare Issue numbers in this text use the tasks-view numbering (Issue 12 is 115, Issue 16 is 123, Issue 17 is 124).
