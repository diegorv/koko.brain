VERDICT: APPROVED

Re-review of the fix commit 9c8336077 (`git diff df1330bdd..HEAD`), touching `src/lib/core/markdown-editor/EditorTabs.svelte` and `src/tests/lib/core/markdown-editor/EditorTabs.test.ts`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `EditorTabs.svelte:36-41`: the effect reads `editorStore.activeIndex` and a component `$derived` of `editorStore.activeTabPath`. The store getter (`editor.store.svelte.ts:39`) reads `tabs.length`, so the `$derived` is what keeps a close after the active tab from re-running the effect: the derived recomputes but yields the same string, and its dependents are not notified. New test `does not scroll when a tab after the active one closes`. With the pre-fix component (df1330bdd) put back temporarily it fails (1 failed, 4 passed, exit 1). With the fix it passes. A pinned insert at the active index and closing the active tab mid-strip still change the path, so they still scroll. |
| 2 | nit | rejection stands | The round-1 review flagged it as unverified, and the Issue Notes list scrollbar behavior as not verified. Replacing `scrollIntoView` without a repro would be speculative. |
| 3 | nit | resolved | New test `scrolls the active tab into view when tabs are restored into an empty strip`: it mounts with zero tabs, adds three, calls `setActiveIndex(1)` and checks that the last call's `this` is `tabs[1]`. It passes, and it guards the effect's dependency on `strip`, which is created by the `{#if}`. |

## Acceptance criteria re-checked

- [met] Failing first: new `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` mounts `EditorTabs` with the real `editorStore` and three tabs, spies on `Element.prototype.scrollIntoView` (jsdom has no layout), switches the active tab, and asserts the spy ran on the newly active `[role="tab"]` element with `inline: 'nearest'`. It fails on the current code — the original switch test is unchanged. It still asserts `{ block: 'nearest', inline: 'nearest' }` on `tabs[0]`, and with the two new cases the file passes 5 of 5. No assertion was weakened or removed.
- [met] E2E in `e2e/specs/tabs.spec.ts`: at a narrow viewport (`page.setViewportSize`) open enough notes to overflow the strip; the active tab's bounding box lies inside `.editor-tabs-bar`'s box after opening a new note and after cycling back to the first tab with Mod+Shift+BracketLeft — `bash scripts/e2e.sh e2e/specs/tabs.spec.ts e2e/specs/tab-pinning.spec.ts` on HEAD 9c8336077 gave 8 passed (exit 0). Opening a note and cycling both change `activeIndex` and the path, so the narrower dependency still scrolls.
- [met] The existing `tabs.spec.ts` and `tab-pinning.spec.ts` cases stay green — same E2E run: 8 passed (exit 0).

## Findings

None open or new.

## Checks run by this review

- Typecheck: `taskpolicy -c background pnpm check`: 0 errors, 0 warnings (exit 0).
- Unit tests: `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/EditorTabs.test.ts src/tests/lib/app/EditorView.test.ts src/tests/lib/app/AppShell.test.ts`: 3 files, 29 passed (exit 0).
- Red check: with the pre-fix component, the new close test fails. I restored the file afterwards and `git status` was clean.
- I did not run the full vitest suite or `pnpm build`. Deliver runs them.
- Scope: the fix touches only the component's effect and its test file. `layer-baseline.json` and `BASELINE_SIZE` are untouched, and nothing under `src-tauri/` changed.
