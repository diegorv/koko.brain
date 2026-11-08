VERDICT: APPROVED

# Issue 42 review

Reviewed `git diff main...HEAD` (b3d5d40e, 6d4ebcbb) in the worktree.

## Acceptance criteria

- [met] A meta-bind select, input or button write on a note whose frontmatter does not parse leaves the note unchanged (a test per writer) — `dispatchMetaBindUpdate` (`widgets.ts:780-786`) returns before any `view.dispatch` when `isFrontmatterUnparseable(doc)`; the select `change` handler (`widgets.ts:739`, also used by table-cell selects), the number/date/text inputs (`widgets.ts:943`), the toggle (`widgets.ts:887`) and the button `updateMetadata` action (`meta-bind-button-widget.ts:82-83`) all route through it, and no other caller of `setPropertyByBindTarget` remains in `src/lib`. `meta-bind-writers.test.ts` mounts the real widgets for select, number input, toggle and button, fires the real DOM event, and asserts the doc stays byte-identical to the unparseable input (`toBe(UNPARSEABLE)`), plus a happy-path write per writer that keeps the other keys. The toast assertion in the refusal test can only pass through the guard branch, so the fixture does hit `isFrontmatterUnparseable`. Ran it myself: pass.
- [met] The user sees why the write was refused — `toast.error("Cannot set <prop>: the note's frontmatter could not be parsed; fix it in the note")` at `widgets.ts:784`, plus an `appendLog('META-BIND', ...)` line; each refusal test asserts exactly one `toast.error` call matching `/frontmatter could not be parsed/`. Seen only through the `svelte-sonner` mock, not in the running app.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview src/tests/lib/architecture src/tests/lib/features/properties`: exit 0, 1933 tests passed. My test verdict rests on these files, in particular `live-preview/meta-bind-writers.test.ts` (new), `live-preview/meta-bind-input-widgets.test.ts`, `live-preview/plugins/meta-bind-button-field.test.ts`, `live-preview/table-widget.test.ts`, `architecture/layer-rules.test.ts` and the import-graph tests, and `features/properties/*`.
- Full suite and `pnpm build` not run: deliver runs them. No `src-tauri/` changes.
- Layer baseline: one stale line deleted (`meta-bind-button-widget.ts -> properties.logic.ts`, the button no longer imports it) and `BASELINE_SIZE` lowered 58 -> 57. Nothing added, no new composition root. `svelte-sonner` is an external package and `widgets.ts` is in `core/`, so no new layer edge.
- `../widgets` in the button resolves to `live-preview/widgets.ts` (there is no `widgets/index.ts`); `widgets.ts` does not import the button widget, so no new cycle.
- Folding the select and button rebuild copies into `dispatchMetaBindUpdate` is in scope: the copies were byte-identical, and sharing one guard is what the Issue asks for.

## Findings

1. minor — `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:782-786`: on a refusal nothing is dispatched, so the widget is not rebuilt and the control keeps the refused value (the select shows the new option, the toggle stays checked, the number input keeps the typed number) while the note still holds the old one. The user sees the toast, but the control and the note disagree until something else rebuilds the decoration. Fix: on refusal, put the control back to the note's value (for example, have `dispatchMetaBindUpdate` return `false` and let each caller reset `select.value` / `cb.checked` / `input.value`), or send `forceDecorationRebuild`. A follow-up Issue is fine.
2. minor — `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:941-957`: the input `commit` runs on every blur, including after Escape (`input.value = initial; input.blur()`) and right after an Enter commit that did not rebuild the widget. On an unparseable note, the user gets an error toast after cancelling with Escape, after focusing and leaving the field without typing, and a second toast on the blur that follows a refused Enter. The no-op rewrite on blur was already there; the toast is what makes it visible. Fix: skip `commit` when `input.value === initial`, or only toast when the value differs from the note's current value.
3. nit — `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:33-35`: a button with several actions keeps running the rest after an `updateMetadata` refusal (for example, it still opens a note or runs a second `updateMetadata`, which shows a second toast). This is acceptable as is; stopping the action chain on the first refusal would need `dispatchMetaBindUpdate` to report the outcome (see finding 1).
4. nit — `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts:67-86`: the date input and the table-cell select are not exercised on their own. They share `commit` and `createMetaBindSelect` with the tested writers, so the guard covers them; one date case would pin that down if those paths ever split.

## Resolution

All four findings fixed; none rejected.

1. Fixed: `dispatchMetaBindUpdate` returns `false` on a refusal; the select (inline and table cell) resets to the note's value, the toggle flips back, the number/date input restores its initial value. Tested per control.
2. Fixed: the input `commit` returns early when `input.value === initial`, and a refused commit restores `initial`, so Escape, an untouched blur and the blur after a refused Enter show no extra toast. Tested.
3. Fixed: `executeButtonAction` returns `false` for a refused `updateMetadata` and the button stops its action chain. Tested with two `updateMetadata` actions (one toast).
4. Fixed: the date input and the table-cell select are writers of their own in `meta-bind-writers.test.ts`.
