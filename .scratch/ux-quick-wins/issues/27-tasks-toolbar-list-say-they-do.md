# 27: The Tasks toolbar and list say what they do

**Origin:** design review 2026-11-17, proposals P163, P165, P167, P63, P180 and P164 (part), prototype `.scratch/design-review/prototypes/calendar-tasks.html` (sections `P163`, `P165`, `P167`, `P63`, `P180`, `P164`), research `.scratch/ux-quick-wins/research/verdict-calendar-tasks.md` and `breakdown.md` (old ticket 45).

**What to build:**

1. **Display shows the grouping.** The trigger reads "Display" plus the current grouping ("Display · Note"), with the value part truncated for a long property key (the trigger is `shrink-0` in a toolbar that already squeezes the search field). Labels come from `GROUP_OPTIONS` (`src/lib/features/tasks/TasksView.svelte:124-131`): "Note", "Folder", "Due date", "Priority", "Status", "Type", "Heading", and the property key for `{ property }`. The accessible name starts with "Display". Trigger at `:926-933`.
2. **"Edit sources".** The sentence button reads "Edit sources" instead of "Edit" (`:1086-1095`); `aria-expanded`, `aria-controls` and `data-task-sources-edit` stay.
3. **Search field.** Full `border-border` and `placeholder:text-muted-foreground` instead of the `/50` classes (`:914-922`). Cmd or Ctrl+F focuses and selects it while the view is mounted, from a listener in `TasksView.svelte` that acts only when focus is inside the view or on `<body>` (the `focusIsFree` check at `:382-388` is the model). One TasksView can be mounted (one `EditorView`, the active tab only), so it cannot double-fire. `global-keybindings.ts` and help doc 20 are untouched (mvp-claude changes both); Cmd+Shift+F still reaches the global handler. Kanban's own `/50` search styles are left alone.
4. **Group header on one row.** The folder moves inline after "N of M open" (muted, truncated, hidden under 560 px) instead of its own second line (`:765-779`); `data-task-group-subtitle` stays. The groups list goes from `space-y-6` to `space-y-4` (`:1135`).
5. **Dimmed context rows say why.** A row that fails the filters and stays as the parent of one that passes (`:803`, class `opacity-60` at `:812`) keeps full opacity and gets a thin token-coloured left rule, `title="Shown for context"` and `data-task-context`. The row's `padding-left` is inline (`:813`), so the rule is an inset shadow or a pseudo-element, never `border-l-2`, which would shift the indent. Colours are tokens (the guard `src/tests/lib/architecture/palette-classes.test.ts` bans palette classes).
6. **"or" between source cards.** An `aria-hidden` "or" divider sits between consecutive source cards in `SourcesPanel.svelte` (card loop at `:350-351`); none before the first or after the last.
7. **Doc.** `help/documentation/10-tasks-and-todoist.md:107` names "Edit sources", `:158` explains the context rule and tooltip instead of "dimmed", and the search paragraph (`:165`) mentions Cmd+F.

Not in this ticket: collapsing Global excludes behind a disclosure (P164 remainder; `openSources('excludes')` at `TasksView.svelte:149-154` focuses a switch in it); the focus-ring sites in `TasksView.svelte` and `TaskLists.svelte` (they stay with tasks-view-ux).

