VERDICT: APPROVED

# Issue 41 review
Reviewed `git diff main...HEAD` (78d1f87f..858f1899) in the worktree. No `spec.md` exists for architecture-stability. ADR 0029 read for the canonical-form decisions.

## Acceptance criteria

- [met] A failing test first: `a: &x [[X]]\nb: *x` and `a: [[&x X]]\nb: *x` parse to the same properties as before 7c46f6bf (not `[]`) — properties.logic.test.ts:259-273 pins `{a: "[[X]]", b: "[[X]]"}` and `{a: "[[X]]", b: "X"}`; I swapped main's properties.logic.ts in and those tests failed (6 failed incl. alias + warning tests), then pass on the branch. Values match the issue's "before" values and Rust (fixture cases, cargo parity test 9/9 pass).
- [met] The alias-as-inner-item behaviour is pinned by a test, and recorded in the ADR 0029 amendment if it differs from Rust `project_value` — properties.logic.test.ts:283-297 pins `[[*x]]` and `[*l]` folding to `"[[X]]"`; frontmatter-parity.fixture.json carries both with the Rust value, and `cargo test --test vault_frontmatter_parity_test` passes, so TS matches Rust (no divergence to record); the ADR 0029 amendment at line 107 records the alias-first rule anyway.
- [met] YAML warnings are logged again — `computeAndCache` (properties.logic.ts:173) passes each `doc.warnings` entry to `console.warn`, before the error check, the same order and sink as yaml@2.9.1's `parse` in a browser; properties.logic.test.ts:308 fails on main and passes on the branch.
- [met] A panel edit on a note whose frontmatter fails to parse cannot drop the note's existing keys (a test, or a comment naming the existing guard) — every PropertiesView write (`updateProperty`, `upsertProperty`, `renameProperty`, `removePropertyByKey`, `addNewProperty`) goes through `commitChanges`, which now refuses on `isFrontmatterUnparseable` (properties.service.ts:81-85); properties.service.test.ts:366-388 fail against main's service and pass on the branch; the comment-only block still accepts a first property (:390).

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run` on properties.logic.test.ts, properties.service.test.ts, frontmatter-parity.test.ts: 300/300 pass.
- Every test file that references `properties.logic` / `properties.service` plus `src/tests/lib/features/properties`: 22 files, 1057 tests, all pass.
- Same logic and service tests against main's source files (swapped in, then restored with `git checkout`): 6 logic and 3 service tests fail, confirming they reproduce the bug.
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_frontmatter_parity_test`: 9 passed (Rust reads the four new fixture cases as their `expected` values).
- Probe (temporary vitest file, deleted) against the shipped module for edge cases; results below.
- Full suite (`pnpm vitest run && pnpm build`) and full `cargo test`: not run, deliver's to run. The full cargo test is required there because the shared fixture changed.
- Layer baseline, BASELINE_SIZE and composition roots: untouched.

## Findings

1. minor — src/lib/features/properties/properties.logic.ts:68 — `target.clone()` keeps anchors on the copy's nested nodes, so a copied chain can re-define an anchor later in the document. Probe: `a: &l [&y X]\nd: &y Z\nb: *l\nc: *y` now gives `c: "X"`; `yaml.parse` (and YAML semantics, latest anchor wins) gives `c: "Z"`. Only reachable with a re-used anchor name inside an aliased chain, so not a blocker. Fix: clear every anchor inside the copy (`visit(copy, { Node(_, n) { if ('anchor' in n) n.anchor = undefined } })` or equivalent) and pin the input in properties.logic.test.ts.
2. minor — src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:736-742, :786-792 and widgets/meta-bind-button-widget.ts:91-95 — the meta-bind inline select, the number/date/toggle inputs and the `updateMetadata` button rebuild the frontmatter from `parseFrontmatterProperties` with no parse guard, so the data loss this Issue closes for the panel still happens there for unparseable frontmatter (pre-existing, outside "a panel edit"). Fix: file a follow-up Issue to reuse `isFrontmatterUnparseable` (or `detectLossyFrontmatter`) in those three writers.
3. nit — src/lib/features/properties/properties.logic.ts:39-43 — replacing aliases with copies bypasses yaml's `maxAliasCount` (100) for scalar chains: `z: &x X` plus 120 `kN: *x` threw "Excessive alias count" on main (props `[]`) and now parses. Benign (chains hold no alias, so no exponential growth; Rust resolves without that limit), but it is a behaviour change the ADR amendment does not mention. Fix: optional half-sentence in the ADR 0029 Issue 41 amendment; no code change needed.
4. nit — src/tests/lib/features/properties/properties.logic.test.ts:308 — the warning test does not call `_resetParseFrontmatterCache()` the way its sibling log tests do (:331, :343); a cache hit on the same raw block from another test would skip the `console.warn` and fail it. Fix: reset the cache at the start of the test.
5. nit — commit 3915051e does not typecheck alone (the `clone()` cast arrives in cc238bb7). The squash at deliver makes this moot; no action.

## Resolution

1. Fixed. `foldUnquotedWikilinks` clears every anchor inside the alias copy (`properties.logic.ts`). The probe `a: &l [&y X]\nd: &y Z\nb: *l\nc: *y` is pinned in `properties.logic.test.ts` (failed with c = "X" before the fix, passes with c = "Z").
2. Filed as follow-up `.scratch/architecture-stability/issues/42-meta-bind-writers-parse-guard.md` (needs-triage); no code change here, it is outside a panel edit.
3. Recorded: the ADR 0029 Issue 41 amendment now says copies bypass `maxAliasCount` for scalar chains, and that anchors inside a copy are cleared.
4. Fixed: the warning test calls `_resetParseFrontmatterCache()` first.
5. No action: the deliver squash makes the intermediate commit moot.
