VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests were written first and seen failing, for each item below. — The commit order alone cannot prove the sequence, so I re-ran the new unit tests against main's `rail-items.logic.ts`, `Rail.svelte`, `settings.store.svelte.ts` and `settings.types.ts`: 32 failed across 4 files, covering every unit item below. The E2E items all drive `[data-rail-resize]`, which main does not have. The build report records the failures it saw before the code existed.
- [met] `parseRailWidth`: in range, below 140, above 320, a fraction, a string, `NaN`, `Infinity`, `null`, `undefined`. — `rail-items.logic.test.ts` (`describe('parseRailWidth')`) covers each one, plus the bounds, `-Infinity`, a numeric string and an object. Passes.
- [met] `mergeLayout` keeps `railWidth` from a saved file and an old file without it gets 192. — `settings.logic.test.ts`, 'keeps a saved rail width, and an old file without one gets 192'. Passes, and fails against main's defaults.
- [met] `Rail.test.ts` (stub `setPointerCapture`, which jsdom lacks): a pointer move changes the frame's width and leaves `settingsStore.layout.railWidth` unchanged; `pointerup` writes the clamped value to the real store; a hand-edited `railWidth: "wide"` renders at 192. — `Rail.test.ts`, `describe('resize')`: `mountHandle` stubs the capture; 'follows the pointer in local state', 'clamps while dragging, and writes the clamped value', and 'renders a saved width, a hand-edited out-of-range one clamped and a hand-edited non-number at 192'. The store is real. Passes.
- [met] `Rail.test.ts`: a `dragstart` dispatched during a resize has `defaultPrevented` true, and one dispatched with no resize running has it false. — 'cancels a native dragstart only while a resize runs' checks before, during, after `pointerup` and after `pointercancel`. Passes.
- [met] E2E: dragging to 260 gives about 260 px, the file on the mock FS (`window.__e2e.fs.readFile`) holds that width after the drag, and a restart from that saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`; a bare `page.reload` reseeds the mock FS) opens at it. — `rail-styles.spec.ts`, 'a drag to 260 gives about 260 px, is saved, and a restart opens at it'. It polls `savedWidth` through `readFile`, then restarts from that file with a local copy of the helper (the original is not exported). Passes in my run.
- [met] E2E: dragging to 1000 gives 320, dragging to 10 gives 140, and a double-click on the handle gives 192 and saves it. — `rail-styles.spec.ts`, 'a drag clamps to 320 and to 140, and a double-click on the handle gives 192 and saves it'. Passes in my run.
- [met] E2E: a drag left from 320 px with the note list on the Inbox lens, ending past a note row, follows the pointer to the end, proving the row's native drag does not cancel it. — `rail-styles.spec.ts`, 'a drag left from 320 px on the Inbox lens...', which also asserts a draggable row sits under the pressed point. I removed both guards from `Rail.svelte`: the test fails at 149 px off the target (rail near 299 px). With either guard removed alone it passes, as the spec comment says, and `Rail.test.ts` pins each guard separately. Chromium only.
- [met] E2E: header text still starts past the rail at 140 and 320 px. — `rail-styles.spec.ts`, 'the header text starts past the rail at 140 px' and '... at 320 px', on all five lenses, at `railRight + 12` or more. Passes in my run.

## Findings

1. minor, `src/lib/features/rail-shell/Rail.svelte:171`: `startResize` does not filter by button, so a right press starts a resize. A throwaway Chromium probe (right press on the handle, move to x=280, release) left the rail at 280 px, with `contextmenu` firing before the release. I found no global `contextmenu` suppression in `src/routes`, `src/lib/app` or `src/app.html`, so the Tauri build should open its native menu with a resize running. If that menu swallows `pointerup`, the rail would follow the pointer and `dragstart` would stay blocked until the next click. I did not reproduce that part: Chromium delivers `pointerup`, and WebKit was not run. Fix: return early from `startResize` when `event.button !== 0`, and add a `Rail.test.ts` case where a `button: 2` press followed by a move leaves the frame's width unchanged.

## Other checks

- Typecheck: `pnpm check` exit 0, 0 errors, 0 warnings.
- The test verdict rests on these files, which I ran myself:
  - `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`, `src/tests/lib/features/rail-shell/Rail.test.ts`, `src/tests/lib/app/AppShell.test.ts`, `src/tests/lib/core/settings/settings.logic.test.ts`, `src/tests/lib/core/settings/settings.store.test.ts`, `src/tests/lib/core/settings/settings.service.test.ts`, `src/tests/lib/features/rail-shell/LayoutSection.test.ts`, `src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 399 passed.
  - `src/tests/lib/plugins/mods/mod-rail-icon.test.ts`, `src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts`: exit 0, 36 passed.
  - `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/sidebars.spec.ts`: exit 0, 23 passed.
- The full suite and `pnpm build` were not run; they are deliver's.
- Spec: the values match the Issue and `PRD.md` (`RAIL_WIDTH` 192/140/320, the handle's classes and attributes, the store write only at drag end, the pad through `parseRailWidth`, the setting in the vault's `layout.*`). `mergeLayout` keeps the key because it is in the defaults, and the persistence effect serializes it with every other setting.
- Layers: `rail-items.logic.ts` imports only `#lib/utils/clamp.js`; `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are unchanged.
- Scope: no creep. `help/documentation/19-settings.md` waits for Issue 05, which the PRD gives the docs.
- A press with no move writes nothing. The Issue does not cover this case, and the behavior is pinned by a test, so it is not a finding.
- All probes were temporary. The worktree was clean afterwards.
- Not verified: WebKit and the real Tauri app, since the E2E runs Chromium only. Whether the `dragstart` block holds a resize there is unconfirmed; the code matches the prototype's.
