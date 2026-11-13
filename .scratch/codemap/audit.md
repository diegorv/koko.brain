# Code map audit: generator bugs

Source: the verified findings of the map audit of `/tmp/codemap-audit` (generated from this worktree at `1915818b0`), plus three items from the implementation reviews. Each bug below was checked against the generator code. Wherever a `q` command is cited, it was run on the working tree with `node scripts/codemap.mjs q …` and its output matched the finding. Every finding was reproduced, so none is marked "not reproduced".

Priorities:
- **P1:** an agent following the map is misled or misses the right code.
- **P2:** the map is incomplete but not misleading, or a risk to the build.
- **P3:** cosmetic.

Count: 15 bugs (P1 9, P2 5, P3 1). Review item (c) is counted as one of the P2 bugs.

| # | P | Bug | Findings explained |
|---|---|-----|--------------------|
| B1 | P1 | Rust `alias::submodule::fn(` through `use crate::<mod>;` is not resolved | semantic_repo, history_repo, fts_repo |
| B2 | P1 | Rust uses must look like calls: values, consts, statics, types and generic args fall back to `import` ("no use found") | todoist_repo read_kv/read_links/read_sections, extract_title, get_entry_mtimes, parsing HEADING_RE/ID_RE, SYNC_LOG_LIMIT, event consts, COMPOSER_WINDOW_LABEL, LastCaptureSignature, entry NoteRecord, task_lines TaskLineEdits/TaskLinesWriteResult |
| B3 | P1 | `kokobrain_lib::` resolved only in `src-tauri/tests`; `src-tauri/examples` is not an input | lib.rs `run`, main.rs out2, search/eval_metrics.rs |
| B4 | P1 | `by` keeps one row per user file and silently drops further sites in other enclosings | the 17 by-line findings (applyPathChange, setInvokeTracking, …), and about 60 verifier-refuted "missing by" findings |
| B5 | P1 | A top-level const set by a timer wrapper (`debounce(fn)`) is not an F4 target | editor.service debouncedSave / debouncedSaveFrontmatter |
| B6 | P1 | A nested arrow is named as the enclosing scope, which is not a symbol, so impact chains break | properties.logic insertAfterOpen, frontmatter-write attempt, event-calendar move/dayLabel |
| B7 | P1 | `this.m()` and `SameClass.m()` are not F4 uses | kb-api ensureCache/renderValue/runView/resolveScriptPath, kb-ui loadChartJS |
| B8 | P1 | F11 `registered-at` reads only argument 0, so `(name, fn)` sinks resolve to the registering function | review item (b) |
| B9 | P2 | Module in2/out2 is two hops over the merged module graph, which creates phantom paths through the crate root | db in2, quick_capture in2/out2, vault in2 |
| B10 | P2 | Re-export specifiers (`export {a as b} from`) produce no symbol | src/lib/types pub 0/0, vault-v2.types.ts no sym, `q sym NoteEntryV2` |
| B11 | P2 | F6 ignores type-only test imports and test fixture harnesses | vault-v2.types.ts t0, NoteRowMenu.svelte t0, NoteRow.svelte t0 |
| B12 | P2 | `new Class()` is kind `ref` and is dropped from the caller's `calls` | kb-api `new KBDateTime`, `new DataArray` |
| B13 | P2 | Browser storage is neither an F15 sink nor a listed blind spot | vault.store, command-palette.store, quick-switcher.store (3 findings) |
| B14 | P2 | `wiring.md` has about 780 bytes of headroom before the size test fails | review item (c) |
| B15 | P3 | Small rendering gaps: TS union ` \| ` prints as ` / `, and an inline `import()` type prints `type:*` | editor.logic, open-note-at, tags.service updateTagSort (review item (a)), settings.types:398, type-sidebar.logic:30 |

---

## B1 (P1) Rust module alias to a submodule

