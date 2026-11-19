# Issue 19 discovery

No `spec.md` for ux-quick-wins; the Issue file is the spec.

## Files that change

- `src/lib/app/AppOverlays.svelte:17`: drop `richColors`, add the `--normal-*` inline style and `toastOptions.classes` per type.
- `src/lib/features/copy-block-link/copy-block-link.service.ts:25` (empty line -> `toast.info`), `:36-42` (heading success), `:58-62` (block success). The `^id` dispatch at `:51-53` stays before the write.
- `src/tests/lib/app/AppOverlays.test.ts:36-71`: new cases in the toaster describe, same mount.
- `src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts:3-5`: mock gains `success` and `info`; new cases.

## Plan

1. Test first: `data-rich-colors="false"`, toaster inline style holds the three `--normal-*` vars, an error toast has the error class, a success toast the success class. Then edit `AppOverlays.svelte`.
2. Test first: success toasts (link / embed text) for heading and block, `toast.info('Place the cursor on a block')` on an empty line with no write, no success toast on a rejected write (both paths), dispatch before `writeText` via `mock.invocationCallOrder`. Then edit the service.

## Accent classes

svelte-sonner styles `[data-sonner-toast][data-styled='true']` with an unlayered `border: 1px solid var(--normal-border)` (`Toaster.svelte:631-643`). Tailwind v4 utilities sit in `@layer utilities`, so a plain `border-l-*` utility loses to it. The classes use the important modifier (already used in the repo, e.g. `FileHistoryDialog.svelte:55`): `!border-l-3 !border-l-destructive` (error), `-success`, `-warning`, `-primary` (info). Tokens are mapped as `--color-*` in `app.css:17,25,75,76`.

## Prior art

- Toast mount and `data-sonner-toaster` lookup: `AppOverlays.test.ts:36-71`.
- Clipboard mock and mock view: `copy-block-link.service.test.ts:13-33`.

## Risks

- Inline style vs sonner's theme rule: `style={restProps.style}` plus `{...restProps}` on the toaster element (`Toaster.svelte:432,442`); inline beats the `[data-sonner-theme]` selector. The `style:` directives set other variables, so no clash.
- The visual check (light and dark) is manual; jsdom cannot compute the cascade. Recorded as not verified by this step unless done in `pnpm tauri dev`.

## Defaults taken

- Accent width 3px (the prototype's bar width, `feedback-components.html:187`).
- Toast text exactly as the Issue writes it.
