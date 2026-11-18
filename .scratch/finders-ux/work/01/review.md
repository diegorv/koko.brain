VERDICT: APPROVED

Reviewed `git diff main...HEAD` (5 commits, 040aca921..c6853915a) in the worktree. `.scratch/finders-ux/spec.md` does not exist; the Issue's Comments (triage decisions) are the spec.

## Acceptance criteria

- [met] Failing test first: a new `src/tests/lib/components/ui/command/command-dialog.test.ts` asserts that a `Command.Dialog`'s `[data-slot="dialog-content"]` has `top-[18vh]` and `translate-y-0`, not `top-[50%]`, and renders no Close button. — `command-dialog.test.ts:41-57` checks `top-[18vh]`, `translate-y-0`, no `top-[50%]` / `translate-y-[-50%]`, and no button with text `Close`. Against main's `command-dialog.svelte` (no `showCloseButton={false}`, no anchor classes) these cases fail, which matches the build report's 5 of 7 failing. Passes now.
- [met] `src/tests/lib/components/ui/dialog/dialog-content.test.ts` gains a case that a plain dialog keeps `top-[50%]` and its close button. — `dialog-content.test.ts:52-61`, "stays vertically centred and keeps its close button", passes.
- [met] E2E: the palette input's `boundingBox().y` is the same before and after typing a filter that shrinks the list; `e2e/specs/overlay-motion.spec.ts` stays green (the palette still animates in). — `e2e/specs/command-palette.spec.ts:22-40` waits for the dialog's animations, fills `save`, polls until the option count drops and asserts `after.y === before.y`. I ran `bash scripts/e2e.sh e2e/specs/command-palette.spec.ts e2e/specs/overlay-motion.spec.ts`: exit 0, 6/6 passed, including "the command palette dialog and its overlay animate in".
- [met] Component tests: palette rows are one line (label, then category muted right, then shortcut), the list carries `max-h-[min(60vh,400px)]`, and the palette footer shows the Enter, arrows and Esc hints. A dialog that passes no hints shows no footer. — `CommandPalette.test.ts:114-138` covers the row order `['Toggle Rail Panels', 'Layout', '⌘⇧B']` (with no `.flex-col` and the category muted), the list cap and the footer `kbd`s `['↵', '↑↓', 'Esc']`. `command-dialog.test.ts:89-93` covers no hints, no footer. The markup is in `CommandPalette.svelte:64-68` and `command-dialog.svelte:46-57`.
- [met] A `ModActionPicker` action with a description shows both lines; the run view's Stop and Close still work (`src/tests/lib/plugins/mods/ModActionPicker.test.ts`). — `ModActionPicker.test.ts:117-121` checks both lines plus `min-h-9`, not `h-9`. `:252-258` checks that the run view's Close is the only Close button. The existing Stop and Close tests pass, and `pr-6` with its comment is gone from `ModActionPicker.svelte:105`.
- [met] Keyboard navigation and Escape still work in every command dialog: `TemplatePicker.test.ts`, `OneOnOnePicker.test.ts`, `ModActionPicker.test.ts`, `QuickSwitcher.test.ts` and `CommandPalette.test.ts` stay green. — I ran all five, and they pass (part of the 267/267 run below).
- [met] Inside a command dialog the input wrapper has no `pe-8` and each row has `min-h-9` (asserted in `command-dialog.test.ts`). — `command-dialog.test.ts:59-67`. The implementation is `command-input.svelte:18` (`pe-3` in a dialog) and `command-item.svelte:21` (`dense && "min-h-9"`).
- [met] Outside a command dialog nothing changes: `src/tests/lib/plugins/mods/ModDialogHost.test.ts` and `src/tests/lib/core/settings/EditorSection.test.ts` stay green, and a `Command.List` rendered outside `Command.Dialog` keeps `max-h-[300px]` and its input keeps `pe-8`. — `command-dialog.test.ts:105-114` mounts `CommandRootHarness` and checks `max-h-[300px]`, `pe-8` and no `min-h-9`. ModDialogHost.test.ts and EditorSection.test.ts both pass.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass; the two E2E specs above pass. — `pnpm check` gave exit 0, with 0 errors and 0 warnings in 234 files. The targeted vitest run below passes, and the two E2E specs pass (6/6). The full `pnpm vitest run` is deliver's to run.

## Findings

