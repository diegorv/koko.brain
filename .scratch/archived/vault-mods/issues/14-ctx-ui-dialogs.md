# 14: `ctx.ui` basic dialogs and `ctx.theme` colors

**What to build:** two small, stable pieces of the mod API. `ctx.ui` gives every mod the four dialogs almost all of them need, with the app's look. `ctx.theme` gives a mod the theme's colors as a stable contract, for mods that build their own UI.

**Owner decision (2026-11-06):** the app offers only these four dialogs. Custom modals, layouts and forms are the mod's job: a mod may import any package and bundles it in its own build (e.g. esbuild into `main.js`), outside Kokobrain; **Kokobrain never builds or installs anything for a mod**. What the app guarantees for such UI is the theme colors below.

```js
if (!(await ctx.ui.confirm({ title: 'Archive 12 notes?', confirmLabel: 'Archive', destructive: true }))) return;
const name = await ctx.ui.prompt({ title: 'New project', placeholder: 'Project name' }); // null when cancelled
await ctx.ui.loading('Archiving...', async (signal) => { /* work */ });
await ctx.ui.alert({ title: 'Done', message: '12 notes archived', kind: 'success' });

// A mod's own UI: CSS variables in the DOM, resolved values for canvas or libraries
el.style.background = 'var(--popover)';
const { mode, colors } = ctx.theme.current; // mode 'light' | 'dark'; colors.primary === '#...'
ctx.theme.onChange(({ mode, colors }) => chart.setColors(colors)); // removed at unload
```

## `ctx.ui` (contract v1, additive)

- `alert({ title, message?, kind? })` resolves when dismissed. `kind`: `'info' | 'success' | 'warning' | 'error'`, default `'info'`.
- `confirm({ title, message?, confirmLabel?, cancelLabel?, destructive? })` resolves to `true` or `false`. Enter confirms, Esc cancels. `destructive` styles the confirm button as destructive.
- `prompt({ title, message?, label?, placeholder?, value?, multiline? })` resolves to the text, or `null` when cancelled. Enter submits a single line; with `multiline`, Cmd+Enter submits. Enter during IME composition never submits (as the picker does, Issue 05).
- `loading(label, task, { cancellable? })` runs `task(signal)` while a small non-dismissable dialog shows `label` and a spinner, and resolves or rejects with the task. `cancellable: true` adds a Cancel button that aborts `signal`.
- **Look and trust.** Built from `src/lib/components/ui/dialog`, `button` and `input`, so they follow the theme, focus and Esc like the app's own dialogs. Each shows the mod's name as a small caption above the title.
- **Host.** A `mod-dialogs.store.svelte.ts` queue and one `ModDialogHost.svelte` in `plugins/mods/`, mounted in `src/lib/app/AppOverlays.svelte` next to `ModActionPicker` (`:20`). One dialog at a time; a second call waits in the queue. A dialog opened during a run shows above the picker's run view (Issue 06) and returns to it when closed.
- **Unload and vault switch.** When a mod unloads, its open and queued dialogs close and settle as cancelled: `alert` resolves, `confirm` resolves `false`, `prompt` resolves `null`, `loading` aborts its signal. No mod promise hangs. Calls after unload throw `Mod "<id>" is unloaded`.
- **Errors.** Bad arguments (missing `title`, non-function `task`) throw `Mod "<id>": ...` like `addAction` does.

## `ctx.theme` (contract v1, additive)

- **The color contract** is the "Global" token table of `help/documentation/26-theming.md`: `background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `border`, `input`, `ring`, `divider`. Each maps to its CSS variable (`--background`, `--card-foreground`, ...). A mod's DOM can use the variables directly; they inherit into shadow DOM too.
- `ctx.theme.current` returns `{ mode: 'light' | 'dark', colors }`: `colors` has one key per token above, each the resolved value read with `getComputedStyle(document.documentElement)` at call time (so it reflects the theme in Settings, a custom theme and light or dark).
- `ctx.theme.onChange(cb)` calls `cb({ mode, colors })` after every theme change (`appliedThemeStore.revision` and `isDark`, `src/lib/core/settings/applied-theme.store.svelte.ts`), returns a disposer, and is removed at unload. A throwing callback goes to the mod's `debug()` and never stops the others.
- **Freeze.** A test pins the token list and checks that each CSS variable is defined in `src/app.css`, so renaming a theme variable fails a test instead of silently breaking mods. `26-theming.md` says the Global table is the mod contract and that changing it is a breaking change for mods.

## Docs

Update `help/documentation/28-mods.md`: a `ctx.ui` section with the four dialogs; a `ctx.theme` section with the token list and an example of a mod-built dialog (`<dialog>` with `var(--popover)`, `var(--border)`...); and a "Your own UI and packages" section saying a mod can bundle any package with its own build (esbuild IIFE plus a footer `export default __mod.default;`, because the loader accepts exactly one top-level `export default` and no `import`), the source and `node_modules` living outside the vault, and that Kokobrain never builds or installs for a mod.

**Blocked by:** 07

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [x] Failing tests first:
  - Dialog store: queue order, one open at a time, settle values per kind, closing every dialog of one mod at its unload.
  - `ModDialogHost` component tests: alert dismiss; confirm Enter / Esc / buttons and `destructive` styling; prompt single line (Enter, Esc gives `null`, IME Enter ignored) and multiline (Cmd+Enter); loading shows the label and closes when the task settles, Cancel aborts the signal; the mod name caption.
  - `ctx.theme`: `current` returns every contract token with the value set on the document element and the right `mode`; `onChange` fires after a theme change with the new values, its disposer and unload stop it, a throwing callback does not stop another mod's.
  - Token freeze test against `src/app.css`.
  - Host: a mod unloaded with a confirm open resolves it `false` and leaves no dialog; `ctx.ui` and `ctx.theme` calls after stop throw; argument validation messages.
  - Contract freeze test updated.
  - E2E: a mod action that confirms, prompts for a title and creates a note with it; assert the dialogs' text and the created note.

## Notes

- Owner decisions, 2026-11-06: only these four dialogs in the app, no `modal` or `form` API; mods own their layout and their build; the app's stable promise for mod UI is the theme color contract. Names and keys (Enter, Cmd+Enter, one dialog at a time, settle-as-cancelled on unload) are the agent-proposed shape.
- `--card-foreground` is listed in `26-theming.md` but not defined in `src/app.css` (every other Global token is defined twice, light and dark; checked 2026-11-06). Define it in both blocks, matching how `--popover-foreground` is set, so the contract is complete; the freeze test fails until then.
- `window.alert` / `confirm` / `prompt` are not a substitute: their support in the Tauri web view is unverified and they do not follow the theme.
- **Size:** M.

## Comments

- 2026-11-06, branch issue/14-ctx-ui-dialogs: added the four `ctx.ui` dialogs (ModDialogHost in AppOverlays), `ctx.theme` current colors and onChange, `--card-foreground` in both app.css blocks, docs in 28-mods.md and 26-theming.md, unit and E2E tests. Fix round after review 1: `watchModTheme` now reports a theme change made between subscribing and the first flush (regression test added). Full suite at f27e230aa: vitest 568 files, 13439 passed, 1 skipped, 1 todo; pnpm build passed. Reviews: round 1 APPROVED (1 minor fixed, 2 nits no change), round 2 APPROVED (no findings).
