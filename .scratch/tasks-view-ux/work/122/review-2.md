VERDICT: APPROVED

Re-review of the fixes in 220f170fc (diff `29f87fac2..HEAD`): `src/lib/utils/task-tokens.ts`, `src/tests/fixtures/task-line-edits.fixture.json`, and Notes in Issues 122 and 246.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `insertToken` (`src/lib/utils/task-tokens.ts:91-101`) now inserts before the first `🔁` when the text ends in a block id (`:94-96`), through the shared `insertBefore` helper (`:79-82`), which the `🆔` branch also uses with unchanged behavior. The two new fixture cases (`water 🔁 every week ^abc` -> `water 📅 2026-11-20 🔁 every week ^abc` and `water ⏫ 🔁 every week ^abc`) pass in `task-tokens.test.ts` and in the Rust parity test, which compares every non-op field (recurrence included) against `parse_task_metadata(text)`, so the old placement (`every week  ^abc`) would fail it. `RECURRENCE_RE` is unchanged. The choice is in Issue 122's Notes. |
| 2 | nit | resolved | Issue 246's Notes now restrict its e2e fixtures to `-` / `*` LF lines and name the mock gap. The finding allowed this option. |
| 3 | nit | rejection stands | Nothing to change, as the round 1 review said. |

## Acceptance criteria re-checked

- [met] Failing tests first. `src/tests/fixtures/task-line-edits.fixture.json`, shape `{ "cases": [ { "name", "text", "op": { "kind": "due", "date": "YYYY-MM-DD" | null } | { "kind": "priority", "priority": "highest" | "high" | "medium" | "low" | "lowest" | null }, "expected" } ] }`, drives `src/tests/lib/utils/task-tokens.test.ts` (`setDueToken` / `setPriorityToken` of `text` equals `expected`). Cases: no due yet; replace a due; a due with no space after the signifier; clear a due, and clear when none (expected equals text); a due with a variation selector U+FE0F; set a priority on text with none; replace one; two priority signifiers present; priority `null`; text ending in a block id; text ending in a Todoist anchor and a block id; text with a recurrence; a wikilink holding `#`; scheduled, start and created dates and tags untouched; trailing whitespace; text that is only a tag. — the fixture keeps every earlier case and gains two recurrence-plus-block-id cases with the same shape; `pnpm vitest run src/tests/lib/utils/task-tokens.test.ts ...` passes (40 files, 948 tests, exit 0).
- [met] Rust parity, `src-tauri/tests/vault_task_line_edits_parity_test.rs`, loading the fixture with `include_str!` as `vault_natural_sort_parity_test.rs` does: for each case, `parse_task_metadata(expected)` gives the op's due date or priority (`None` for `null`), and every other field (scheduled, start, created, recurrence, id, depends on, on completion, tags, description) equals `parse_task_metadata(text)`'s. This test checks hand-written strings, so it is red only against a wrong `expected`: write one deliberately wrong case first, see it fail, then correct it, and say so in the review. — `cargo test --manifest-path src-tauri/Cargo.toml --test vault_task_line_edits_parity_test` passes (exit 0) with the two new cases, so their recurrence parses as `every week ^abc`, the same as the input's. The test file is unchanged by the fix.
- [met] `src/tests/lib/features/todoist-sync/task-line.logic.test.ts` passes with no test changed. — `git diff main...HEAD -- src/tests/lib/features/todoist-sync/` is empty, and the folder passes in my targeted run. The fix also moves `addTag`'s tag before a `🔁` on block-id text (`task-line.logic.ts:197` calls `insertToken`); that keeps the recurrence intact too (`RECURRENCE_RE` stops at `#`, so the old placement shortened it to `every week`).
- [met] Targeted checks also include `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts` (a new `utils` file and new imports from `todoist-sync`); `feature-cycle-baseline.json` gains no pair. — all of `src/tests/lib/architecture/` passes in my targeted run; the fix adds no import and touches neither baseline.

## Findings

None open, none new.

## Checks run by this re-review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/utils/task-tokens.test.ts src/tests/lib/features/todoist-sync/ src/tests/e2e/vault-index-task-text.test.ts src/tests/lib/architecture/`: exit 0, 40 files, 948 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_task_line_edits_parity_test`: exit 0.
- No test weakened or deleted; no scope creep outside the Issue files and this work folder. Full `pnpm vitest run` and `cargo test` are deliver's to run.
