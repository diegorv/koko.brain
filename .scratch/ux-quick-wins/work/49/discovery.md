# 49 discovery: the mod run log is a live region before its first line

No `spec.md` in `.scratch/ux-quick-wins/`; the Issue is the spec.

## Files that change

- `src/lib/plugins/mods/ModActionPicker.svelte:135-141`: drop `{#if run.lines.length > 0}`; the `role="log"` div (`data-mod-run-log`, `bind:this={logBox}`, `onscroll`) renders whenever `run` is shown. Its box classes (`max-h-64 overflow-y-auto rounded-md bg-muted/50 p-2`) apply only while it has lines; while empty it gets `sr-only` instead. `font-mono text-xs whitespace-pre-wrap` stay unconditional.
- `src/tests/lib/plugins/mods/ModActionPicker.test.ts`: a new `describe('the log box before its first line')` with its own fixture, the way `the running mark` (`:398-422`) swaps `main.js` and restarts the host.

## Plan

1. Failing test: a `later` action that waits on `__modRelease`, then `run.log('First line')`. Picked from the rail, the run view shows `[data-mod-run-log]` with `role="log"`, no child elements, `sr-only`, and no `p-2` / `bg-muted/50`. After release, `logLines()` is `['First line']` inside the same element (identity check), which now has `p-2` and `bg-muted/50` and no `sr-only`.
2. Implement with a Svelte `class={[...]}` array (Svelte ^5.57 supports clsx-style class values).
3. Targeted checks: `pnpm check`, `pnpm vitest run src/tests/lib/plugins/mods/ModActionPicker.test.ts`.

## Prior art

- `ModActionPicker.test.ts:398-422` (fixture swap + `startModsHost`), `:239-246` (role check), `:326-357` (log box scroll tests, unchanged: the element now always exists, `logBox` binds once).

## Risks and defaults

- Default: `sr-only`, not `hidden`/`display:none`, for the empty state. `display:none` takes the region out of the accessibility tree, which would bring back the same "region and content appear together" problem. `sr-only` is `position:absolute` with a 1px clipped box, so it also leaves the run view's flex flow and adds no `gap-3` space; padding or background on an empty in-flow div would not be the only visible cost, the gap would be too.
- Default: the box classes switch on `run.lines.length` in the template, not via Tailwind `empty:` variants, so the test can read the state and no whitespace text node can defeat `:empty`.
- jsdom has no layout: the "no visible space" criterion is verified by class names, not measured. The E2E `vault-mods.spec.ts` run is left to deliver.
- Auto-scroll `$effect` (`:51-54`) now sees `logBox` set from the start; with no lines `scrollHeight` is 0, so the write is a no-op.
