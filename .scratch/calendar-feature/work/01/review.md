VERDICT: APPROVED

# 01 review: pre-flight checks (a) to (h)

Reviewed `git diff main...HEAD` (abf710b5, f1d9cab5) in the worktree. The diff touches only `.scratch/` markdown, so it changes no source, frontend or Rust code. `pnpm check` and the gate were not run, because the diff does not touch the frontend.

Test verdict: the diff adds and changes no test file, so no test files apply. Each answer was re-derived independently instead:
- (f): a throwaway `// @vitest-environment jsdom` probe under `src/tests/zz-review-probe/` was run with `./node_modules/.bin/vitest run` (1 passed), then deleted. `git status --short` is clean.
- (d): two `node -e` probes against `node_modules/yaml`.
- (a), (b), (c), (e), (g) and (h): direct reads and greps of the installed packages, the lockfile and git refs.

## Acceptance criteria

- [met] `pnpm install --frozen-lockfile` ran and `pnpm-lock.yaml` is unchanged. The worktree status is clean and the lockfile is not in the diff. The log names the package paths for each answer.
- [met] (a) bits-ui 2.19.5 (`bits-ui/package.json`).
  - `customAnchor?: string | HTMLElement | Measurable | null` is at `dist/bits/utilities/floating-layer/types.d.ts:93`, and `Measurable` is defined at `dist/internal/floating-svelte/types.d.ts:4-6`. `PopperLayerProps` includes `FloatingLayerContentProps` and `FocusScopeProps` (`popper-layer/types.d.ts:10`).
  - `Portal` is re-exported in `bits/popover/exports.js`.
  - `Dialog.Content` takes `FocusScopeProps` (`bits/dialog/types.d.ts:28`). The `preventDefault` skip is at `focus-scope.svelte.js:57, 82`.
  - Both shadcn wrappers (`src/lib/components/ui/popover/popover-content.svelte:10, 23` and `src/lib/components/ui/dialog/dialog-content.svelte:16, 33`) spread `restProps` without destructuring the three props.
- [met] (b) svelte-sonner 1.2.1.
  - `ToastAction` is at `dist/types.d.ts:29-33` and `action?:` at `:54`.
  - `dist/Toast.svelte:681-684` calls `onClick(event)`, then dismisses the toast unless `defaultPrevented` is set.
- [met] (c) `@lucide/svelte` 1.59.0.
  - `calendar-range`, `map-pin` and `triangle-alert` each have `.svelte`, `.js` and `.svelte.d.ts` files.
  - `alert-triangle` has only `.js` / `.d.ts`, so it cannot match the `./icons/*` `types` pattern (`package.json:43-46`). The caveat is correct.
- [met] (d) yaml 2.9.0.
  - Re-ran `node -e`: it printed `"date: 2026-11-10\nstart: 09:30\n"`.
  - Re-ran a `parseDocument(raw, { uniqueKeys: false })` + `visit` probe: 0 errors; keys `date,start,list,dup,dup,base,ref`; `Seq` items `YAMLMap,YAMLSeq,YAMLMap`; `anchor: "anc"`; an `Alias` with `source: "anc"`; and `DUPLICATE_KEY` without the option.
  - Comment placement has one nuance; see finding 3.
