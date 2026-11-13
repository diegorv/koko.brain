# 16: The radius ladder gains `xs` and runtime variables, held by a radius ratchet

**What to build:** `src/app.css:66-69` declares `--radius-sm/md/lg/xl` inside `@theme inline`, so the built CSS inlines `calc(var(--radius) ...)` into each utility and emits none of them as variables (the last build has `.rounded-md{border-radius:calc(var(--radius) - 2px)}` and no `--radius-md` anywhere): scoped CSS, CodeMirror `styles.ts` and DOM builders cannot write `var(--radius-md)` today. Only `--radius` (`app.css:154`) exists at runtime. There is no `--radius-xs`, so bare `rounded` is Tailwind's fixed 0.25rem (4px, not tied to `--radius`) and `rounded-xs` is Tailwind's default 0.125rem. Make the ladder whole and readable at runtime:

1. Add `--radius-xs: calc(var(--radius) - 6px)` (4px), so `rounded-xs` equals today's bare `rounded`.
2. Make `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg` and `--radius-xl` runtime custom properties on `:root`, each formula written once and derived from `--radius`. Either move the ladder into an `@theme static` block (Tailwind 4.3.3 parses `static`; check the Tailwind v4 theme docs) or declare it in `:root` and keep the utilities pointing at it. The criteria below decide, not the mechanism.
3. Add `src/tests/lib/radius-scale.test.ts`, a source-scan ratchet in the style of `src/tests/lib/chrome-type-scale.test.ts` and `src/tests/lib/raw-write-ratchet.test.ts`, over `src/lib` with `src/lib/components/ui/` skipped, with three rules:
   - (a) bare `rounded` and side variants without a size (`rounded-l`, `rounded-r`, `rounded-t`, `rounded-b`, with any variant prefix such as `hover:`) in `.svelte` files. Words in `.ts` files are not classes (`settings.logic.ts:115` `const rounded`, `widgets.ts:1064` and `kb-ui.ts:810` comments), so this rule scans `.svelte` only.
   - (b) arbitrary `rounded-[...]` in `.svelte` files, except `rounded-[inherit]` (`EventBlock.svelte:76`).
   - (c) px literals in `border-radius` / `borderRadius` in `.svelte`, `.ts` and `.css` (CSS custom properties ending in `border-radius` count, for example `--xy-node-border-radius: 8px` at `CanvasInner.svelte:731`). Allowed values: `0`, `50%`, `9999px`, `inherit`, and anything that uses `var(`.
   - Allowlist by file, each with its reason: `src/lib/plugins/queryjs/kb-ui.ts` (KBAPI output; `borderRadius` is a public option, `plugins/queryjs/contract/kb-api.v1.ts:401`, so changing it changes users' dashboards) and `src/lib/core/settings/sections/ThemePreview.svelte` (1px corners of a scaled mini mock).
   - Baseline: an inline `Record<string, number>` per rule, file to count, generated from today's tree (about 82 rule (a) sites in 36 files; the one rule (b) site `EventPopover.svelte:165`; rule (c) in `live-preview/styles.ts` (23), `canvas-markdown.css`, the canvas `.svelte` nodes and overlays, `canvas.logic.ts` and `collection-block-widget.ts`). The test fails when a file's count grows, when a file not in the baseline has a site, and when a count drops below its baseline (stale: lower it in the same change), so the baseline only shrinks.

Side effect, accepted: `rounded-xs` moves from 2px to 4px at `components/ui/dialog/dialog-content.svelte:38` (close button) and `features/file-icons/IconPicker.svelte:145`. Neither has a background at rest, so only the focus outline shape changes.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: a `radius-scale.test.ts` case reads `src/app.css` and asserts that each of `--radius-xs` .. `--radius-xl` is declared at least once outside an `@theme inline` block and that, with `--radius: 0.625rem` (10px), they evaluate to 4, 6, 8, 10 and 14px. It fails before the change (no `xs`, the ladder exists only inside `@theme inline`) and passes after
- [x] The three ratchet rules, the allowlist with reasons and the per-file baseline exist and pass on the current tree; a unit case shows that an added bare `rounded`, an added `rounded-[3px]` and an added `borderRadius: '5px'` would each be reported (scan a string, not the tree)
- [x] After `pnpm build`, the built CSS under `build/_app/immutable/assets/` defines `--radius-md` (and the other four) as a variable and `.rounded-md` still resolves to 8px, `.rounded-sm` 6px, `.rounded-lg` 10px; the commit message records the grep
- [x] No class or radius literal outside `src/app.css` changes in this ticket (the rename and role moves are separate tickets)

## Notes

- **Source:** review section 2 "Radius tokens" row and section 4 Issue 5; `.scratch/ux-polish/work/radius.md` section 1 gotcha and section 3 token change.
- **ADR-0002** (`docs/adr/0002-shadcn-svelte-tailwind-bits-ui.md:43`): radii come from `src/app.css` tokens; this ticket makes that possible outside Tailwind classes.
- **Out of scope:** renaming bare `rounded` (Issue 18), row radius (Issue 17), editor literals (Issue 22, Issue 23), canvas literals (canvas theme-proofing work), the collection calendar pills and bars (event chip unification), `kb-ui.ts` defaults.
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/16-radius-ladder-xs-and-runtime-variables`: `src/app.css` emits the radius ladder (`xs`..`xl`) as runtime variables via `@theme static` and adds `xs`; `src/tests/lib/radius-scale.test.ts` pins the ladder and ratchets bare `rounded`, arbitrary `rounded-[..]` and px `borderRadius` literals with per-file baselines. Fix round after review 1: fixture class strings built so Tailwind does not scan them; ladder comment drops px values. Tests: full suite at 087d025f3, 492 files / 11673 tests passed, build OK. Reviews: round 1 APPROVED (2 minor/nit findings, fixed), round 2 APPROVED (no findings).
