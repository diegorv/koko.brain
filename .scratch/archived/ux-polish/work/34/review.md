VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a new `e2e/specs/overlay-motion.spec.ts` opens the command palette (`openCommandPalette` from `e2e/fixtures/helpers.ts`) and asserts `getComputedStyle` of `[data-slot="dialog-content"]` and `[data-slot="dialog-overlay"]` has `animationName` other than `none`; it opens a file-row context menu in the Files navigator and asserts the same on `[data-slot="context-menu-content"]`. Run it on the current code and see it fail (today the classes emit nothing, so `animationName` is `none`) — `e2e/specs/overlay-motion.spec.ts:16-36` does exactly this (`openCommandPalette`, then `showFolder` + right-click `listRow(page, 'Inbox')`). Probe: I put the pre-branch `src/app.css` (0b11c704c, no import) back temporarily and ran `bash scripts/e2e.sh e2e/specs/overlay-motion.spec.ts`: exit 1, 2 failed, each on `Expected: not "none"`. I then restored the file (`git status` clean). With the branch code the spec passes (see the Gate run below).
- [met] `package.json` `devDependencies` gains `tw-animate-css` at `1.4.0` and `pnpm-lock.yaml` is updated by `pnpm add`, with no other resolved version changing (check `git diff pnpm-lock.yaml`; a downgrade or unrelated bump is a stop-and-report) — `package.json:104` has `"tw-animate-css": "1.4.0"` (exact). `git diff main...HEAD -- pnpm-lock.yaml` has 8 added lines and 0 removed ones: the importer entry (249-251), the package entry with its integrity hash (2073-2075) and the snapshot (4113-4114). No other version moves.
- [met] `src/app.css` has `@import "tw-animate-css";` directly after `@import "tailwindcss";`; nothing else in `app.css` changes — `git diff main...HEAD -- src/app.css` is the single inserted line 2. `git merge-tree --write-tree main HEAD` also merges cleanly with Issue 16's later `app.css` edits on main.
- [met] The 9 primitive files are unchanged — `git diff main...HEAD --name-only -- src/lib/components/ui` is empty. Every animation class those 9 files use (`animate-in/out`, `fade-in/out-0`, `zoom-in/out-95`, `slide-in-from-{top,bottom,start,end}-2`) is a `@utility` or theme key in `node_modules/tw-animate-css/dist/tw-animate.css`.
- [met] After `pnpm build`, the emitted CSS under `build/_app/immutable/assets/` contains an `enter` and an `exit` keyframe and a `.animate-in` rule (a one-off `grep` reported in the task comment, not a committed test) — I ran `taskpolicy -c background pnpm build` myself (exit 0). `build/_app/immutable/assets/0.CEOUlvg7.css` has one `@keyframes enter`, one `@keyframes exit`, `.animate-in{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))...}` and `.data-\[state\=closed\]\:animate-out[data-state=closed]{animation:exit ...}`.
- [met] The overlay E2E specs in the Gate line pass; a spec that now fails only because a closing menu is still mounted for its 150 ms exit is fixed by waiting on the real state (for example `toBeHidden()`), never by a fixed sleep, and the change is named in the task report — I ran the 7 Gate specs myself (`bash scripts/e2e.sh e2e/specs/overlay-motion.spec.ts e2e/specs/command-palette.spec.ts e2e/specs/quick-switcher.spec.ts e2e/specs/note-action-bar.spec.ts e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/settings.spec.ts`): exit 0, 57 passed, with no flaky, retried or failed tests in the log. No existing spec changed, so there was nothing to name.
- [met] The commit carries the new E2E spec, so no `Test-Exempt` trailer is needed — the spec is in branch commit 0266b757d, and deliver squashes the branch into one `feat:` commit, so that commit carries it. A `feat:` commit needs no `Test-Exempt` either way.

## Checks run by this review

- Typecheck: `taskpolicy -c background pnpm check` reported exit 0, 215 files, 0 errors, 0 warnings.
- Vitest: the files that read `app.css` or `package.json` (`chrome-type-scale`, `theme-css-contract`, `event-color-tokens`, `PropertyField`, `lib-subpath-import`, `font-stacks`, `text-roles`) plus `src/tests/lib/architecture/` gave exit 0, 15 files and 141 tests passed. The diff changes no `.ts`/`.svelte` source, so no other unit test covers it.
- E2E: the probe without the import (2 failed) and the 7 Gate specs (57 passed). My E2E verdict rests on those two runs.
- Build: `taskpolicy -c background pnpm build` exited 0. The full suite is left to deliver.
- Collision scan: tw-animate-css also defines the utilities `delay-*`, `running`, `paused`, `repeat-*`, `direction-*`, `fill-mode-*`, `blur-in/out` and `spin-in/out`. `src/` uses none of them as a class name. "running" appears only in comments, which can make Tailwind emit an unused `.running` rule; no element carries that class. No app CSS defines `@keyframes enter`/`exit` or `--animate-in`/`--animate-out`.
- Layer baseline and composition roots: untouched.

## Findings

1. nit, `e2e/specs/overlay-motion.spec.ts:28` — the spec proves only the enter animation. The Issue's behavior also covers animating out on close (`data-[state=closed]:animate-out`), and that is backed only by the build grep. Fix (optional): close the context menu with Escape, assert `animationName` is `exit` while `data-state="closed"`, then `toBeHidden()`.
2. nit, `.scratch/ux-polish/work/34/discovery.md:20` — the plan says the spec asserts "via `expect.poll`", but the spec reads `animationName` once after `toBeVisible()`. That is correct, because the class is present from mount, but the record no longer matches the code. Fix: none needed. It is a workflow record.
3. nit, branch base — the build report says the branch was rebased onto main, but its merge-base is 0b11c704c and main is now a44ceb067 (Issue 16 landed). `git merge-tree` shows no conflict. Fix: deliver's rebase, as usual.

## Resolution

1. Fixed. `e2e/specs/overlay-motion.spec.ts` now closes the context menu with Escape, asserts `animationName` is `exit` on `[data-slot="context-menu-content"][data-state="closed"]`, then `toBeHidden()`. `bash scripts/e2e.sh e2e/specs/overlay-motion.spec.ts --repeat-each=3`: exit 0, 6 passed.
2. No change, as the review says: the discovery file is a workflow record and the single read after `toBeVisible()` is correct.
3. Handled by deliver's sync (rebase onto main).
