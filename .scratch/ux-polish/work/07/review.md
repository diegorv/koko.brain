VERDICT: APPROVED

Reviewed `git diff main...HEAD` (6b10286c6, e4db07cda, 5c63e25e5) against `.scratch/ux-polish/issues/07-active-tab-scrolls-into-view.md`. The ux-polish feature has no `spec.md`. No ADR covers the tab strip.

## Acceptance criteria

- [met] Failing first: new `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` mounts `EditorTabs` with the real `editorStore` and three tabs, spies on `Element.prototype.scrollIntoView` (jsdom has no layout), switches the active tab, and asserts the spy ran on the newly active `[role="tab"]` element with `inline: 'nearest'`. It fails on the current code — the first test mounts with three `addTab` calls on the real store (only `@tauri-apps/api/core` is mocked), spies after mount, calls `setActiveIndex(0)` and asserts one call whose `this` is `tabs[0]` with `{ block: 'nearest', inline: 'nearest' }`. I put main's `EditorTabs.svelte` back temporarily: 2 failed, 1 passed (exit 1). Restored, 3 of 3 pass.
- [met] E2E in `e2e/specs/tabs.spec.ts`: at a narrow viewport (`page.setViewportSize`) open enough notes to overflow the strip; the active tab's bounding box lies inside `.editor-tabs-bar`'s box after opening a new note and after cycling back to the first tab with Mod+Shift+BracketLeft — `tabs.spec.ts:42` sets a 640px viewport, opens 6 notes, asserts `scrollWidth > clientWidth` so the check cannot pass without overflow, then checks the box is contained after opening the last note and again after `count - 1` presses of Mod+Shift+BracketLeft. It passes on the branch. Against main's component it fails (right edge 1357.1, limit 521.2).
- [met] E2E: a pinned tab, an inactive tab and the active tab have the same bounding-box height — `tabs.spec.ts:70` pins Welcome (and asserts it has no close button), so the three heights compared are pinned, inactive Inbox and active Roadmap, with exact equality. It passes on the branch. Against main's component it fails (30 vs 32).
- [met] The existing `tabs.spec.ts` and `tab-pinning.spec.ts` cases stay green — `bash scripts/e2e.sh e2e/specs/tabs.spec.ts e2e/specs/tab-pinning.spec.ts`: 8 passed (exit 0). That is the 6 existing cases plus the 2 new ones.

## Findings

1. minor — `src/lib/core/markdown-editor/EditorTabs.svelte:34` — Because the effect tracks `tabs.length`, closing any tab re-runs it. Say the user scrolls the strip away from the active tab to close tabs on the far side, after the active one. Each close leaves `activeIndex` unchanged but changes `length`, so the strip jumps back to the active tab and moves the next tab they wanted to close out of view. The Issue's text asks for `tabs.length`, so this follows the Issue; it is a recoverable glitch, not a blocker. Fix (owner's call): depend on `editorStore.activeIndex` and `editorStore.activeTabPath` instead of `tabs.length`. That still covers a pinned tab inserted at the boundary with the same index, and closing the active tab mid-strip, because the path changes in both. Add a unit test that closing a non-active tab after the active one does not call `scrollIntoView`.
2. nit — `src/lib/core/markdown-editor/EditorTabs.svelte:35` — `scrollIntoView` scrolls every scrollable ancestor, on both axes. The strip is `h-10` with `overflow-x-auto`, which makes overflow-y auto too. With always-shown scrollbars (macOS "Always", Linux, Windows), the horizontal scrollbar leaves less client height than the 4px + 32px tab. `block: 'nearest'` can then scroll the strip vertically and clip the top of the tabs. This is not verified, which matches the Issue Notes. If it shows up, set `strip.scrollLeft` from the tab's `offsetLeft` and `offsetWidth` instead of calling `scrollIntoView`.
3. nit — `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` — No test covers the session-restore path the Issue names, where tabs arrive in a strip that was mounted with zero tabs and the `{#if}` creates the strip. I probed it with a temporary test: mount with no tabs, add three, `setActiveIndex(1)`, and the last `scrollIntoView` call targets `tabs[1]`. It passes. I then deleted the probe. Adding it as a permanent case would guard the dependency on `strip`.

## Checks run by this review

- Typecheck: `taskpolicy -c background pnpm check`: 0 errors, 0 warnings (exit 0).
- Unit tests: `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/EditorTabs.test.ts src/tests/lib/app/EditorView.test.ts src/tests/lib/app/AppShell.test.ts`: 3 files, 27 passed (exit 0). EditorView.test.ts and AppShell.test.ts are the only test files that render `EditorTabs`, through `EditorView.svelte`. My test verdict rests on these three files plus the two E2E specs above.
- Red checks against main's `EditorTabs.svelte`: the unit test and both new E2E cases fail. I restored the file afterwards and `git status` was clean.
- I did not run the full vitest suite or `pnpm build`. Deliver runs them.
- Scope: the diff stays inside the Issue (component, its new test, the jsdom `scrollIntoView` stub in EditorView.test.ts, the E2E). `layer-baseline.json` and `BASELINE_SIZE` are untouched. Nothing under `src-tauri/` changed.

## Resolution

1. Fixed. The effect now tracks `editorStore.activeIndex` and a component-level `$derived` of `editorStore.activeTabPath` instead of `tabs.length`. The `$derived` is needed: the store's `activeTabPath` getter reads `tabs.length` itself, so tracking the getter directly still re-ran the effect on every close (the new test stayed red with it). New unit test: closing a tab after the active one does not call `scrollIntoView` (red before the fix, green after).
2. Rejected for now. Not reproduced, and the review marks it unverified; the Issue Notes already list scrollbar behavior as not verified. Replacing `scrollIntoView` with manual `scrollLeft` math without a repro would be a speculative patch.
3. Fixed. New unit test: mount with no tabs, add three, `setActiveIndex(1)`, the last `scrollIntoView` call targets `tabs[1]`.
