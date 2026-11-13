VERDICT: APPROVED

## Acceptance criteria

- [met] Rebinding Cycle Sidebar View changes the palette hint to the new binding; the default still shows ⌘⇧E — `command-palette.service.ts:211-215` replaces the hard-coded object with a `get shortcut()` over `settingsStore.keybindings.cycleSidebarView` (a `$state`-backed store, `settings.store.svelte.ts:145,155`). `CommandPalette.svelte:11` builds the list once, but `filterAndRankCommands` returns the same object references, and `CommandPalette.svelte:59` calls the getter inside the template, so the render effect tracks the store. Default `{ key: 'e', meta: true, shift: true, alt: false, ctrl: false }` (`settings.store.svelte.ts:68`) formats as ⌘⇧E (`command-palette.service.test.ts:171`). I also mounted `CommandPalette.svelte` in a throwaway jsdom probe (deleted afterwards, not committed): with the palette open the shortcut cells contained ⌘⇧E; after `settingsStore.updateKeybindings({ cycleSidebarView: ctrl+alt+J })` and `flushSync()` they contained ⌃⌥J and no ⌘⇧E. The live update works in the mounted component, not just through the getter.
- [met] The Settings Sidebar description no longer mentions Tags — `GeneralSection.svelte:12` now reads "Show the right sidebar (Properties, Backlinks, Outgoing links, Table of Contents)", and the JSDoc at `settings.types.ts:56` lists the same panels. These are the four panels `AppShell.svelte:174-185` renders and the four toggles in the section. `grep -rn Tags src/lib/core/settings src/lib/core/layout` finds nothing else. Covered by the new `src/tests/lib/core/settings/GeneralSection.test.ts`, which mounts the section, checks for the new text and checks that "Tags" is absent.
- [met] Test for the palette hint with a custom binding — `command-palette.service.test.ts:179-188` rebinds to ctrl+alt+J on a command object fetched before the rebind and expects ⌃⌥J. I put main's `command-palette.service.ts` back in temporarily: the test then fails ("1 failed | 27 passed"), and it passes with the branch's code. `beforeEach` calls `settingsStore.reset()` (line 89), so the rebind does not leak into later tests.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/command-palette/ src/tests/lib/core/settings/`: exit 0, 21 files, 395 tests passed. My test verdict rests on these files, in particular `command-palette.service.test.ts`, `command-palette.logic.test.ts` and `GeneralSection.test.ts`, plus the two throwaway probes described above.
- No test or e2e spec asserts the old description or the old hard-coded shortcut object (I grepped `src/tests` and `e2e`).
- I did not run the full suite or `pnpm build`; deliver runs them.
- The worktree is clean after the probes (`git status --short` is empty).
- `.scratch/sidebar-fixes/spec.md` does not exist, so there were no spec decisions to check against. No ADR touches palette hints.

## Findings

1. nit — `src/lib/features/command-palette/command-palette.types.ts:15`: the JSDoc "only user-rebindable shortcuts can carry it" describes how the field is used today, and it goes stale as soon as a static command declares `ctrl` (CLAUDE.md §8). Fix: shorten it to "Requires the Ctrl key".
2. nit — `src/lib/features/command-palette/command-palette.logic.ts:13-16` vs `src/lib/core/keybindings/keybindings.logic.ts:80-83`: a binding that uses all four modifiers prints as ⌃⌘⇧⌥J in the palette and ⌃⌥⇧⌘J in Settings. The order mismatch existed before this branch, the discovery notes it as out of scope, and the Issue requires ⌘⇧E as the default. Fix: none here; leave it for a follow-up Issue that unifies the formatters.
3. nit — `src/tests/lib/features/command-palette/command-palette.service.test.ts:179`: the committed test exercises the getter, not the mounted palette's reactive re-render. My probe shows the re-render works, but no committed test guards it, so a regression would go unnoticed, for example a later change that spreads commands (`{ ...cmd }`) in `filterAndRankCommands` and evaluates the getter once outside the template. Fix (optional): add a `CommandPalette` component test that opens the palette, rebinds, and asserts on the `[data-slot="command-shortcut"]` text. It needs `Element.prototype.scrollIntoView` stubbed in jsdom.

## Resolution

1. Fixed: `command-palette.types.ts:15` JSDoc now reads "Requires the Ctrl key."
2. Rejected for this Issue: the modifier order mismatch between the palette and Settings predates the branch and is out of scope; it needs a follow-up Issue that unifies the two formatters.
3. Fixed: added `src/tests/lib/features/command-palette/CommandPalette.test.ts`, which mounts the palette, opens it, rebinds Cycle Sidebar View to ctrl+alt+J and asserts the `[data-slot="command-shortcut"]` text changes from ⌘⇧E to ⌃⌥J (`Element.prototype.scrollIntoView` stubbed). It fails with main's `command-palette.service.ts` and passes with the branch's.
