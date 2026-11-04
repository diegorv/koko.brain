VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | Edit view prefilled a label that already fails `validateViewName`, Save disabled with no message | resolved | `ViewDialog.svelte:74` sets `typed = true` at the start of `load()`; `setOpen(false)` still resets it to `false`, so New view (which never calls `load`) keeps its quiet first render. `ViewDialog.svelte.test.ts:648-662` asserts the message text in `[data-view-dialog-name-error]` and the disabled Save for `Q1: goals` and for another view's label (`Reading`), and no message for a valid prefill. The tests would fail on the pre-fix code (message gated on `typed`). |
| 2 | nit | A missing `_sidebar_label` was appended after `views:` | resolved | `yaml-parser.ts:277` builds `{ _sidebar_label: undefined, ...obj }` only when the key is absent, then assigns the label, so it serialises first; an existing key is mutated in place and keeps its position. All later writes (`filters` set/delete) now go to `out`, which is the same object as `obj` or a shallow copy holding the same `views` array, so `first` mutations still land in the output. `yaml-parser.test.ts:929-937` checks both orders on the first two output lines. |

## Acceptance criteria re-checked

- [met] Prefill: the label (the one the row shows, so a view without `_sidebar_label` prefills the filename, as `getViewLabel` does), the first view's filters and, when present, the top-level filters load into the dialog's two sections. In Edit the "All views" section is shown only when the view had top-level filters when the dialog opened; New view still shows only "This view" (component test, real filter logic) — the fix only adds `typed = true` to `load()`; prefill of `name`, `groups`, `globalGroups` and `showGlobal` is unchanged, and the existing prefill and New view tests in `ViewDialog.svelte.test.ts` pass.
- [met] Save rewrites `_sidebar_label`, the first view's name and the two filter places, and keeps every other key as values: `_icon`, `_color`, `_sort`, `_order`, `_open_in_editor`, the view's sort, columns and limit, and any other views (logic test, real YAML updater) — `updateViewEditYaml` still writes label, `views[0].name` and both filter places on `out`, which holds every original key; the existing "rewrites the label, the first view name and both filter places, keeping every other key" test passes, plus the two new order tests.
- [met] The duplicate-label check is Issue 17's `validateViewName`, with `existingLabels` built from the view rows other than the edited view's own row (matched by path), so saving with the same name, or a case change of it, is allowed while another view's label is still refused (logic test) — unchanged `otherViewLabels`; the new component test shows another view's label now refused with its message at open; `lens.logic.test.ts` and `TypesNavigator.test.ts` pass.

## Findings

None open or new.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/collection/yaml-parser.test.ts src/tests/lib/features/type-definitions/ src/tests/lib/features/rail-shell/`: exit 0, 27 files, 933 tests passed.
- No test weakened or deleted in the fix commit (`git diff 8b4976aaa..HEAD` only adds tests). No scope creep: the fix touches only `yaml-parser.ts`, `ViewDialog.svelte` and their tests. No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots.
- Not run: the full suite and `pnpm build` (deliver's gate), and the E2E (the fix changes only the dialog's name message and YAML key order; the E2E reads the saved file's values).
