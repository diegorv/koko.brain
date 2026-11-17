# 01: Command dialogs: input anchored at 18vh, one-line rows, 400px list, key-hint footer, no close X

**Origin:** design review 2026-11-17, proposals P55 and P56 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-command-dialogs.md` (ticket T1) and `.scratch/finders-ux/research/breakdown.md` (fold into 218). Absorbs `.scratch/open-itens/issues/218-command-palette-shows-dense-one-line-rows.md`. Also builds the footer half of P160 (counted in 06) and the no-X half of P179 (counted in 07).

**What to build:** All five `Command.Dialog` users (CommandPalette, QuickSwitcher, TemplatePicker, OneOnOnePicker, ModActionPicker) share `src/lib/components/ui/command/command-dialog.svelte`, so every change below lands there and reaches all of them. Two other surfaces use the command primitives without `Command.Dialog` and must not change: the mod `pick` dialog in `src/lib/plugins/mods/ModDialogHost.svelte:175-196` (an ordinary centred dialog that keeps its X, with a bare `Command.List`) and the font picker in `src/lib/core/settings/sections/EditorSection.svelte:60-81` (a `Command.Root` with its own `max-h-64`).

1. Anchor: `command-dialog.svelte` gives its `Dialog.Content` `top-[18vh] translate-y-0` (tailwind-merge in `cn()` overrides the base `top-[50%] translate-y-[-50%]` at `dialog-content.svelte:30`) and passes `showCloseButton={false}`. Ordinary dialogs keep the centred base and their close X.
2. Density through one context: `command-dialog.svelte` sets a Svelte context (for example `setContext` with a `command-dialog` key) that `command-item.svelte`, `command-list.svelte` and `command-input.svelte` read. No per-item prop and no edits to every `Command.Item` call site. Inside a command dialog, rows get `min-h-9` (a minimum, not a fixed `h-9`, so `ModActionPicker` action rows that render a `description` second line at `ModActionPicker.svelte:186-187` are not clipped). Drop the row, icon and input descendant selectors at `command-dialog.svelte:33` (`h-12` input wrapper and input, `py-3` rows, 20px icons). Keep the group selectors on the same line (`[data-command-group]` `px-2` and the `pt-0` sibling rule) unless the one-line rows need otherwise. Outside a command dialog the primitives render as today.
3. List height: inside a command dialog (read from the same context), `command-list.svelte:15` uses `max-h-[min(60vh,400px)]` instead of `max-h-[300px]` (about 11 rows at `h-9`). Not 480px. Outside a command dialog the 300px default stays, so `ModDialogHost`'s pick list is unchanged.
4. Palette rows (`CommandPalette.svelte:56-60`): one line, label left, category muted on the right, shortcut after it.
5. Footer: a one-line key-hint footer (Enter, arrows, Esc) whose hints come from the caller (a snippet or a prop). A dialog that passes no hints renders no footer. The palette passes its hints; the quick switcher adds Shift+Enter in 02.
6. No close X: with the X gone, remove the `pr-6` allowance and its comment at `ModActionPicker.svelte:105-106`. `command-input.svelte:14` keeps `pe-8` by default (ModDialogHost's pick dialog still has its X) and drops it only inside a command dialog, read from the context. Escape closes every command dialog.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/command-palette.spec.ts e2e/specs/overlay-motion.spec.ts`.

