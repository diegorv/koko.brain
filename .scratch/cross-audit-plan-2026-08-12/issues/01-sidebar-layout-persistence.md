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
