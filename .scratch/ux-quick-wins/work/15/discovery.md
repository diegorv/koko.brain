# Issue 15 discovery: visible conjunction and named remove buttons

No `spec.md` in `.scratch/ux-quick-wins/` (README.md only); the Issue file is the spec.

## Files that change

- `src/lib/features/collection/toolbar/FilterPanel.svelte:15` import `ChevronDown`; `:113-115` and `:175-177` the two conjunction `<button>`s take `flex h-7 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent` (FilterRow `:116` minus `min-w-[80px]`) plus `w-fit` so the trigger does not stretch in the flex column, the label in a `<span class="truncate">`, and a trailing `<ChevronDown class="size-3 shrink-0 opacity-50" />`.
- `src/lib/features/collection/toolbar/FilterRow.svelte:101` (raw) and `:184` (visual) removes: `aria-label` and `title` from one derived `removeLabel` (`Remove filter on <property>`, or `Remove filter` when `row.property` is empty).
- `src/lib/features/collection/toolbar/FormulaRow.svelte:57` (editing) and `:87` (view) removes: `aria-label` and `title` from one derived `removeLabel` (`Remove formula <name>`, or `Remove formula` when the name is empty).

## Tests (test-first)

- `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts`: both triggers (render with one global and one view group) have an `svg` and the `border`/`h-7`/`rounded-md` classes, text `All the following are true`; the existing conjunction test already proves "Any" emits `or`, a new one covers the global group too.
- `FilterRow.svelte.test.ts`: new describe for the remove name, visual row with `status`, raw row with a property, row with no property.
- `FormulaRow.svelte.test.ts`: both modes named `Remove formula double`; unnamed gives `Remove formula`.
- The project has no Testing Library, so `getByRole('button', { name })` is written as `button[aria-label="..."]` (aria-label is the accessible name); the test also checks `title` matches.

## Risks

- `FilterPanel.svelte.test.ts:105` finds the row remove as the only button with empty text and an svg; the conjunction trigger keeps its text, so it still matches only the remove.
- Consumers find the conjunction trigger by `textContent?.trim()`; the chevron SVG adds no text. Run `ViewDialog.svelte.test.ts`, `AutoOrganizeRuleRow.test.ts`, `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts` unchanged.
- No logic or write path changes; `onFiltersChange` calls untouched.

## Defaults taken

- Formula name used as stored, no trim: an empty name gives `Remove formula`, the same test as the `(unnamed)` display (`FormulaRow.svelte:79`).
- Filter property used as stored (no trim); an empty string gives `Remove filter`.