1. minor, `src/lib/components/ui/command/command-dialog.svelte:38`: the content is now anchored at `top-[18vh]` but keeps the base `max-h-[calc(100dvh-4rem)]` (`dialog-content.svelte:30`), which assumes a centred box. Together with `overflow-hidden`, any content taller than about 82vh runs past the bottom of the viewport and is clipped off-screen. The palette list is capped at `min(60vh,400px)`, so the list views fit at the 600px minHeight (108 + 360 + ~70 = 538px). The ModActionPicker run view can still get too tall: a full log (`max-h-64`), an error, and the expanded stack `<details>` (`max-h-48`) add up to about 630px. In a window under about 780px tall, that pushes the Stop and Close buttons below the screen edge, and Escape is the only way out. The centred dialog already clipped this case at 600px, so it is rare and recoverable. Fix: add a matching cap on the command dialog content, for example `max-h-[calc(82dvh-1rem)]`. Alternatively, accept the limit and leave it to 07, which reshapes these dialogs.
2. nit, `src/lib/components/ui/command/command-dialog.svelte:53`: the footer `kbd` (`bg-muted rounded-xs border px-1.5 font-sans`, inheriting `text-xs`) does not match the other inline key caps (`rounded-xs border px-1.5 py-0.5 text-xs` in `ModActionPicker.svelte:162` and `TemplatePicker.svelte:85`). The difference is visual only. Leave it or align it when 06/07 touch the footer.

No scope creep: every source change traces to items 1-6 of the Issue. No baseline entry, no `BASELINE_SIZE` change, no composition root. The diff has no space-indented added lines, and `git diff --check` is clean.

## Checks run by the reviewer

- `pnpm check`: exit 0 (234 files, 0 errors, 0 warnings).
- `pnpm vitest run` on 24 files: 267/267 passed, exit 0. My test verdict rests on these files:
  - Tests the diff adds or changes:
    - `src/tests/lib/components/ui/command/command-dialog.test.ts`
    - `src/tests/lib/components/ui/dialog/dialog-content.test.ts`
    - `src/tests/lib/features/command-palette/CommandPalette.test.ts`
    - `src/tests/lib/plugins/mods/ModActionPicker.test.ts`
  - The rest of the palette and quick switcher folders:
    - `src/tests/lib/features/command-palette/command-palette.logic.test.ts`
    - `src/tests/lib/features/command-palette/command-palette.store.test.ts`
    - `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts`
    - `src/tests/lib/features/quick-switcher/quick-switcher.service.test.ts`
    - `src/tests/lib/features/quick-switcher/quick-switcher.store.test.ts`
  - The other dialog users and the two outside-dialog surfaces:
    - `src/tests/lib/plugins/templates/TemplatePicker.test.ts`
    - `src/tests/lib/plugins/one-on-one/OneOnOnePicker.test.ts`
    - `src/tests/lib/plugins/mods/ModDialogHost.test.ts`
    - `src/tests/lib/core/settings/EditorSection.test.ts`
  - Source-scan tests:
    - `src/tests/lib/chrome-state-styles.test.ts`
    - `src/tests/lib/chrome-type-scale.test.ts`
    - `src/tests/lib/lib-specifier-convention.test.ts`
    - `src/tests/lib/lib-subpath-import.test.ts`
    - `src/tests/lib/menu-item-anatomy.test.ts`
    - `src/tests/lib/radius-scale.test.ts`
    - `src/tests/lib/architecture/layer-rules.test.ts`
    - `src/tests/lib/architecture/palette-classes.test.ts`
    - `src/tests/lib/architecture/pure-logic.test.ts`
    - `src/tests/lib/architecture/import-graph.test.ts`
    - `src/tests/lib/architecture/feature-cycle.test.ts`
- `bash scripts/e2e.sh e2e/specs/command-palette.spec.ts e2e/specs/overlay-motion.spec.ts`: exit 0, 6/6 passed.
- Not checked: how the change looks in the Tauri window (QuickSwitcher, TemplatePicker and OneOnOnePicker with dense rows). The full suite is deliver's to run.

## Resolution

1. Fixed. `Command.Dialog`'s content takes `max-h-[calc(82dvh-1rem)]` (replacing the centred dialog's `max-h-[calc(100dvh-4rem)]` through `cn`), so its bottom edge stays 1rem above the viewport's. A cap alone would still clip Close inside the content, so the ModActionPicker run view carries the same cap with `overflow-y-auto` and scrolls instead. Tests: `command-dialog.test.ts` ("caps its height to the viewport below the 18vh anchor") and the failed-run test in `ModActionPicker.test.ts`.
2. Rejected. The footer line is already `text-xs`, so the kbd inherits the size; `py-0.5` would make the one-line footer taller, and `bg-muted` with `font-sans` keeps the arrow and return glyphs readable as key caps on the muted footer. The inline caps in ModActionPicker and TemplatePicker sit in body text, a different context.
