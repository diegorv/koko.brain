# 07 discovery: quick switcher rows (type icon, folder, Archived, highlight, Recent notes)

No `spec.md` in `.scratch/finders-ux/`; the Issue and `research/verdict-command-dialogs.md` (T4) are the context. Builds on 01 (`work/01`, dense rows, footer) and repeats 06's recent-split shape (`work/06`: `splitRecentCommands` + palette groups). What differs from 06: the switcher's rest is capped at `MAX_RESULTS`, its rest group has no heading, and the heading reads "Recent notes".

## Files that change

- `src/lib/core/filesystem/file-entries.logic.ts:28-47`: new `entryFolder(vaultPath, path)` (vault-relative folder, `''` at the root, via `relativePath`); new `splitRecentFiles(files, recentPaths) => { recent, rest }` (rest name-sorted, capped at `MAX_RESULTS - recent.length`); `filterAndRank`'s empty branch returns `[...recent, ...rest]` from it (same output). `flattenFileTree` untouched.
- `src/lib/utils/fuzzy-match.ts`: new `fuzzyMatchPositions(query, target): number[]`, same greedy scan; `[]` on empty query or no match. `fuzzyMatch` untouched.
- New `src/lib/features/rail-shell/kind-icons.ts`: `KIND_ICONS: Record<FileKind, Component>` moved from `RailNoteList.svelte:665-673`; RailNoteList imports it and drops its seven lucide imports (`:9-15`), `type Component` (`:2`) and `FileKind` (`:95`).
- `src/lib/features/quick-switcher/quick-switcher.logic.ts`: new `matchSegments(text, positions)` (runs of matched/unmatched text) so a highlight is one `<mark>` per run, sliced on the same UTF-16 indices the scan returns.
- `src/lib/features/quick-switcher/QuickSwitcher.svelte:123-147`: a `fileRow` snippet: icon (`resolveIconForPath` -> `IconRenderer`, else `KIND_ICONS[fileKind(name)]` with `iconColorStyle(color)`, as NoteRow does), name `flex-1 truncate` with `<mark class="bg-transparent font-semibold text-foreground">` runs, folder `truncate text-right text-xs text-muted-foreground` (hidden at the root), `Archived` tag (`bg-muted text-muted-foreground`, no opacity). Empty query with recents: `Command.Group heading="Recent notes"` + unheaded rest group; otherwise one unheaded group. `Archive`/`FileText` imports go.
- `help/documentation/06-search-and-navigation.md:14,16`.

## Plan (test-first)

1. `file-entries.logic.test.ts`: `entryFolder` nested/deep/root; `splitRecentFiles` recents in order + sorted rest apart, unknown paths skipped, cap; `filterAndRank('')` equals `[...recent, ...rest]`; existing `flattenFileTree` cases stay. Fail, implement.
2. `fuzzy-match.test.ts`: positions for "hlo"/"hello", agree with `fuzzyMatch` (match iff non-empty), `[]` on no match and empty query. Fail, implement.
3. `quick-switcher.logic.test.ts`: `matchSegments`. Fail, implement.
4. Move `KIND_ICONS`; `RailNoteList.test.ts:1041-1043` stays green.
5. `QuickSwitcher.test.ts`: canvas/kanban icons (`svg.lucide-layout-dashboard`, `svg.lucide-kanban`, no `lucide-file-text`); emoji frontmatter icon (`preloadPacks(['emoji'])`, prior art `TasksView.test.ts:821-830`); `/vault/Projects/A.md` folder "Projects", root note no folder, no `.md`; archived tag, no `opacity-50`; "wel" -> `mark` runs, option text still "Welcome..."; "Recent notes" heading only for empty query with recents, rest unheaded, ArrowDown from last recent selects first rest row (prior art `CommandPalette.test.ts`). The `:270` assertion `'Projects/Idea.md'` becomes name + folder (the Issue removes the file name from the path line).

## Defaults taken

- Row order: icon, name, folder (right), Archived tag last (prototype `:539`). Root note shows no folder (Issue wins over the prototype's "Vault root").
- Highlight element: `<mark>` with `bg-transparent` so the theme token sets the look; text content and so the accessible name are unchanged.
- Folder helper takes `vaultPath` (entries carry absolute paths only); with no vault path the folder is not shown, as today's path line.

## Risks

- New feature pairs quick-switcher -> rail-shell and -> file-icons: `feature-cycle.test.ts` rewrites `featurePairs`; commit that diff. rail-shell and file-icons do not import quick-switcher.
- E2E `getByRole('option', { name: /Welcome/i })` relies on the option's text; marks keep it.
