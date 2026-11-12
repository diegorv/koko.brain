# 236: A Tasks group header reads like a note

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T05 as corrected by `critique.md` D2, D12 and D20). Issue numbers in this text are open-itens numbers. It takes over the Tasks view sites of Issue 198.

**What to build:** Each note's header in the Tasks view looks like the note it stands for, and the view stops using a raw purple.

Today the header is the file name in `text-purple-400` (a raw palette class, not a theme token), the modified date in brackets and the task count in brackets. The toggle circle is a 16 px hit target with no visible focus ring.

- **Header anatomy** for a note group:
  - The note's file icon, from `resolveIconForPath` (`features/file-icons/icon-resolver.ts`), as tabs and note rows show it. This adds a `tasks -> file-icons` feature pair: `feature-cycle.test.ts` rewrites `featurePairs`, and that rewrite is committed.
  - The title: `group.fileName` in the foreground color, medium weight, underlined on hover, still a button that opens the note.
  - A muted subtitle with the note's folder (the vault-relative parent path, for example `Projects/Clients` for `Projects/Clients/ACME.md`). A note at the vault root has no subtitle.
  - The count as "N of M open" (`isTaskOpen`, Issue 110), muted.
  - The modification date only as the title's `title=` hover text, formatted with `formatDate` from `#lib/utils/date.js`, without the year when it is the current year.
- **The toggle circle** gets a larger hit target (at least 24 px square, with the icon size unchanged) and the shared focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50`, as the `components/ui` buttons use).
- No raw Tailwind palette class remains in `src/lib/features/tasks/`. Colors come from theme tokens (`text-foreground`, `text-muted-foreground`, `text-primary` and the like).
- The "N open in M notes" count line stays in the list body. Issue 111 moves it into the toolbar when the filters leave it.

**Blocked by:** 235

**Status:** ready-for-agent

**Answered:** group header identity (a): file icon and a neutral title, no title color from the resolver (synthesis Q4, adopted by the owner on 2026-11-12).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `TasksView.test.ts` with the real store: a note at `<vault>/Projects/Clients/ACME.md` with two open tasks and one done task (hide-completed off) renders the title "ACME", the subtitle "Projects/Clients" and "2 of 3 open"; a root note renders no subtitle. Fails today.
- [ ] The header's title has the modification date as its `title`, with no year for a date in the current year (clock faked).
- [ ] The component test asserts that no element in the rendered view carries a class matching the Tailwind palette pattern (`(text|bg|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}`). Issue 198's architecture test does not exist yet, so this local check is the guard.
- [ ] `feature-cycle.test.ts` passes with the rewritten `featurePairs` committed.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108). It needs Issues 110 (open count) and 234 (path order); the edge on 235 keeps the runs in order.
- Issue 198 was amended on 2026-11-12 to drop its Tasks view sites. The `text-green-400` site it once listed no longer exists.