- [met] (e) bullet 1.
  - None of the `dist/index.js` files of `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2 and `@codemirror/autocomplete` 6.20.3 contains a string literal ending in `-c` / `-C`.
  - `editor-extensions.ts:91-105` adds only `Mod-Shift-l`.
  - Bullets 2-3 are correctly left to ticket 02. For `global-keybindings.ts`, see finding 2.
- [met] (f) jsdom 30.1.3 / vitest 4.1.12, re-probed:
  - `PointerEvent` is a function, and `pointerId` and `pointerType` round-trip.
  - `setPointerCapture`, `releasePointerCapture` and `hasPointerCapture` are `undefined`.
  - Time-zone offsets: 180 with TZ unset, 240 in New York, 300 for 2026-03-07, and back to 180 after restore. This matches the log.
- [met] (g) The overlapping plans:
  - On main, all 12 `.scratch/sveltekit-3-migration/issues/*.md` files are `ready-for-agent`.
  - `chore/sveltekit-3-migration` is at `88763a7e` and exists on origin (`git ls-remote`). It is 13 commits ahead of main and 22 behind, it holds only `02-bump-bits-ui-runed.md` (`deferred`), and its package.json has `@sveltejs/kit ^3.1.0`.
  - In the lockfile, `bits-ui@2.19.5` is at `:1270` and `runed@0.35.1` at `:1941`.
  - In the p2p-sync plan, Tasks 1-14 are all `[ ]` (`:232-299`).
- [met] (h) Playwright 1.64.1.
  - The `install` docs are at `types/types.d.ts:20797-20822` and `timezoneId` at `:26666-26671`.
  - `coreBundle.js` has `isFixedTime: false` on install and a `controller.resume()` path, and it contains `setTimezoneOverride`.
  - `e2e/playwright.config.ts` has a single `chromium` project with no `timezoneId`.
  - `browsers.json` pins chromium `1248`, and only `chromium-1193` and `-1243` are cached locally, so the "answered from source" caveat is accurate.
- [met] Every "no" switched its ticket: the only "no" is (f), and `issues/30-pointer-drag.md:25` now takes the logic-only plus E2E fallback. For the cases where a "yes" left a ticket conditional, I grepped the other tickets: 12, 21, 24, 26, 27, 29 and 31 all phrase their condition as "if ticket 01 records no", and 05 runs behind `describe.runIf`. None needs an edit.
- [met, with a workflow deviation] The gate is green with no source change. `git diff main...HEAD --stat` also lists `issues/01-preflight-checks.md` (ticked boxes and Comments) and `work/01/discovery.md`, and there are two commits, not one. The implement-brain-issue workflow requires both, so I accept the deviation. The commit messages have Context, Problem, Solution, Behavior and Files, plus the Co-Authored-By line.
- Plan Task 1 stays `[ ]`. This is correct, because ticket 02 still owns two of the (e) checks.

## Findings

1. **Low**: `.scratch/calendar-feature/issues/30-pointer-drag.md:25` (and the plan log at `.scratch/calendar-feature/plan-2026-10-28.md:1346`). The fallback switch rests on a strict reading: "both `PointerEvent` and `setPointerCapture`" (discovery "Defaults taken"). But ticket 30 itself takes capture with `bodyEl.setPointerCapture?.(e.pointerId)` (`30-pointer-drag.md:20`, plan `:688`), so a jsdom smoke test would not throw on the missing method. Only `PointerEvent` matters, and it exists. Logic-only is still defensible: jsdom's zero-size `getBoundingClientRect` makes a slot-level smoke test weak, and the E2E covers the behavior. Still, the reason for the choice is not recorded where ticket 30's implementer will read it. Fix: add one clause to ticket 30:25, for example "(the `?.` capture call would tolerate the gap, but jsdom rects are zero-size, so the E2E carries the pointer wiring)". Optional; not blocking.
2. **Low**: `.scratch/calendar-feature/plan-2026-10-28.md:1345` ((e) bullet 1). The log greps `src/lib` for the string `Mod-Shift-c`. But the app's own registry, `src/lib/core/keybindings/global-keybindings.ts`, declares bindings as `{ key: 'c', meta: true, shift: true }` objects, which that grep cannot match, and ticket 31 adds its toggle to that file. I checked it: its letter keys are p, o, s, w, f, g, t, b, n, h and k (`:50-150`), so Cmd+Shift+C is free, and the answer stands. Fix: add "`src/lib/core/keybindings/global-keybindings.ts` registers no `key: 'c'` with meta+shift" to the (e) line.
3. **Low**: `.scratch/calendar-feature/plan-2026-10-28.md:1344` ((d)). The log says a separated top comment lands on `doc.commentBefore`. The re-probe shows the landing node depends on the layout:
   - `# top\n\ndate: x` lands on `doc.commentBefore`.
   - `# top\ndate: x` lands on the first key scalar's `commentBefore`.
   - `---\n# top\n\ndate: x` lands on neither: it lands on `doc.contents.commentBefore` (the root `YAMLMap`).

   Ticket 12's "any comment on the document or a node" covers all three only if the check reads `doc.commentBefore` / `doc.comment` and also visits every node, including the root map and `Pair` keys. Fix: add this placement note to the (d) line so ticket 12 does not test `doc.*` plus value nodes only.
4. **Info**: `.scratch/calendar-feature/plan-2026-10-28.md:1354` ((h)). The log correctly says chromium-1248 is not installed. Every later ticket with an E2E gate (21 onward) will fail in `bash scripts/e2e.sh` on this machine until `pnpm exec playwright install chromium` runs. `scripts/e2e.sh:68` does not install browsers. Fix (optional): add one sentence saying so, so the first E2E ticket does not misread a launch failure as a test failure.
5. **Nit**: commit f1d9cab5, the Files section. It cites `plan-2026-10-28.md:1334-1356`, but the file has 1355 lines (1334-1355). There is no action, since rewriting history is not worth an off-by-one.

None of the findings is blocking: every acceptance criterion is met, and each answer matches an independent re-check. Findings 1-4 are one-line clarifications the fix step may apply to the plan log or ticket 30.