**Root cause.** In `scripts/codemap/rust.mjs` `analyzeRust`, the module-alias loop (about lines 818-826) maps `alias` to one file. For `use crate::db;` that file is `db/mod.rs`. The loop then matches `alias::(\w+)` and looks the name up with `named.get(file)?.get(m[1])`. In `db::semantic_repo::insert_chunk(`, the captured name `semantic_repo` is a submodule and not an item of `mod.rs`, so the match is skipped. The inline-path pass (`inlinePaths`) does not catch it either, because its heads are `crate`, plus `kokobrain_lib` in tests and the top modules in the crate root files only. The result is no file edge, no `lexical` call row and no `by` line.

**Findings.** semantic_repo.rs in0 with no `by` for its 18 pub fns. history_repo.rs (6 fns). fts_repo.rs (clear_index, insert_entry, search_match, delete_entry, rename_entries, get_entry_mtimes, count_entries). There are 53 `db::<x>_repo::` sites in `commands/{history,todoist,semantic,search_index}.rs`. Reproduced: `q callers src-tauri/src/db/semantic_repo.rs:insert_chunk` gives total 0.

**Fixture.**
```rust
// src-tauri/src/db/mod.rs
pub mod repo;
// src-tauri/src/db/repo.rs
pub fn insert() {}
// src-tauri/src/commands/x.rs
use crate::db;
pub fn run() { db::repo::insert(); }
```
Expected: an edge `commands/x.rs:2 -> db/repo.rs insert`, a call `x.rs:2 in run -> db/repo.rs:insert lexical`, and `by db/repo.rs:insert <- x.rs:2 in run lexical`. Today none of the three is produced.

**Fix.** Keep the alias's absolute segments (the `abs` already computed in the `use` loop), not only its file. Match `alias(\s*::\s*ident)+` and resolve `resolveModulePath([...aliasSegs, ...rest], exists)`. Then run the same body as the inline-path block: `addEdge`, `row(…, 'lexical')`, and `Type::method(` when the rest has two segments. Keep the current direct-item case as the zero-depth special case.

## B2 (P1) Rust uses must be call-shaped

**Root cause.** `rust.mjs` `analyzeRust`, in the item regex (about line 811) and the alias regex (about line 819): both require the lookahead `(?=\s*(?:\(|::))`. A use as a value falls back to a `leafUsers` entry of kind `import` at the `use` line. Value uses include a fn passed as an argument, a const or static used as `X.method(`, `, X)` or `X,`, a type in a signature or struct literal, and a generic argument such as `state::<T>()`. The spec legend (line 188) defines `import` as "no use found", so the card says these items are unused.

**Findings.** todoist_repo `read_kv`, `read_links` and `read_sections`, passed to `db::with_vault_db` at commands/todoist.rs:29, 35 and 41, have no `by`. `q callers …todoist_repo.rs:read_kv` gives total 0. The same applies to `extract_title` (search_index.rs:287) and `get_entry_mtimes` (search_index.rs:71). parsing.rs HEADING_RE and ID_RE show `import` although they are used at task_lines.rs:300 and :390. Also affected: SYNC_LOG_LIMIT (todoist.rs:74), the events consts passed to `emit(CONST, …)`, COMPOSER_WINDOW_LABEL (lib.rs:138) and `LastCaptureSignature` as a generic argument (lib.rs:62). entry.rs NoteRecord and the task_lines.rs TaskLineEdits and TaskLinesWriteResult show `import` although commands/vault.rs uses them at :1000, :1039, :1058 and :804-864. `q callers …entry.rs:NoteRecord` and `q callers …parsing.rs:HEADING_RE` give total 0.

**Fixture.**
```rust
// src-tauri/src/a.rs
pub const K: u8 = 1; pub struct T; pub fn f() {}
// src-tauri/src/b.rs
use crate::a::{f, K, T};
pub fn g(_x: T) -> u8 { h(f); K }
fn h(_: fn()) {}
```
Expected: `by a.rs:f <- b.rs:2 in g ref`, and the same for K and T. Today all three are `import` at b.rs:1.

