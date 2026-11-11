VERDICT: APPROVED

Re-review round 2 of the fixes in 068365cca (`git diff 214271c4a..HEAD`), against `.scratch/frontmatter-rules/work/01/review.md` and `.scratch/frontmatter-rules/issues/01-rules-set-properties-on-save.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `auto-move.logic.ts:208` now gates on `typeof type?.value === 'string' && normalizeTypeCasing(type.value) === 'Type'`. `normalizeTypeCasing` (`properties.logic.ts:812`) uppercases the first letter and keeps the rest, the same as Rust `extract_is_a`/`normalize_type_casing` (`src-tauri/src/vault/entry.rs`). The new logic test "refuses a type definition whose _type is lowercase" covers `_type: type`; the existing `_type: Project` null case and `type: Type` alias case still pass. |
| 2 | minor | resolved | New service test "evaluates the open tab content over the disk content" adds a real `editorStore` tab (`status: done`, body `unsaved`) over mocked disk (`status: draft`) and asserts the written frontmatter and body come from the tab, with `editorStore.reset()` in `finally`. My mutation probe: replacing `if (tab) return tab.content;` in `readCurrentContent` (`auto-move.service.ts:189`) makes this test fail (exit 1); source restored, worktree clean. |
| 3 | nit | resolved | Protected-folder match lowercases both the file path and `${vaultPath}/${rel}/` (`auto-move.logic.ts:199-202`). The returned reason keeps the configured spelling. New logic test checks `_System` against `_system/` and `Templates` against `templates/`. The sibling-prefix control (`Templates-old/`) still holds since the trailing `/` is kept. |

## Acceptance criteria re-checked

- [met] Gates: a `.canvas` file, a note under `_system/`, a note in a templates folder set outside `_system`, a type definition note, lossy frontmatter (a YAML comment) and an empty `---\n---` block are not written. — service `describe('gates')` tests still pass; logic tests now also cover `_type: type` and case-insensitive folders.
- [met] Fresh content: when the note's content changes between the save and the timer, the run evaluates the new content. A note deleted before the timer fires produces no write and no error log. — disk and deleted-note tests still pass, and the open-tab path is now tested and mutation-checked.
- [met] `auto-move.logic.test.ts` covers the pure planner (which rules match, which one moves, which property values win and which are missing), with happy path, empty and null inputs. — two cases added to `describe('propertyWriteSkipReason')`, none removed.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (228 files, 0 errors, 0 warnings); `pnpm vitest run src/tests/lib/features/auto-move/` exit 0 (6 files, 162 tests). The full suite is deliver's to run.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/auto-move/`: exit 0, 6 files, 162 tests.
- Mutation probe on the `readCurrentContent` tab branch: the new tab test fails; restored.
- Fix diff touches only `auto-move.logic.ts`, its logic test, the service test and `review.md`. No test weakened or deleted, no layer-baseline change, no `BASELINE_SIZE` change, tabs only, no scope creep.

## Findings

None open or new.
