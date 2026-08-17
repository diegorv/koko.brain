# Issue 01: Sidebar toggle buttons do not persist layout

Status: ready-for-agent
Phase: P0.1
Source: ARCH LB4 (arch 4.0 pre-fix) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

Clicking a sidebar toggle button opens or closes the pane but never persists the layout, while the identical keybinding does persist it. The user's workspace layout is silently forgotten between sessions depending on which input was used. Goal: the buttons persist exactly like the shortcut.

## How

- Write the regression test FIRST and confirm it FAILS: toggling through the button handler leaves the persisted layout unchanged today. Only then apply the fix.
- One-line persistence at `AppShell.svelte:102` and `AppShell.svelte:109` (the two toggle handlers), matching what the keybinding path already does.
- Standalone commit, independent of every refactor.
- Must land BEFORE arch 4.0 (settings persistence owner), which relocates this code. Global rule: a live bug is pinned by a regression test before the refactor that moves it.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

**2026-08-17 (agent):** Fixed. The buttons now call `toggleLeftSidebar()` / `toggleRightSidebar()` in `layout.service.ts` (toggle + `saveSettings`, mirroring `cycleSidebarMode`). The literal one-line inline fix at AppShell.svelte:102/109 was not testable: the repo has no component-rendering tooling, so the handlers were extracted to the service — the established shared-handler pattern — to satisfy the test-first mandate. Red-green evidence: 4 unit persist assertions failed before the fix, pass after; e2e test failed against the buggy wiring, passes with the fix.

Two findings recorded for posterity:

1. **Single-click e2e probes are invalid for this bug.** Hiding one sidebar makes the surviving Resizable panes fire `onResize` -> `debouncedSave` (300ms), and `saveSettings` serializes the whole store, so the visibility flag reaches disk through that side channel and the test stays green even against the buggy code. The e2e test therefore hides BOTH sidebars; after the second click no `onResize`-bearing pane survives, so the second flag only persists if the button itself saves. Real-world repro of the original bug: hide both sidebars, restart — the second one comes back.
2. **The e2e pin is indirect (adversarial review nit):** the poll would go green if ANY settings write landed within the poll window; today none does with both sidebars hidden, so the pin holds. Issue 31's persistence-owner refactor will turn this test into a tautology, but also makes the bug class structurally impossible. If a future change adds `onResize` to a pane not gated on sidebar visibility, this test silently stops pinning.

Adversarial review (opus-5): verdict "could not refute"; debounce stale-clobber race refuted at settings.service.ts:194 (serialization is post-await against the live store).