**Fix.** After the call-shaped scans, run one more scan for each imported item local name, and for `alias::name`, as a whole word with no lookahead. It skips offsets already rowed and emits a new Rust kind `ref`. Add `ref` to the F16 kinds in the spec, and change the `import` legend to "imported, no use matched". Accepted false positive: a `let` binding that shadows an imported name. That is rare in Rust and only adds a use. Type-position refs could stay out of the `calls` section if card size matters.

## B3 (P1) Crate-external consumers: main.rs and examples

**Root cause.**
- `rust.mjs` `absoluteSegs` (about line 645) returns `null` for `kokobrain_lib::…` unless the file is under `src-tauri/tests`.
- `inlinePaths` adds the `kokobrain_lib` head only for tests.
- `scripts/codemap/model.mjs` `INPUT_ROOTS` and `isInput` do not include `src-tauri/examples`.

So `kokobrain_lib::run()` in main.rs makes no edge, and `examples/retrieval_eval.rs` is not read at all.

**Findings.**
- lib.rs `run` has no `by`. `q callers src-tauri/src/lib.rs:run` gives 0.
- The main.rs card has `out2 0 files` and no `imp` or `call`.
- search/eval_metrics.rs shows in0 and t0 and looks dead, although examples/retrieval_eval.rs:51-53 imports 7 of its items. `q importers` gives 0.

**Fixture.** `src-tauri/src/main.rs` with `fn main() { kokobrain_lib::run() }`, and `src-tauri/src/lib.rs` with `pub fn run() {}`. Expected: the edge `main.rs:N -> lib.rs run` and `by lib.rs:run <- main.rs:N in main lexical`. A second fixture, `src-tauri/examples/e.rs` with `use kokobrain_lib::m::f; fn main() { f(); }`, should give an importer of `m.rs`.

**Fix.** Treat `kokobrain_lib` like `crate` in `src-tauri/src/main.rs`: one condition in `absoluteSegs` and one head in `inlinePaths`. Add `src-tauri/examples` to `INPUT_ROOTS` and `isInput`, and resolve `kokobrain_lib::` there the way tests do. **Owner decision:** whether an example counts as a production importer (its own module, in `inN`) or as a test-like consumer. A test-like consumer would turn eval_metrics t0 into t1 and overstate test coverage. A third option is a separate `ex<n>` count. The main.rs part needs no decision.

## B4 (P1) `by` drops further sites in other enclosings

**Root cause.** `scripts/codemap/ts.mjs` `usersBySymbol` (lines 1110-1112) and the same code in `rust.mjs` `analyzeRust` (about line 879): `else if (first.enclosing === u.enclosing) first.more++`. A further site in a different function of the same user file is dropped, with no `+n` and no hint. The spec defines `by` as one row per user file at the first site (lines 188, 224 and 660). But neither the card nor the INDEX cols line says so, and `+<n>` reads as "all further sites".

**Findings.** The defining-card `by` findings:
- path-change.service applyPathChange: fs.service.ts:248 is shown. :285 renameItem and :313 moveItem are not.
- setInvokeTracking: debug.ts:149 is missing.
- toastFrontmatterWriteError and updateNoteFrontmatter: lifecycle.service :55/:73 and :52/:70.
- Also normalizeTypeCasing, updatePropertyValue, extractBody, rebuildContent, detectLossyFrontmatter, isVirtualTab (+layout.svelte:154), getPositionAfterFrontmatter (MarkdownEditor.svelte:495), pinTabByPath and parseFrontmatterProperties.

The verifiers refuted about 60 findings as "by design" (semantic chunker, model, canvas, event-calendar, trash.logic, perfBaseline, properties.service, tags, tasks, type-definitions, periodic-notes and others). All of them have the same cause: the design is the bug. The full list exists on the caller card as `call` lines and in `q callers`.

