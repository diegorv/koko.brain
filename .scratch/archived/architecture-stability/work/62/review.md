VERDICT: APPROVED

## Acceptance criteria

- [met] A failing test first: a fixture Rust source with `pub(crate) const FOO_EVENT: &str = "foo";` and `app.emit(FOO_EVENT, p)` fails the parity check, and so does a suffix-less const used at an emit site — `events-parity.test.ts` "rejects a const declared outside events.rs, whatever its visibility or name" asserts `emitOffenders` reports `commands/foo.rs:3` for both the `pub(crate) const FOO_EVENT` fixture and the suffix-less `const SEMANTIC_INDEX_PROGRESS` fixture. I ran the old main-branch regexes (`pub\s+const\s+\w+_EVENT...` and `EMIT_LITERAL`) over the same fixture text in node: 0 declaration hits and 0 literal hits, so the old check passed these fixtures and the new cases are real regressions (red against the old rule).
- [met] Every emit site in `src-tauri/src` today passes, and the existing literal-name cases still fail — "names a registry const at every emit site" passes on the real tree. A grep for Emitter calls finds 15 sites (lib.rs:78,260,276; quick_capture/commands.rs:247,294,363; commands/watcher.rs:19; commands/semantic.rs:399; commands/vault.rs:319,406,719,863,907,1011,1351), all bare registry consts. "rejects literal event names in every emit shape" covers plain `emit`, `emit_str`, `emit_str_filter`, `r"x"`, turbofish, a comment before the literal, `emit_to` and `emit_str_to`; all pass, meaning each one is reported.
- [met] A test fails when a file outside `src/lib/contracts/ipc.ts` imports `listen` from `@tauri-apps/api/event` — the new `src/tests/lib/architecture/event-listen.test.ts` scans `src/lib` + `src/routes` (`.ts`/`.svelte`), allowlists only `ipc.ts` (with a stale-allowlist check), and its shape cases flag named, aliased-with-type, `once`, namespace, and dynamic imports. Today the only value import is `src/lib/contracts/ipc.ts:2`; the other four files are `import type { UnlistenFn }`, and the test allows those. Findings 1-2 list import shapes it misses; none of them is in the tree.

## Findings

1. minor — `src/tests/lib/architecture/event-listen.test.ts:21` — `EVENT_MODULE` matches only a single-quoted specifier, so `import { listen } from "@tauri-apps/api/event"` passes, and so does a re-export `export { listen } from '@tauri-apps/api/event'` (checked in node: 0 matches for each). Nothing in the repo enforces quote style: there is no prettier or eslint config, and `src/lib/utils.ts` already uses double quotes. `core-ipc.test.ts` has the same gap. Fix: use `['"]@tauri-apps\/api\/event['"]`, match `(?:import|export)\s*\{`, and add a shape case for each.
2. minor — `src/tests/lib/architecture/event-listen.test.ts:66` — only `.ts`/`.svelte` files are scanned, but `src/lib` also has `.js` modules (`utils/build-info.js`, `utils/node-shims/*.js`). A raw `listen` in a `.js` file would get past the test. Fix: scan `/\.(ts|js|svelte)$/`.
3. minor — `src/tests/lib/contracts/events-parity.test.ts:53` — the shadow check (`CONST_DECL`) only looks at `const`. My probes outside `events.rs` all pass `emitOffenders` with `[]`: `static VAULT_INDEX_UPDATED_EVENT: &str = "x"`, `let VAULT_INDEX_UPDATED_EVENT = "x"`, and `use foo::BAR as VAULT_INDEX_UPDATED_EVENT`, each followed by `app.emit(VAULT_INDEX_UPDATED_EVENT, p)`. `CONST_PATH` (:50) also accepts any path prefix, so `other::VAULT_INDEX_UPDATED_EVENT` passes when `other` defines a `static` with that name. These are unlikely and none is in the tree. Fix: widen the shadow regex to `\b(?:const|static|let(?:\s+mut)?)\s+(\w+)` plus `\bas\s+(\w+)`, and add fixtures.
4. nit — `src/tests/lib/contracts/events-parity.test.ts:44` — `EMIT_CALL` needs a leading `.`, so the UFCS form `Emitter::emit(&app, "x", p)` is not checked (probe returned `[]`). The Issue notes list this as a nit, discovery.md records it as a default, and the tree has no such call today. Fix if wanted: also match `Emitter::(method)(` and skip its first argument.
5. nit — `src/tests/lib/contracts/events-parity.test.ts:109` — `registrySrc.match(/\bconst\s/g)` also counts the word "const" in `//!` / `///` doc comments in `events.rs`. Adding a doc line such as "each const here ..." would fail the test with a count mismatch that points at the wrong cause. Today's wording ("consts,") does not trigger it. Fix: count only declarations, `/^\s*(?:pub(?:\([^)]*\))?\s+)?const\s/gm`.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/contracts/events-parity.test.ts src/tests/lib/architecture/event-listen.test.ts src/tests/lib/architecture/core-ipc.test.ts src/tests/lib/contracts/ipc.test.ts`: exit 0, 4 files, 27 tests passed. My test verdict rests on these four files: the two that the diff adds or changes, and the existing IPC guards next to them.
- Probes: I ran `emitOffenders` against edge-case inputs from a temporary copy of the test file, then deleted it; the worktree is clean. Results are in findings 3-4. Non-const arguments (`name()`, `&format!(..)`, a tuple target containing a comma, a commented-out emit) are all reported, so the check fails closed.
- Scope: the diff touches only `src/tests/lib/contracts/events-parity.test.ts`, `src/tests/lib/architecture/event-listen.test.ts` and `work/62/discovery.md`. That matches the Issue's Files line, with no app or `src-tauri/` change, no layer-baseline or composition-root change, and tab indentation throughout.
- Not run here: the full `pnpm vitest run`, `pnpm build`, and cargo test (no `src-tauri/` change). Deliver runs the gate.

## Resolution

All five findings accepted and fixed.

1. `event-listen.test.ts`: `EVENT_MODULE` matches either quote style and `STATIC_NAMED` matches `(?:import|export)\s*\{`; shape cases added for a double-quoted import and an `export { listen }` re-export.
2. `event-listen.test.ts`: the scan includes `.js` files.
3. `events-parity.test.ts`: the shadow check (`BINDING_DECL`) covers `const`, `static [mut]`, `let [mut]` and `use ... as NAME`; fixtures added for each. With every binding form checked, a path-qualified `other::NAME` can only resolve to a const caught by the same check, so `CONST_PATH` is unchanged.
4. `events-parity.test.ts`: `EMIT_CALL` also matches the UFCS form `Emitter::method(` and skips its emitter argument; accept and reject fixtures added for `Emitter::emit` and `Emitter::emit_to`.
5. `events-parity.test.ts`: the registry count uses `CONST_LINE` (line-anchored declarations), with a fixture showing doc-comment mentions are not counted.
