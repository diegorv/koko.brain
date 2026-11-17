# 07: Quick switcher rows: type icon, folder, Archived tag, match highlight, Recent notes heading

**Origin:** design review 2026-11-17, proposal P179 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-command-dialogs.md` (ticket T4) and `.scratch/finders-ux/research/breakdown.md` (07). Also builds the "Recent notes" heading of P160 (counted in 06). P179's "no X in command dialogs" is in 01.

**What to build:**

1. **Row model.** In `src/lib/core/filesystem/file-entries.logic.ts`, each entry gains the folder relative to the vault (`''` at the root). The kind comes from `fileKind()` (`src/lib/features/rail-shell/lens.logic.ts:913`: markdown, canvas, kanban, view, pdf, image, other), called from the quick-switcher side, not from `file-entries.logic.ts`: a `core/` file importing `features/` is a new layer violation that `src/tests/lib/architecture/layer-rules.test.ts` rejects.
2. **Match positions.** Add a separate `fuzzyMatchPositions(query, target)` to `src/lib/utils/fuzzy-match.ts` using the same greedy scan as `fuzzyMatch`. `fuzzyMatch` and its consumers stay untouched.
3. **Type icon.** `resolveIconForPath` first, otherwise the kind icon from one kind-icon map shared with `RailNoteList.svelte` (`KIND_ICONS`, `:665-673`). Move the map out of `RailNoteList` into a small non-`.logic` module (a lucide import cannot live in a `.logic.ts`, `src/tests/lib/architecture/pure-logic.test.ts`) and import it from both; do not copy it.
4. **Folder line.** The path shows only the folder (no file name, no `.md`), right-aligned, muted and truncated, per the row anatomy from 01. A root-level note shows no folder.
5. **Archived.** An "Archived" text tag at full muted strength. Drop `opacity-50` on the name and the `Archive` icon swap (`QuickSwitcher.svelte:80-86`), since the type icon takes that slot.
6. **Highlight.** Wrap the matched characters in highlight elements with a theme-token style (for example `font-semibold text-foreground`) without changing the option's accessible name.
7. **Recent notes heading.** With an empty query and recents, the recents group has the heading "Recent notes".
8. **Help.** Update `help/documentation/06-search-and-navigation.md:14` (Recent notes heading) and `:16` (archived notes now carry an "Archived" tag, not a dimmed name).

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/quick-switcher.spec.ts`.

- [ ] Failing test first, `src/tests/lib/core/filesystem/file-entries.logic.test.ts`: folder for nested and root files (`''` at the root).
- [ ] Failing test first, `src/tests/lib/utils/fuzzy-match.test.ts`: positions agree with `fuzzyMatch` on a match and return nothing on no match; empty query returns no positions.
- [ ] `QuickSwitcher.test.ts`: a `.canvas` row shows the canvas icon and a `.kanban` row the kanban icon, not FileText; a note with a frontmatter icon shows it; `/vault/Projects/A.md` shows "Projects"; an archived note shows the "Archived" tag and no `opacity-50`; typing "wel" wraps the matched characters in highlight elements.
- [ ] `e2e/specs/quick-switcher.spec.ts` `getByRole('option', { name: /Welcome/i })` still passes.
- [ ] The "Recent notes" heading appears only for an empty query with recents.
- [ ] RailNoteList icons are unchanged (its tests stay green); `chrome-type-scale`, `menu-item-anatomy`, `palette-classes`, `pure-logic`, `layer-rules` and `feature-cycle` tests are green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P179.** Quick switcher rows are uniform and unlabelled: every row has the same icon, paths include ".md", there is no match highlight, and command dialogs show an X. Type icons, folder-only paths, an "Archived" tag, match highlighting, and no X in command dialogs.
- **P160 (switcher half).** "Recent notes" heading in the switcher.

## Problem

Every quick-switcher row has the same FileText icon, so canvas and kanban files look like notes. The second line repeats the full relative path with `.md`. Nothing shows which characters matched. Archived notes are marked by an icon swap and a 50% opacity name, which the type icon would replace and which the archived design system forbids on informative text.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/quick-switcher/QuickSwitcher.svelte:74-95`: one `FileText` (or `Archive` when archived) icon, `opacity-50` name, `relativePath(vaultStore.path, file.path)` second line.
- `src/lib/core/filesystem/file-entries.logic.ts:10-26`: entries carry `name`, `nameWithoutExt` and `path` only.
- `src/lib/features/rail-shell/lens.logic.ts:913`: `fileKind(name)`.
- `src/lib/features/rail-shell/RailNoteList.svelte:652-662` `resolveNoteIcon`, `:665-673` `KIND_ICONS`. Neither `rail-shell` nor `file-icons` imports `quick-switcher`, so sharing the map makes no import cycle.
- `.scratch/archived/ux-polish/review-2026-11-04.md` row "Color rules": never `/NN` alpha or `opacity` on informative text, which makes Archived a text tag.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: Archived becomes a text tag (no opacity); the kind-icon map moves out of RailNoteList and is shared, not copied; the file kind is computed on the features side, because the research's plan to call `fileKind()` from `core/filesystem/file-entries.logic.ts` would add a core-to-features import.