**Size:** M (one large component and its panel, about 20 mechanical test lookups). Split point: items 1 to 3 (toolbar and the "Edit sources" rename with its test churn) first; items 4 to 6 (list density, context rows, "or") second.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh tasks-view.spec.ts` (the "Edit" click at `:279` changes)

- [ ] Failing test first, `TasksView.grouping.test.ts`: the default Display trigger text includes "Note"; after `setGroupBy('due')` it shows "Due date"; with `{ property: 'area' }` "area"; with `'heading'` "Heading"; its name starts with "Display". The `displayTrigger()` helper at `:38-41` (matches the exact text "Display") changes on purpose.
- [ ] "Edit sources" keeps `aria-expanded` and `aria-controls` and toggles the panel. Every "Edit" lookup is updated: `TasksView.sources.test.ts` (`:115,148,174,219,250,287,304,349,357,379,401,432,472,497,520`), `TasksView.lists.test.ts` (`:258,338,432,465,481,498`), `tasks-view-settings.test.ts:345`, `TasksView.test.ts` (`:401,455,1050`) and `e2e/specs/tasks-view.spec.ts:279`. The empty-state lookup (`TasksView.sources.test.ts:291`, `TasksView.test.ts:409`, which already name an "Edit sources" button in the empty list) is scoped to its container, because two buttons now share the name.
- [ ] Cmd+F on a task row focuses the search input and selects its text; from a contenteditable outside the view it does nothing and is not `preventDefault`ed; after unmount the listener is gone; Cmd+Shift+F still reaches the global handler (`TasksView.keyboard.test.ts`). The search input has no `/50` class.
- [ ] `[data-task-group-subtitle]` sits in the same row element as the title and the count (`TasksView.filters.test.ts:210`, `TasksView.grouping.test.ts:159` updated); flat groups still have none; the list container has `space-y-4`; the count text stays "N of M open".
- [ ] A dimmed parent row has the title and `data-task-context`, no `opacity-60`, an enabled toggle and the same inline `padding-left` as a passing row at its indent; a passing row has neither attribute.
- [ ] Two source cards render one "or" separator (`aria-hidden`); one or zero cards render none; Add card, Remove card and clause edits pass unchanged.
- [ ] Tests use the real `tasksStore`; only Tauri and `svelte-sonner` are mocked. The left rule and the one-row header are checked by eye at 420 and 800 px (jsdom has no layout).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P163.** The Tasks Display menu hides the current grouping: the trigger says "Display" whatever the grouping.
- **P165.** The Tasks rule sentence says a bare "Edit": rename it "Edit sources".
- **P167.** The Tasks search field is low contrast and keyboard-poor: full-strength border and placeholder, and Cmd+F.
- **P63.** Tasks note-group headers use two lines for one or two tasks.
- **P180.** Dimmed Tasks context rows have no explanation.
- **P164 (part).** The Sources panel exposes AND/OR logic as jargon: an "or" between cards. The Global excludes disclosure waits.

## Problem

The toolbar does not say how the list is grouped, the only link to the sources panel is a bare "Edit", and the search box is faint with no Cmd+F. Each note group spends two lines on a heading, dimmed rows look disabled with no reason, and the panel never says the cards are alternatives.

## Evidence

Checked at `085b23c5d`.

- `TasksView.svelte:914-922` (search input, `border-border/50`, `placeholder:text-muted-foreground/50`), `:926-933` (Display trigger, `<span>Display</span>` at `:930`), `:957` (Heading item), `:1086-1095` (bare "Edit"), `:765-779` (two-row group header), `:803,812-813` (dimmed row, inline padding), `:1135` (`space-y-6 mt-3`).
- `SourcesPanel.svelte:350-351`: the card loop; no divider between cards.
- `src/lib/app/global-keybindings.ts` binds Cmd+Shift+F only; it is changed on mvp-claude.
- `help/documentation/10-tasks-and-todoist.md:107,158,165`.
- `tasks-view-ux` Issue 236 (resolved) set the `data-task-group-subtitle` hook, not its line.

## Sequence with

Tasks-view-ux 129 (needs-info) edits `TasksView.svelte` row markup and refresh code, `tasks.service.ts` and the row menu: never run beside it. Shell-sidebars-ux 20 mentions `TasksView` only to describe palette focus (read-only): check that it still adds no edit there before starting. Ticket 20 (keyboard focus ring) edits `button.svelte`, the dialog close button and `src/app.css`, not `TasksView.svelte`.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown.
