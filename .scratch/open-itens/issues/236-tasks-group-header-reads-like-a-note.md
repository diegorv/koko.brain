# 236: A Tasks group header reads like a note

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T05 as corrected by `critique.md` D2, D12 and D20) and its review. Issue numbers in this text are open-itens numbers. It takes over the Tasks view site of Issue 198.

**What to build:** Each note's header in the Tasks view looks like the note it stands for, and the view stops using a raw purple.

Today the header is the file name in `text-purple-400` (a raw palette class, not a theme token), the modified date in brackets and the task count in brackets. The toggle circle is a 16 px hit target.

- **Header anatomy** for a note group:
  - The note's file icon, rendered the way the tab bar does it (`src/lib/app/EditorView.svelte`): `resolveIconForPath(filePath)` (`features/file-icons/icon-resolver.ts`); `IconRenderer` when it returns an icon, else the `FileText` fallback; the resolver's icon color through `iconColorStyle(resolved?.color)` in both cases. This adds a `tasks -> file-icons` feature pair: `feature-cycle.test.ts` rewrites `featurePairs`, and that rewrite is committed.
  - The title: `group.fileName` in the foreground color, medium weight, underlined on hover, still a button that opens the note. The resolver's color never tints the title.
  - A muted subtitle with the note's folder: the parent of `relativePath(vaultStore.path, filePath)` (`#lib/utils/path.js`), for example `Projects/Clients` for `Projects/Clients/ACME.md`. A note at the vault root has no subtitle, and neither does a path that stays absolute (outside the vault).
  - The count as "N of M open", muted. N counts the note's open tasks (`isTaskOpen`, Issue 110). M counts all of the note's tasks before any filter, from the unfiltered `tasksStore.fileTaskGroups`, so with hide-closed on a note with 2 open and 1 done task still reads "2 of 3 open". Issue 111 keeps that total when the view moves to rows.
  - The modification date only as the title's `title=` hover text, `formatDate(modifiedAt, 'MMM D')` from `#lib/utils/date.js`, or `'MMM D, YYYY'` when the year differs from the current one. Delete the view's local `formatDate` helper (its name clashes) and keep its guard: a zero timestamp shows no date.
- **The toggle circle** gets a 24 px hit area through padding and a matching negative margin (for example `p-1 -m-1`), so the icon size and the row height stay the same, plus `outline-none` and the shared focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50`, as the `components/ui` buttons use).
- No raw Tailwind palette class remains in `src/lib/features/tasks/`. Colors come from theme tokens (`text-foreground`, `text-muted-foreground`, `text-primary` and the like).
- The "N open in M notes" count line stays in the list body. Issue 111 moves it into the toolbar when the filters leave it.

**Blocked by:** 234

**Status:** ready-for-agent

**Answered:** header identity: file icon with its resolver color, neutral title (synthesis Q4 (a), chosen by the plan on 2026-11-12; the owner can override at review).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `TasksView.test.ts` with the real store and `vaultStore` opened on `<vault>`: a note at `<vault>/Projects/Clients/ACME.md` with two open tasks and one done task renders the title "ACME", the subtitle "Projects/Clients" and "2 of 3 open", once with hide-closed on and once off; a root note renders no subtitle. Fails today.
- [ ] The header renders the `FileText` fallback icon for a plain note, and the resolved icon when the file icons store holds a frontmatter icon for it.
- [ ] The header's title has the modification date as its `title`, with no year for a date in the current year (clock faked).
- [ ] A source-text check over `src/lib/features/tasks/**/*.{svelte,ts}` finds no Tailwind palette class: the prefixes Issue 198 lists (`bg`, `text`, `border` and its side forms, `ring`, `fill`, `stroke`, `outline`, `decoration`, `from`, `via`, `to`), any palette name Tailwind ships (from `slate` to `rose`, plus `mauve`, `mist`, `olive` and `taupe`), and a 2 or 3 digit shade. Issue 198's architecture test does not exist yet, so this check is the guard, and it also covers branches no component test renders.
- [ ] `feature-cycle.test.ts` passes with the rewritten `featurePairs` committed.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108). It needs Issues 110 (open count) and 234 (path order).
- Issue 198 waits on this Issue and no longer lists the Tasks view.
