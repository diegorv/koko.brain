# 01 discovery: pre-flight checks (a) to (h)

No source change. The deliverable is the plan's Notes > Pre-flight log plus a fallback switch in any ticket a "no" affects.

## Files that change
- `.scratch/calendar-feature/plan-2026-10-28.md:1332-1333` (Notes > Pre-flight log): replace the "To be filled in" line with one sourced answer per check.
- `.scratch/calendar-feature/issues/30-pointer-drag.md:25`: only if (f) says jsdom lacks `PointerEvent` or `Element.setPointerCapture` (the bullet is already conditional; resolve it to the logic-only branch).
- `.scratch/calendar-feature/issues/01-preflight-checks.md`: Comments log.

## Plan
1. Read the installed packages in the worktree (`pnpm install --frozen-lockfile` done, lockfile unchanged):
   - (a) `node_modules/bits-ui/dist/bits/popover/{exports.js,types.d.ts,components/popover-content.svelte}`, `bits/dialog/{types.d.ts,components/dialog-content.svelte}`, `bits/utilities/{floating-layer,focus-scope}/types.d.ts`; the two shadcn wrappers.
   - (b) `node_modules/svelte-sonner/dist/{types.d.ts,Toast.svelte,toast-state.svelte.d.ts}`.
   - (c) `node_modules/@lucide/svelte/{package.json exports,dist/icons/}`.
   - (d) one-off `node -e` and a scratchpad probe script against `node_modules/yaml`.
   - (e) bullet 1: grep the three `@codemirror/*` `dist/index.js` keymaps and `editor-extensions.ts:91-105`.
   - (f) a throwaway jsdom vitest file (deleted, never committed).
   - (g) `.scratch/sveltekit-3-migration/issues/`, `pnpm-lock.yaml`, the `chore/sveltekit-3-migration` branch, `.scratch/p2p-sync/plan-2026-08-25.md`.
   - (h) `playwright-core@1.64.1` `types/types.d.ts` plus its bundled clock source (`lib/coreBundle.js`); a headless run if a 1.64 browser is installed.
2. Write the log, switch any "no" ticket, commit once.

## Prior art
- None for a log; the format follows the plan's own Notes bullets.

## Risks
- (h) cannot be run headless here if the Playwright 1.64 chromium build is not installed; then the answer comes from the source and is marked as such.
- (e) bullets 2 and 3 need `pnpm tauri dev` and a human; they are ticket 02, not this one.

## Defaults taken
- A partial "no" in (f) (one of `PointerEvent` / `setPointerCapture` missing) counts as "no" for ticket 30, because its bullet requires both.
- Plan Task 1 stays unchecked: ticket 02 still owns two of its (e) checks.
