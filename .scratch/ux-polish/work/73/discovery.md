# Issue 73 discovery

No `spec.md` exists for ux-polish; the Issue and the Issue 37 review (`work/37/review.md`, finding 1) are the source. Same E2E file, helpers (`tabUntil`, computed `boxShadow`) and recipe as `work/37`; only what differs is listed.

## Files that change

- `src/lib/features/rail-shell/FilesNavigator.svelte:419-421` folder row `<div>`: add `has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/50 has-[button:focus-visible]:ring-inset` next to `rowClass(...)`.
- `src/lib/features/rail-shell/FilesNavigator.svelte:462-464` folder-name button: add `focus-visible:outline-none`, so the row ring is its only indicator (as on the vault-root row).
- `e2e/specs/focus-ring.spec.ts`: two cases.

## Approach picked

The vault-root row (`:317`, a `<button>` with `rowClass()`) and the Types navigator rows (`TypesNavigator.svelte:265,403`, `<button>`s) show a full-row inset ring. The `has-[...]` ring on the row div gives folder rows the same look, so that approach is picked over ring classes on each button.

Scoped to `button:focus-visible`, not `:focus-visible`: the rename `<input>` matches `:focus-visible` whenever it is focused (text inputs always do), and a bare `has-[:focus-visible]` would ring the row during every rename, which the Issue does not ask for.

## Plan

1. E2E first, run, see it fail:
   - keyboard: open Files, click the title, `tabUntil` `[data-files-navigator-toggle]`; assert `:focus-visible` and the row's (`closest('[data-files-navigator-row]')`) `boxShadow !== 'none'`; Tab once, assert focus is that row's `[data-files-navigator-folder]`, `:focus-visible`, row ring.
   - mouse: click the same folder-name button, assert focused, not `:focus-visible`, and both button and row `boxShadow === 'none'`.
2. Apply the classes, rerun `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts` plus the Files navigator specs.

## Risks / defaults

- The toggle keeps its Issue 36 fallback outline (no `outline-none`): the Issue 36 case `a raw button without its own focus style uses the theme ring color` asserts exactly that outline on `[data-files-navigator-toggle]`, and it must stay green unchanged. On the toggle the row ring shows which row, the outline which control. Default taken; not retargeting that test.
- Drop target: the dashed look is `outline-*`, the ring is `box-shadow`; no shared property, `rowClass()` is untouched.
- `rowClass()` itself is not changed, so the vault-root row and Types rows keep their Issue 37 behavior.
- jsdom evaluates no CSS: the E2E is the test; unit tests (`src/tests/lib/features/rail-shell/FilesNavigator*.test.ts`) only need to stay green.
- Chromium only; WKWebView `:has()` support is assumed (Safari 15.4+).
