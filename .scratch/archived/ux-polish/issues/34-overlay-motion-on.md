# 34: Overlays fade and zoom in and out (tw-animate-css)

**What to build:** Every shadcn dialog, menu, popover, select and tooltip appears and disappears in one frame, because the `animate-in`, `fade-in-0`, `zoom-in-95` and `slide-in-from-*` classes in the 9 overlay primitives under `src/lib/components/ui/` (`dialog/dialog-content.svelte:30`, `dialog/dialog-overlay.svelte:16`, `dropdown-menu/dropdown-menu-content.svelte:24`, `dropdown-menu/dropdown-menu-sub-content.svelte:16`, `context-menu/context-menu-content.svelte:23`, `context-menu/context-menu-sub-content.svelte:16`, `popover/popover-content.svelte:20`, `select/select-content.svelte:30`, `tooltip/tooltip-content.svelte:30`) come from `tw-animate-css`, which is not installed. Add it with `pnpm add -D tw-animate-css@1.4.0` (exact version, published 2025-09-24, past the 5-day `minimumReleaseAge` in `pnpm-workspace.yaml:11`) and add `@import "tw-animate-css";` to `src/app.css` right after `@import "tailwindcss";` (line 1), as the package README says. The 9 primitives do not change: their classes start emitting CSS. A dialog then fades and zooms in over 200 ms (its `duration-200`) and menus and popovers over 150 ms (the package default), and they animate out on close. The 1.4.0 CSS defines every class the 9 files use, including `slide-in-from-start-*`/`-end-*`.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `./scripts/e2e.sh e2e/specs/overlay-motion.spec.ts e2e/specs/command-palette.spec.ts e2e/specs/quick-switcher.spec.ts e2e/specs/note-action-bar.spec.ts e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/settings.spec.ts` (the new spec plus the specs that open overlays most, since every overlay now stays mounted for its exit animation).

- [x] Failing first: a new `e2e/specs/overlay-motion.spec.ts` opens the command palette (`openCommandPalette` from `e2e/fixtures/helpers.ts`) and asserts `getComputedStyle` of `[data-slot="dialog-content"]` and `[data-slot="dialog-overlay"]` has `animationName` other than `none`; it opens a file-row context menu in the Files navigator and asserts the same on `[data-slot="context-menu-content"]`. Run it on the current code and see it fail (today the classes emit nothing, so `animationName` is `none`)
- [x] `package.json` `devDependencies` gains `tw-animate-css` at `1.4.0` and `pnpm-lock.yaml` is updated by `pnpm add`, with no other resolved version changing (check `git diff pnpm-lock.yaml`; a downgrade or unrelated bump is a stop-and-report)
- [x] `src/app.css` has `@import "tw-animate-css";` directly after `@import "tailwindcss";`; nothing else in `app.css` changes
- [x] The 9 primitive files are unchanged
- [x] After `pnpm build`, the emitted CSS under `build/_app/immutable/assets/` contains an `enter` and an `exit` keyframe and a `.animate-in` rule (a one-off `grep` reported in the task comment, not a committed test)
- [x] The overlay E2E specs in the Gate line pass; a spec that now fails only because a closing menu is still mounted for its 150 ms exit is fixed by waiting on the real state (for example `toBeHidden()`), never by a fixed sleep, and the change is named in the task report
- [x] The commit carries the new E2E spec, so no `Test-Exempt` trailer is needed

## Notes

- **Source:** review `.scratch/ux-polish/review-2026-11-04.md` summary item 1 and section 4 row 1; `work/overlays.md` P1 and R1; `work/states.md` P1 and R1.
- **Why no unit test:** jsdom evaluates no CSS, so only a real browser can prove the classes now emit animation. `@tailwindcss/node` is not installed, and compiling Tailwind inside Vitest is out of scope.
- **Behavior to know:** bits-ui waits for `animationend` before it unmounts a closing overlay, so menus and dialogs now stay in the DOM for 150 to 200 ms after closing. That is the intended exit animation.
- **Out of scope:** reduced-motion handling (Issue 35), motion tokens (`--duration-*`, `--ease-*`; nothing would read them yet), the Settings drawer fly, and hand-rolled overlays (canvas pickers, `.cm-tooltip`, callout popover), which do not use these classes.
- **Not verified:** the rendered motion in the Tauri WKWebView; Playwright runs Chromium only (`e2e/playwright.config.ts`).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/34-overlay-motion-on`: added `tw-animate-css@1.4.0` (devDependency, lockfile via `pnpm add`) and `@import "tw-animate-css";` after `@import "tailwindcss";` in `src/app.css`; the 9 primitives are unchanged. New `e2e/specs/overlay-motion.spec.ts` asserts the dialog, overlay and context-menu enter animation, and (review 1 fix) the context menu's `exit` animation on Escape followed by `toBeHidden()`. Tests: `pnpm check` exit 0 (215 files, 0 errors); `bash scripts/e2e.sh e2e/specs/overlay-motion.spec.ts --repeat-each=3` exit 0, 6 passed; full suite at 0e8186f79 exit 0 (492 files, 11669 passed, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED (fix applied), round 2 APPROVED (one nit on the 150 ms exit window, left as is unless it flakes).
