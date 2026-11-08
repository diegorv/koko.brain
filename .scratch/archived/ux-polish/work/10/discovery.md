# Issue 10 discovery: Settings drawer above the status bar

## Files that change

- `src/app.css:131-186` (`:root` block): add `--status-bar-height: 2rem;`. Not yet defined anywhere (grep for `status-bar-height` in `src/` and `e2e/` is empty), so Issues 05/07 did not land it.
- `src/lib/core/status-bar/StatusBar.svelte:7-8`: root `div` gains `data-status-bar`; `h-[32px]` becomes `h-(--status-bar-height)` (Tailwind 4 variable shorthand, already used in `components/ui/select/select-content.svelte:38`).
- `src/lib/app/SettingsPanel.svelte:116`: inline `bottom: 24px` becomes `bottom: var(--status-bar-height)`; `width: 820px; max-width: 80vw;` stay.
- `e2e/specs/settings.spec.ts`: new case.

## Plan

1. Add `data-status-bar` only, write the E2E case, run `bash scripts/e2e.sh e2e/specs/settings.spec.ts`, see the new case fail by about 8px. Commit.
2. Add the variable, switch both components to it, rerun the spec green. Commit.

E2E case: `pressShortcut(page, 'Mod+Comma')`, wait for the dialog to be visible, read `boundingBox()` of `[role="dialog"][aria-label="Settings"]` and `[data-status-bar]`, assert `dialog.y + dialog.height <= bar.y + 0.5` and `bar.height` is 32 (within 0.5px) for the "still 32px tall" criterion.

## Prior-art tests

- `e2e/specs/settings.spec.ts` (same file, same `vaultPage` fixture and `pressShortcut` helper).

## Risks

- The drawer flies in (`transition:fly` x 820, 200 ms): only x moves, so y and height are stable once visible; still wait for `toBeVisible()` before reading boxes.
- `--status-bar-height` lives on `:root`; theme presets set inline variables on the root but only color/elevation ones, so nothing overrides it.
- `src/tests/lib/app/SettingsPanel.test.ts` does not assert on the inline style; no unit test asserts `h-[32px]` or `bottom: 24px`.

## Defaults taken

- No jsdom unit test for the layout: jsdom computes no layout, so the E2E case is the test for both components.
