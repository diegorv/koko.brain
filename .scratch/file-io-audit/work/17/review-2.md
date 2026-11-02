VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `properties.service.ts:92` passes `id: frontmatter-refused:<path>` to `toastFrontmatterWriteError` (`frontmatter-write.service.ts:64-72`, which forwards it to `toast.error`). `updateProperty` returns `commitChanges`'s result (`properties.service.ts:124-133`), `PropertiesView.svelte:116-122` forwards it, and `PropertyField.svelte:60-61,122` bumps `refusals` and rebuilds the value control in `{#key refusals}`. `properties-refusal-toast.test.ts` runs the real svelte-sonner: two refused `updateProperty` calls leave `toast.getActiveToasts()` at length 1. That test fails without the id. `PropertyField.test.ts` covers a refused text input, a refused checkbox and an accepted control. |
| 2 | minor | resolved (owner decision pending) | `properties.service.test.ts:424-435` pins that an empty `---\n---` block still accepts `addNewProperty`. Refusing a comment-only block is kept on purpose: it follows the Issue's comment rule and matches `updateNoteFrontmatter`. The owner still has to confirm it (see finding 2 below). |
| 3 | minor | resolved | `isFrontmatterUnparseable` and `UNPARSEABLE` are removed. grep finds no remaining reference in `src/`. The cache stores `Object.freeze([])`. The self-referencing alias case moved to a `parseFrontmatterProperties` / `detectLossyFrontmatter` test. Warn-once (`properties.logic.test.ts:403-408`) and the alias budget (`:341-363`) are still covered. The only test lost is the removed function's "reuses the earlier parse" timing check, which no longer applies. |
| 4 | nit | resolved | `deep-link-actions.ts:189-192` builds the suffix (title / tags / title and tags). `deep-link-capture-frontmatter.test.ts` asserts all three forms with `$` anchors. |
| 5 | nit | resolved | `widgets.ts:762-763` lowercases the first character. Every entry in `LOSSY_FRONTMATTER_MESSAGES` (`properties.logic.ts:378-385`) starts with "The note's", so no acronym gets mangled. `panel-meta-bind-lossy-rewrite.test.ts:98` asserts `^Cannot set done: the note's `. |

## Acceptance criteria re-checked

- [met] Failing test comes first. Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/panel-meta-bind-lossy-rewrite.test.ts` under `src/tests/`: one Properties panel checkbox and one meta-bind toggle on a note with a comment or a nested map either refuse with the toast and leave the bytes unchanged, or keep the comment and the map — `src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts` passes. Its only change in the fix is a tighter toast-prefix assertion, so it was not weakened.
- [met] A meta-bind toggle and a Properties panel checkbox on a note with `tweet_id: 1234567890123456789` refuse with the toast and leave the note's bytes unchanged — the guard in `commitChanges` and in `dispatchMetaBindUpdate` is unchanged apart from the toast id and casing. The `BIG_INT` cases still pass.
- [met] A link capture with the title `Clean Code: A Handbook` and a template with `title: <% title %>` and `created: ...` keeps `created` and every other template key, or skips the injection and shows a toast; a note capture with tags whose template block does not parse behaves the same way — `deep-link-capture-frontmatter.test.ts` passes. The fix only appends the suffix and adds the title-and-tags case.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest run, exit 0: 115 files, 2233 passed, 1 skipped. Files: `src/tests/lib/features/properties/`, `src/tests/lib/core/frontmatter/`, `src/tests/lib/app/deep-link-capture-frontmatter.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/`, `src/tests/lib/features/deep-link/`.
- Not run: the full suite and `pnpm build`, which deliver runs. No `src-tauri/` change. The layer baseline is untouched.

## Findings

1. nit — `src/lib/features/properties/PropertyField.svelte:122`. A refused keystroke rebuilds the value control through `{#key refusals}`, so the input loses focus after the first refused character. That is acceptable, since the edit cannot be saved anyway, but it has only been checked in jsdom. Fix: none needed. Optionally check it in the running app.
2. minor — `src/tests/lib/features/properties/properties.service.test.ts:409-422`. The owner still has to confirm the comment-only block refusal: a template placeholder block such as `---\n# nothing yet\n---` makes the note's properties read-only in the panel. Fix: confirm with the owner at delivery. If the refusal is not wanted, open a follow-up to let `detectLossyFrontmatter` ignore a block that holds only comments.
