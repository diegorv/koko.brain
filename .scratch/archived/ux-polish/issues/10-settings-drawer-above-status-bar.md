# 10: The Settings drawer ends at the status bar instead of covering it

**What to build:** The Settings drawer is pinned with an inline `bottom: 24px` (`src/lib/app/SettingsPanel.svelte` about line 116), but the status bar is `h-[32px]` (`src/lib/core/status-bar/StatusBar.svelte` about line 8), so the drawer's bottom 8px paint over the top of the status bar, across the right side where Save status and Word count render. Give both one source:

- `src/app.css`: add `--status-bar-height: 2rem;` to the `:root` block (applies to both themes; `.dark` sits on the same `html` element and does not redefine it)
- `StatusBar.svelte`: `h-[32px]` becomes `h-(--status-bar-height)`, and the root gains a `data-status-bar` attribute for tests
- `SettingsPanel.svelte`: the inline style's `bottom: 24px` becomes `bottom: var(--status-bar-height)`; `width` and `max-width` stay as they are

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [x] Failing first: a new case in `e2e/specs/settings.spec.ts` opens Settings (`Mod+Comma`), reads the bounding boxes of `[role="dialog"][aria-label="Settings"]` and `[data-status-bar]`, and asserts the dialog's bottom edge is at or above the status bar's top edge (within 0.5px). Run it on the current code (with only the `data-status-bar` attribute added) and see it fail by about 8px
- [x] After the change the case passes and the rest of `settings.spec.ts` stays green
- [x] The status bar still renders 32px tall (no visual change to it)
- [x] No other `24px` or `32px` literal for the status bar remains in `SettingsPanel.svelte` or `StatusBar.svelte`

## Notes

- **Other tickets:** Overlaps the review's primitives ticket 5 and Settings polish ticket 7, which also mention `--status-bar-height` and drawer chrome. Not a blocker: whichever lands first defines the variable and the other reuses it.
- **Source:** review-2026-11-04.md section 1 item 6 (second half), "Shell layout" row "Status bar and Settings constants disagree", section 2 "Spacing and density" (`--status-bar-height: 2rem`); settings.md and layout.md.
- **Layer:** `app/SettingsPanel.svelte` (composition root) and `core/status-bar/StatusBar.svelte` both read a CSS variable from `app.css`; no import edge is added.
- **Overlap:** the review's primitives ticket (5) and Settings polish ticket (7) also mention `--status-bar-height` and drawer chrome. If either lands first and already defines the variable, reuse it instead of adding a second one.
- **Out of scope:** drawer width as a class, scrim, `aria-modal`, focus handling, the shadow, the header band (Settings polish, and the drawer vs modal owner decision recorded in the review).
- **Size:** S.

## Comments

- 2026-11-05 (issue/10-settings-drawer-above-status-bar): the drawer now ends at the status bar top through `--status-bar-height`; StatusBar and SettingsPanel read the same variable. Review round 1 APPROVED (2 nits fixed in 94cca9e26), retry review APPROVED at that commit. Delivery finished by the main session after two deliver runs timed out under load: full suite 496 files, 11804 passed, build OK on a quiet machine.