- [x] Failing test first: a new `src/tests/lib/components/ui/command/command-dialog.test.ts` asserts that a `Command.Dialog`'s `[data-slot="dialog-content"]` has `top-[18vh]` and `translate-y-0`, not `top-[50%]`, and renders no Close button.
- [x] `src/tests/lib/components/ui/dialog/dialog-content.test.ts` gains a case that a plain dialog keeps `top-[50%]` and its close button.
- [x] E2E: the palette input's `boundingBox().y` is the same before and after typing a filter that shrinks the list; `e2e/specs/overlay-motion.spec.ts` stays green (the palette still animates in).
- [x] Component tests: palette rows are one line (label, then category muted right, then shortcut), the list carries `max-h-[min(60vh,400px)]`, and the palette footer shows the Enter, arrows and Esc hints. A dialog that passes no hints shows no footer.
- [x] A `ModActionPicker` action with a description shows both lines; the run view's Stop and Close still work (`src/tests/lib/plugins/mods/ModActionPicker.test.ts`).
- [x] Keyboard navigation and Escape still work in every command dialog: `TemplatePicker.test.ts`, `OneOnOnePicker.test.ts`, `ModActionPicker.test.ts`, `QuickSwitcher.test.ts` and `CommandPalette.test.ts` stay green.
- [x] Inside a command dialog the input wrapper has no `pe-8` and each row has `min-h-9` (asserted in `command-dialog.test.ts`).
- [x] Outside a command dialog nothing changes: `src/tests/lib/plugins/mods/ModDialogHost.test.ts` and `src/tests/lib/core/settings/EditorSection.test.ts` stay green, and a `Command.List` rendered outside `Command.Dialog` keeps `max-h-[300px]` and its input keeps `pe-8`.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass; the two E2E specs above pass.

## Original proposal

- **P55.** Command dialogs are vertically centred, so the input jumps while typing. Anchor command dialogs at about 18vh. Ordinary dialogs stay centred.
- **P56.** The command list shows only 4.5 rows (300px cap, 62px two-line rows). Cap the list at `min(60vh, 480px)` and use single-line rows with the category right-aligned.
- **218 (absorbed).** Make rows one line `h-9` with the category muted on the right, raise the list to `max-h-[min(60vh,400px)]`, add a footer with key hints (Enter, arrows, Esc), and drop the close X. Use a density prop on the item instead of descendant selectors. Owner decision 2026-11-06: the dense rows go into the shared CommandDialog, so the Quick Switcher, Template picker and One-on-one picker change too.

## Problem

A centred dialog moves its input whenever the number of results changes, so Cmd+P and Cmd+O jump while typing. Rows are 62px (24px padding plus two lines), so the 300px list shows about 4.5 commands. Every command dialog carries a close X that Escape already covers.

## Evidence

Checked at `bb57e6165`.

- `src/lib/components/ui/dialog/dialog-content.svelte:30`: `top-[50%] translate-y-[-50%]` on every dialog; `:37-44` renders the close X when `showCloseButton` (default true).
- `src/lib/components/ui/command/command-dialog.svelte:31`: `Dialog.Content class="overflow-hidden p-0"`, no `showCloseButton={false}`; `:33` descendant selectors force `h-12` input, `py-3` rows and 20px icons.
- `src/lib/components/ui/command/command-list.svelte:15`: `max-h-[300px]`.
- `src/lib/components/ui/command/command-input.svelte:14`: wrapper `pe-8`.
- `src/lib/features/command-palette/CommandPalette.svelte:56-60`: label and category stacked in a `flex-col`.
- `src/lib/plugins/mods/ModActionPicker.svelte:105-106`: `pr-6` "keeps the status clear of the dialog's close button"; `:186-187` the description second line.
- `.scratch/archived/ux-polish/review-2026-11-04.md` row "Overlay anatomy": one-line `h-9` items with secondary text muted on the right, list `max-h-[min(60vh,400px)]`, key-hint footer. 400px rather than P56's 480px comes from that rule and 218's owner decision.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: the list cap is `min(60vh,400px)`, not 480px; the footer hints come from the caller; density is one Svelte context set by CommandDialog and read by the item, list and input, with a minimum row height so ModActionPicker descriptions survive; ModDialogHost and EditorSection keep today's command primitives.
- 2026-11-17, deliver (issue/01-command-dialogs-anchored-dense-rows): command dialogs anchor the input at 18vh, render dense one-line rows, cap the list at min(60vh,400px), show a caller-supplied key-hint footer and drop the close X. Review round 1 APPROVED with findings; fix round: dialog content capped at calc(82dvh-1rem) with the ModActionPicker run view scrolling (finding 1 fixed), kbd styling suggestion rejected (finding 2). Review round 2 APPROVED, no findings. Full suite at 4a3a8e489: 640 files, 17009 passed, 54 skipped, 1 todo; pnpm check 0 errors.
