# 01: Command dialogs: input anchored at 18vh, one-line rows, 400px list, key-hint footer, no close X

**Origin:** design review 2026-11-17, proposals P55 and P56 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-command-dialogs.md` (ticket T1) and `.scratch/finders-ux/research/breakdown.md` (fold into 218). Absorbs `.scratch/open-itens/issues/218-command-palette-shows-dense-one-line-rows.md`. Also builds the footer half of P160 (counted in 06) and the no-X half of P179 (counted in 07).

**What to build:** All five `Command.Dialog` users (CommandPalette, QuickSwitcher, TemplatePicker, OneOnOnePicker, ModActionPicker) share `src/lib/components/ui/command/command-dialog.svelte`, so every change below lands there and reaches all of them.

1. Anchor: `command-dialog.svelte` gives its `Dialog.Content` `top-[18vh] translate-y-0` (tailwind-merge in `cn()` overrides the base `top-[50%] translate-y-[-50%]` at `dialog-content.svelte:30`) and passes `showCloseButton={false}`. Ordinary dialogs keep the centred base and their close X.
2. Density: drop the descendant selectors at `command-dialog.svelte:33` (`py-3` rows, 20px icons, `h-12` input). Rows become one line `h-9` through a density prop on the item, not descendant selectors. The density sets a minimum row height, not a fixed one, so `ModActionPicker` action rows that render a `description` second line (`ModActionPicker.svelte:186-187`) are not clipped.
3. List height: `command-list.svelte:15` `max-h-[300px]` becomes `max-h-[min(60vh,400px)]` (about 11 rows at `h-9`). Not 480px.
4. Palette rows (`CommandPalette.svelte:56-60`): one line, label left, category muted on the right, shortcut after it.
5. Footer: a one-line key-hint footer (Enter, arrows, Esc) whose hints come from the caller (a snippet or a prop). A dialog that passes no hints renders no footer. The palette passes its hints; the quick switcher adds Shift+Enter in 02.
6. No close X: with the X gone, remove the `pr-6` allowance and its comment at `ModActionPicker.svelte:105-106`, and the `pe-8` right padding that clears the X in `command-input.svelte:14` if nothing else needs it. Escape closes every command dialog.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/command-palette.spec.ts e2e/specs/overlay-motion.spec.ts`.

- [ ] Failing test first: a new `src/tests/lib/components/ui/command/command-dialog.test.ts` asserts that a `Command.Dialog`'s `[data-slot="dialog-content"]` has `top-[18vh]` and `translate-y-0`, not `top-[50%]`, and renders no Close button.
- [ ] `src/tests/lib/components/ui/dialog/dialog-content.test.ts` gains a case that a plain dialog keeps `top-[50%]` and its close button.
- [ ] E2E: the palette input's `boundingBox().y` is the same before and after typing a filter that shrinks the list; `e2e/specs/overlay-motion.spec.ts` stays green (the palette still animates in).
- [ ] Component tests: palette rows are one line (label, then category muted right, then shortcut), the list carries `max-h-[min(60vh,400px)]`, and the palette footer shows the Enter, arrows and Esc hints. A dialog that passes no hints shows no footer.
- [ ] A `ModActionPicker` action with a description shows both lines; the run view's Stop and Close still work (`src/tests/lib/plugins/mods/ModActionPicker.test.ts`).
- [ ] Keyboard navigation and Escape still work in every command dialog: `TemplatePicker.test.ts`, `OneOnOnePicker.test.ts`, `ModActionPicker.test.ts`, `QuickSwitcher.test.ts` and `CommandPalette.test.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass; the two E2E specs above pass.

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

- 2026-11-17, triage: ready-for-agent. Decided: the list cap is `min(60vh,400px)`, not 480px; the footer hints come from the caller; the density sets a minimum row height so ModActionPicker descriptions survive.
