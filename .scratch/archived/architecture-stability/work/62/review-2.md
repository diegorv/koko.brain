VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `event-listen.test.ts:22` `EVENT_MODULE` is `['"]@tauri-apps\/api\/event['"]`, and `STATIC_NAMED` (:31) matches `(?:import\|export)\s*\{`. New shape cases at :102-103 (double-quoted import, `export { listen }` re-export) assert `true`. `import type { UnlistenFn }` still does not match `(?:import\|export)\s*\{` because of the `type` keyword, so the five real `import type` files stay allowed (the real-tree test passes). |
| 2 | minor | resolved | `event-listen.test.ts:70` filter is `/\.(ts\|js\|svelte)$/`; the real-tree scan still passes, so no `.js` file under `src/lib` or `src/routes` is flagged. |
| 3 | minor | resolved | `events-parity.test.ts:59` `BINDING_DECL` covers `const`, `static [mut]`, `let [mut]` and `as NAME`; fixtures at :155-158 assert each is reported. The claim about `CONST_PATH` holds: a path like `other::NAME` can only resolve to a module item (`const`, `static`, or a `use ... as` rename), and the shadow check now catches all of those in every non-registry file. Probe: `use foo::{BAR as VAULT_INDEX_UPDATED_EVENT};` is caught too. Residual gaps are under New findings 1. |
| 4 | nit | resolved | `EMIT_CALL` (:46) adds `\b(Emitter::)`, and `eventArgument` (:80-86) skips one more comma when UFCS is used. Accept cases at :140-141 and reject cases at :175-176. Probe: `tauri::Emitter::emit(&app, "x", p)` matches as well. Method-form behavior is unchanged: group 2 is now the method, and the call site passes `m[2]`. |
| 5 | nit | resolved | `CONST_LINE` (:62) is line-anchored, and :120 uses it for the count. The fixture at :161-164 shows that `//!` and `///` mentions are not counted. A `pub const fn` in `events.rs` would still be counted and fail the test, which is fail-closed and acceptable. |

## Acceptance criteria

- [met] A failing test first: a fixture Rust source with `pub(crate) const FOO_EVENT: &str = "foo";` and `app.emit(FOO_EVENT, p)` fails the parity check, and so does a suffix-less const used at an emit site — the fix commit leaves the "rejects a const declared outside events.rs, whatever its visibility or name" case at `events-parity.test.ts:144-151` unchanged, and it passes (it asserts `commands/foo.rs:3` for both fixtures).
- [met] Every emit site in `src-tauri/src` today passes, and the existing literal-name cases still fail — "names a registry const at every emit site" (:125-127) passes on the real tree with the wider `EMIT_CALL` and `BINDING_DECL`. No real `let`/`static`/`as` binding reuses a registry name. All eight earlier literal-name cases (:167-174) are still present and pass, and two UFCS cases were added.
- [met] A test fails when a file outside `src/lib/contracts/ipc.ts` imports `listen` from `@tauri-apps/api/event` — `event-listen.test.ts` still has its real-tree and stale-allowlist checks. The fix only adds coverage (either quote style, re-exports, `.js` files) and removes no case.

## Findings

1. nit — `src/tests/lib/contracts/events-parity.test.ts:59` — the shadow check still misses pattern bindings. Probes: `fn f(VAULT_INDEX_UPDATED_EVENT: &str)` and `let (a, VAULT_INDEX_UPDATED_EVENT) = ...` both return `[]`. rustc's `non_snake_case` lint would warn on either, and neither is in the tree. Fix if wanted: also match `[(,]\s*NAME\s*[:,)]` for registry names, or accept the gap.
2. nit — `src/tests/lib/contracts/events-parity.test.ts:46` — the fully qualified form `<AppHandle as Emitter>::emit(&app, "x", p)` does not match `EMIT_CALL` (probe returned no match), because `>::emit(` has neither a `.` nor `Emitter::` right before it. Not in the tree. Fix if wanted: also accept `>::` as a UFCS prefix.
3. nit — `src/tests/lib/architecture/event-listen.test.ts:31` — `export * from '@tauri-apps/api/event'` is not caught (probe: `false`), and it would re-export `listen` through a barrel. Not in the tree. Fix if wanted: match `export\s*\*\s*(?:as\s+\w+\s*)?from\s*` + `EVENT_MODULE` alongside `STATIC_NAMESPACE`.

No regressions found: no test was deleted or weakened, and the scope is only the two test files plus the review file's Resolution section. There is no app, `src-tauri/`, layer-baseline or composition-root change, and tabs are used throughout.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/contracts/events-parity.test.ts src/tests/lib/architecture/event-listen.test.ts`: exit 0, 2 files, 11 tests passed.
- Probes: I ran the new regexes in node against the edge cases in findings 1-3.
- Not run: the full `pnpm vitest run` and `pnpm build`, which deliver runs. Cargo was not run because nothing under `src-tauri/` changed.
