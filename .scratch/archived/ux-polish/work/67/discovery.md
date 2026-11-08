# Issue 67 discovery

No `spec.md` exists for ux-polish; the Issue and `work/states.md` (P7, P11, R "Interactive rows and buttons", "Every group-hover:opacity-100 gets group-focus-within") are the source. Grep-style test copies `src/tests/lib/chrome-type-scale.test.ts` / `radius-scale.test.ts` (readdirSync scan, `components/ui` skipped, fixture class names built from parts so Tailwind does not generate them).

## Files that change (class strings only)

- `src/lib/core/markdown-editor/EditorTabs.svelte:87` close button: add `group-focus-within:opacity-100` (active tab stays always visible).
- `src/lib/core/settings/sections/AppearanceSection.svelte:189` Edit/Duplicate row: add `group-focus-within:opacity-100`.
- `src/lib/features/tasks/TodoistPopover.svelte:113` trigger: add reveal; `transition-all` -> `transition-opacity`.
- `src/lib/features/properties/PropertyField.svelte:148, 159, 176`: same.
- `src/lib/features/properties/PropertiesView.svelte:290`: `group-focus-within/rel:opacity-100`; `transition-all` -> `transition-opacity`.
- `src/routes/(app)/+page.svelte:31` Open button: drop `transition-all hover:scale-[1.02]` (Button base keeps its own shadcn transition). `:50` recent row: `transition-all` -> `transition-colors duration-100`, drop `group-hover:scale-[1.02]`. `:57` remove button: reveal + `transition-opacity`.
- `src/lib/features/collection/CollectionLinearCalendarView.svelte:199` event bar: `transition-all` -> `transition-[filter] duration-100` (its hover is `brightness-110`, which `transition-colors` does not cover; `transition-all` also animated its `left`/`width`).
- Swatches `KanbanCard.svelte:252`, `KanbanCardText.svelte:54`, `IconPicker.svelte:238, 246, 265, 273`: `transition-transform hover:scale-110` -> `transition-opacity hover:opacity-80`.
- New `src/tests/lib/chrome-state-styles.test.ts`.

## Plan

1. Test first: scan `src/lib` + `src/routes` (`.svelte`, `.ts`), skip `src/lib/components/ui/`. Units = each `class="..."` value (multi-line) plus the remaining lines. Fail on a `group-hover[/name]:opacity-100` whose unit lacks `group-focus-within[/same name]:opacity-100` (or the element's own `focus-within:opacity-100`), and on any `transition-all` or `hover[/name]:scale`. Report `file:line`. Plus fixture cases for the matchers. Run, see it fail on the sites above.
2. Apply the class changes, rerun the test.

## Defaults taken

- "Chrome" = everything outside `components/ui` (same as `chrome-type-scale.test.ts`), so the 6 color swatches lose `hover:scale` too (the review counts all 8). Their hover cue becomes `hover:opacity-80`, no motion.
- Reveal sites use `transition-opacity` (review: "Reveal states use transition-opacity"; EditorTabs/AppearanceSection precedent) instead of `transition-colors duration-100`, which would make the reveal snap.
- `KanbanLane.svelte:358` already reveals with its own `focus-within:opacity-100`; the test accepts it and the file is untouched.
- Out of scope: `opacity-0 group-hover:opacity-60` drag grips (`KanbanCard:227`, `KanbanLane:236`; not focusable, Issue 15 owns the lane grip), CSS `transition: all` rules, shadcn `components/ui` (`button`, `switch`, `resizable-handle`).

## Risks

- `group-focus-within` also fires on mouse focus (e.g. clicking a property input shows that field's delete buttons while editing). Matches hover, which is already true then.
- jsdom evaluates no CSS: the source scan is the test; no rendered check.