**Fixture.**
```ts
// a.ts
export function f() {}
// b.ts
import { f } from './a';
export function x() { f(); }
export function y() { f(); f(); }
```
Today: `by a.ts:f <- b.ts:3 in x call`, and nothing marks the 2 sites in y. Expected: `+2`, or a row for y.

**Fix (smallest).** `+n` counts every further site in the file (`else first.more++`) in both files. Change the spec lines 188 and 224 and the INDEX cols text to "`+<n>`: further sites in this file, any function; the user's card has every call line". A larger alternative is one `by` row per (file, enclosing). It is more exact, but it grows the cards and needs a check against the card budget.

## B5 (P1) Timer-wrapper consts are not call targets

**Root cause.** `ts.mjs` `extractUses` (line 1004 onward) builds `own` from fn and method symbols and from `locals` (non-exported top-level functions and const-bound arrows) only. `const debouncedSave = debounce(saveDirtyTabs, …)` matches neither, so `debouncedSave()` and `.cancel()` are not uses. The initializer's `ref` of saveDirtyTabs is recorded with enclosing `debouncedSave` (F4e rule 7), but nothing points at `debouncedSave`.

**Findings.** editor.service.ts:276 and :279. `q flow …editor.service.ts:scheduleAutoSave …:saveDirtyTabs` prints `no flow within depth 12` (reproduced). This is the autosave path. There are 5 `= debounce(` consts in src/lib and src/routes.

**Fixture.**
```ts
import { debounce } from '#lib/utils/debounce.js';
function save() {}
const d = debounce(save, 10);
export function schedule() { d(); d.cancel(); }
```
Expected: `call f.ts:4 in schedule -> f.ts:d call`, a `mcall` for `d.cancel`, and `q flow f.ts:schedule f.ts:save` finds `schedule -> d -> save`.

**Fix.** Compute the F15 wrapper set before `extractUses`. Today it is derived in `tsEffects`, but it needs only file facts. Then add each top-level `const X = <wrapper>(…)` to `own` (and to `locals`, kind `fn`, sig from the wrapper call). The existing rule-7 `ref` edge from `X` to the wrapped function then completes the flow. Change the F4 target sentence in the spec to match.

## B6 (P1) Nested arrow named as enclosing

**Root cause.** In `ts.mjs` `enclosingOf` (line 637), `if (isFnExpr(a) && ts.isVariableDeclaration(a.parent) …) return a.parent.name.text` has no top-level check. A `const inner = () => …` nested in a function becomes the enclosing scope. That name is not a symbol or local, and calls of `inner()` are not uses (B5's `own` holds top-level names only), so the symbol graph has a node that nothing reaches.

**Findings.**
- properties.logic.ts:523 `in insertAfterOpen`, inside ensureFrontmatterLink:519. `q impact …:serializeProperties` lists `in insertAfterOpen` at depth 1 and does not continue to ensureFrontmatterLink (reproduced).
- frontmatter-write.service.ts:128 `attempt`.
- The event-calendar `move` and `dayLabel` enclosings, which a verifier noted.
- The same applies to sync-now.service `record` (inside syncNow).

**Fixture.**
```ts
export function outer() { const inner = () => leaf(); return inner(); }
function leaf() {}
```
Today: `call … in inner -> leaf`. Expected: `in outer`, and `q impact leaf` reaches `outer`.

**Fix.** Apply the variable rule only when `isTopLevel(a.parent)` (line 285), or when the variable is at the top of a Svelte instance script. Otherwise keep walking outward, as rule 8 does for anonymous callbacks. Update F4e rule 4 in the spec.

## B7 (P1) Same-class method calls not tracked

**Root cause.** In `ts.mjs` `extractUses`, the targets are import bindings, `own` (top-level fns and locals) and `facts.objects` (methods of a top-level object-literal const called as `Obj.m(`). Class members are never targets, so `this.m(` and `ClassName.m(` inside the same file are invisible. The spec's calls section says "Same-file pairs included, so the file's local call graph is on its card", so the gap is not presented as a blind spot. Rust has the equivalent in F20 (`self.`/`Self::`).

**Findings.** kb-api.ts :120, :141, :146 `this.ensureCache`, :289 `this.renderValue`, :383 `this.runView` and :404 `this.resolveScriptPath`, and kb-ui.ts:584 `KBUI.loadChartJS()`. `q callers src/lib/plugins/queryjs/kb-api.ts:KBAPI.ensureCache` gives total 0 (reproduced).

**Fixture.**
```ts
export class C {
	a() { return this.b(); }
	b() {}
	static s() {}
	c() { C.s(); }
}
```
Expected: `call f.ts:2 in C.a -> f.ts:C.b call` and `call f.ts:5 in C.c -> f.ts:C.s call`.

**Fix.** Collect method names per top-level class, next to `facts.objects`. In the walk, emit `call` with symbol `<file>:<Class>` and member `m` for two cases:
- `this.m(` whose nearest class member belongs to a class that has `m`, and no non-arrow function between them rebinds `this`.
- `C.m(` where `C` is a same-file class that has `m`.

The `Class.method` IDs already exist as enclosing names, so `ctx.ids` and the symbol graph need only the new rows.

## B8 (P1) Registered-at callback from argument 0 only (review item (b), verified)

**Root cause.** In `ts.mjs` `collectRegistries`, `registeredAt` reads `const arg = node.call.arguments[0]` and calls `callbacksOf(u, arg)`. For a `(name, fn)` sink, argument 0 is the name string, so `callbacksOf` falls back to `<file>:<enclosing>`, and `args=` shows only the name.

**Findings (verified in /tmp/codemap-audit/wiring.md):**
- registerContentInvalidationListener (note-change.service.ts:144): `boot.ts:39`, `boot.ts:41` and `queryjs-ports.ts:15` resolve to `-> boot.ts:registerAppPorts` and `-> queryjs-ports.ts:registerQueryjsBlockPorts`, although boot.ts:41 passes `clearLinkedContentCache`.
- registerWriteBarrier (write-barrier.service.ts:23): `boot.ts:42` resolves to `registerAppPorts` instead of `drainEventCalendarWrites`.
- registerTabCloseListener (editor.service.ts:28): `queryjs-ports.ts:16` resolves to `registerQueryjsBlockPorts`.
- registerDeepLinkAction (deep-link.service.ts:56): `deep-link-actions.ts:234` and `:235` resolve to `registerDeepLinkActions`.

The F14 `fires` edges inherit the wrong callback. Run as a check, `q flow …note-change.service.ts:applyNoteChange …kanban.service.ts:clearLinkedContentCache` returns a 4-hop path through a `state` edge into `boot.ts:registerAppPorts`, then a `ref`, not the fire to the listener.

**Fixture.**
```ts
// reg.ts
const ls: (() => void)[] = [];
export function register(name: string, fn: () => void) { ls.push(fn); return () => {}; }
export function fire() { for (const l of ls) l(); }
// use.ts
import { register } from './reg';
function cb() {}
export function boot() { register('x', cb); }
```
Expected: `registered-at use.ts:3 in boot args='x', cb -> use.ts:cb`. Today it is `-> use.ts:boot`.

**Fix.** Choose the first argument that `callbacksOf` can resolve: an identifier that resolves to a fn, or an object literal with fn properties. Only when no argument resolves, fall back to the enclosing scope. Make `args=` the excerpt of all arguments (cap 80, as now). Inline arrows still fall back to the enclosing scope, as they do today at argument 0.

## B9 (P2) Module 2-hop through a merged module

**Root cause.** In `model.mjs`, `moduleIn2` and `moduleOut2` (lines 393-394) run `twoHop` over `moduleEdges` (lines 317-330, one node per module). The crate root module `src-tauri/src` holds both the hub `lib.rs` and leaf files (`events.rs`, `error_monitoring.rs`). So `quick_capture -> root (events.rs) -> db (via lib.rs)` is a module path with no file path behind it. The same can happen in any TS module that mixes a hub with leaf files, but the crate root is the clear case.

**Findings.**
- modules/src-tauri/src/db.md `in2 … quick_capture(1)`.
- quick_capture.md `in2 … commands(1)` and `out2 … commands db vault`. The out2 line names dependencies that do not exist.
- vault.md `in2 … quick_capture(1)`.

All four are reproduced from the card lines in /tmp/codemap-audit. It is an over-approximation, so the safe direction for impact, but the `out2` line is factually wrong.

**Fixture.** Root `lib.rs` uses `crate::db`, root `events.rs` is a leaf, `qc/a.rs` uses `crate::events`, and `db/mod.rs` exists. Expected: `moduleIn2(db)` does not contain `qc`.

**Fix.** Derive module reach from file chains. `moduleIn2(m)` is the modules of `prodImporters(prodImporters(f))` for the files `f` in `m`, minus `m` and its direct importer modules. `moduleOut2` is the same with `prodTargets`. The `(<via>)` counts become distinct file pairs.

## B10 (P2) Re-export names have no symbol

**Root cause.** F2 in `ts.mjs` `extractTsFile` emits symbols for declarations only. `export {a as b} from` and `export type {…} from` go into the F3 export table (`exports.names`, used by `resolveReexports`, line 879), but they never become `sym` lines or `q sym` names. The module `pub <public>/<exports>` count in `render.mjs` (about line 783) inherits the gap.

**Findings.**
- `src/lib/types` shows `pub 0/0`.
- vault-v2.types.ts has no `sym` lines. It re-exports 17 names that 32 production files import.
- `q sym NoteEntryV2` gives "no match" (reproduced).
- The refuted file-history.types.ts finding has the same shape.

**Fixture.** `t.ts` with `export type { X as Y } from './x';`, and `x.ts` with `export type X = 1;`. Expected: `q sym Y` finds `t.ts:Y`, aliasing `x.ts:X`.

**Fix.** Emit one `sym <file>:<line> reexport <name> = <target id>` line per named export-table entry with a `spec`, count it in the file's exports, and index it for `q sym`. The `by` lines stay on the origin symbol. A smaller alternative changes `q sym` only, so that it resolves a name through the export tables.

## B11 (P2) F6 misses type-only and harness-mediated tests

**Root cause.** In `ts.mjs` `testRelations` (lines 1393-1428), `if (imp.spec !== null && !imp.typeOnly)` drops `import type` and inline `import()` types (`import-graph.mjs:117` marks them `typeOnly`). `mirror` also requires an `imports` row. Separately, `model.mjs` `isInput` accepts only `.ts` under `src/tests/`, so the 7 harness components in `src/tests/fixtures/*.svelte` are not in the inventory, and a test that renders through a harness reaches nothing.

**Findings.**
- vault-v2.types.ts shows `t0` with no `## tests` section, although a mirror test exists (`q tests` gives 0, reproduced).
- NoteRowMenu.svelte and NoteRow.svelte show `t0`, although 3 test files reach them through NoteRowMenuHarness.svelte (`q tests …NoteRowMenu.svelte` gives 0, reproduced).
- Same cause as the refuted events.ts / ipc.test.ts finding.

**Fixtures.**
- `src/tests/lib/types/a.types.test.ts` with `import type { A } from '#lib/types/a.types.js'`. Expected: a `test` row with relation `types`, and mirror set.
- `src/tests/fixtures/H.svelte` importing `src/lib/x/C.svelte`, and `src/tests/lib/x/C.test.ts` importing `H.svelte`. Expected: C.svelte gets `t1` through the harness.

**Fix.** Record type-only imports as relation `types`, either counted in `t<n>` or shown as a separate count (owner choice), and allow `mirror` on it. Add `src/tests/**/*.svelte` to `isInput` as test files, then follow one hop from a test through a harness. Smallest alternative: two INDEX blind-spot lines.

## B12 (P2) `new Class()` dropped from the caller card

**Root cause.** In `ts.mjs` `useKinds` (line 921), a `NewExpression` callee is not a `CallExpression`, so it is kind `ref`. `render.mjs` `tsCallRows` (lines 582-592) keeps a `ref` only when the target is in `ctx.fns`, which excludes classes.

**Findings.** `kb-api.ts:161 new KBDateTime(input)` and the `new DataArray<…>([])` in getDaysInRange. `q callers …kb-datetime.ts:KBDateTime` lists `kb-api.ts:161 in KBAPI.date … ref`, but `q calls …kb-api.ts:KBAPI.date` gives total 0 (both reproduced).

**Fixture.** `a.ts` with `export class K {}`, and `b.ts` with `import { K } from './a'; export function f() { return new K(); }`. Expected: the b.ts card has `call b.ts:1 in f -> a.ts:K new`.

**Fix.** Return kind `new` from `useKinds` when `ts.isNewExpression(p) && p.expression === id`. Keep it in `tsCallRows`, map it to `call` in the symbol graph, and add `new` to the kind list in spec line 188.

## B13 (P2) Browser storage is untracked and undocumented

**Root cause.** The F15 sink set in `ts.mjs` `tsEffects` (lines 1820-1846) covers Tauri calls, timers, timer wrappers, `$effect` and DOM listeners. No code mentions `localStorage` or `sessionStorage`, and the INDEX Blind spots list (spec section 8, INDEX lines 40-53) does not name it.

**Findings.** vault.store.svelte.ts:47 and :56, command-palette.store.svelte.ts:9, :18 and :52, and quick-switcher.store.svelte.ts:9, :18 and :51. A grep finds 8 files under src/lib and src/routes that mention these APIs (the count includes comments).

**Fixture.** `s.ts` with `export function save() { localStorage.setItem('k', 'v'); }`. Expected: `fx s.ts:1 storage.setItem in save`.

**Fix.** Either add an F15 class `storage` (`localStorage|sessionStorage` `.getItem|setItem|removeItem|clear`, also through `window.`) with an `effects/storage.md` shard and an entry in `EFFECT_CLASSES`, or add one INDEX blind-spot line. The class costs about 30 lines and one test.

## B14 (P2) wiring.md near its cap (review item (c), verified)

**Facts.**
- `/tmp/codemap-audit/wiring.md` is 45,914 bytes and 218 lines, an average of about 210 bytes per line.
- `BUDGET.maxBytes` (`render.mjs:223`) is 49,152, so the file is at 93.4%.
- `src/tests/lib/architecture/codemap.test.ts:3788` allows wiring.md 95%, which is 46,694 bytes. That leaves 780 bytes of headroom, about 3-4 lines.
- `checkBudgets` (`render.mjs` about line 1026) throws at 49,152, 3.2 KB away.
- `WIRING_CAP = 10` (`render.mjs:289`) caps lines per registry, not the file. The file grows with each registry: there are 25 sinks and 2 facets, and the line mix is fired-by 71, registered-at 46, invoked-at 39, read-by 31 and sink 25.
- B8's fix does not change the line count. A new sink with readers, or B7 adding fire chains, would fail the test.

**Fixture.** None needed. The existing headroom test is the reproduction once one registry is added.

**Fix.** Shard the file by the sink's layer or module, as `effects/<class>.md` already does: `wiring/<layer>.md`, with INDEX pointing to it and the `grep -F 'reg <id> '` hint becoming `grep -rF`. That returns wiring to the 15% headroom rule. A stopgap is a separate `FIRED_BY_CAP = 5`, which loses fire chains that `q reg` still prints.

## B15 (P3) Rendering gaps: union slash and `type:*`

**(a) Union in signatures (review item (a), verified).** `render.mjs` `field()` (line 91) replaces ` | ` with ` / `. `excerpt()` (line 321) applies it to `sym` and `local` signatures (lines 474 and 477). This is deliberate, because ` | ` separates the doc on a `sym` line. But the spec (around line 279) documents it only for a doc in the ipc files, and INDEX says nothing. Examples: tags.service.ts.md:26 `updateTagSort(mode: 'name' / 'count')` (source line 63), editor.logic `Pick<EditorTab, 'path' / 'fileType'>`, open-note-at `string / null`.
- Fixture: `export function f(x: 'a' | 'b') {}` renders `f(x: 'a' / 'b')`.
- Fix: one INDEX legend line: "` / ` inside a signature or doc stands for ` | `".

**(b) Inline import type.** `scripts/import-graph.mjs:117` records an `ImportTypeNode` without its qualifier, and `model.mjs` `edgeNames` (line 183) prints every such edge as `type:*`. In the rest of the grammar, `*` means a namespace or star import. Examples: settings.types.ts:398 (`import('./theme.types').AppearanceSettings`) and type-sidebar.logic.ts:30 (`FrontmatterValue`). The edge and line are correct.
- Fixture: `type T = import('./x').Y;` renders `type:*`, and should render `type:Y`.
- Fix: carry `n.qualifier` (its leftmost name) into the import row, and emit `type:<Name>`. Keep `type:*` only when there is no qualifier.

---

## Verifier-refuted findings that these bugs explain

These findings were refuted as "by design" against the current spec, but the fixes above remove them:
- **B4:** every "missing `by` for a second caller in another fn of the same file" (about 60 across the chunker, canvas, event-calendar, trash, tags, tasks, types, periodic-notes and properties cards).
- **B6:** the event-calendar `move` and `dayLabel` nested-arrow enclosings, and the sync-now `record` enclosings.
- **B11:** events.ts / ipc.test.ts (type-only).
- **B10:** file-history.types.ts re-export with no `sym`.

The other refutations hold: stored callbacks, toast, other non-Tauri packages, `clearTimeout`, module-level `let` state, onMount, trait dispatch, the underscore rule for methods, and the `in2` definition misread as direct importers.

## Not checked

- I did not regenerate `/tmp/codemap-audit`. I assumed it matches HEAD `1915818b0`. The `q` answers come from the working tree and agree with the cards on every cited point.
- I did not count the nested-arrow enclosings (B6) or the `this.` sites (B7) across the whole tree.
- I did not measure the card-size effect of B2, B4 (per-enclosing variant) or B10.
- The spurious-looking `state` hop `collection.service.ts:removeNoteFromIndex -> boot.ts:registerAppPorts` in the B8 `q flow` output was not investigated. It may be a separate F14 `state` edge issue.

## Decisions (orchestrator, 2026-11-13)

- B3: files under `src-tauri/examples` are read. A `kokobrain_lib::` use from an example is an `example` consumer, rendered like a test line (`test <example file> example <file>`), never a production importer and never counted in `in<n>` or `t<n>`.
- B11: a test file whose imports of a source file are all type-only gets `test <test file> imports-type <file>`; it is not counted in `t<n>`. Fixture harnesses that load a source file by path are counted only when the path is a string literal that resolves to the file.
- B14: `wiring.md` is sharded by the layer of the file that defines the sink: `wiring/<layer>.md` (core, features, plugins, app, utils, other layers as needed). INDEX and `q reg` point at the shard. `WIRING_CAP` goes back to the spec value 20 if the shards stay under the caps.
- B15: signatures are copied verbatim, including ` | `. In `sym` lines the doc separator stays the first ` | ` after `L<span>`; the line grammar in INDEX says so. Test 32 changes accordingly.
