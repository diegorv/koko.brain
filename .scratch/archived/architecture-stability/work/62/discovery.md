# 62 discovery: emit sites must name a registry const; raw `listen` only in ipc.ts

No spec.md for this feature; the Issue is the spec. Test-only change: no app code moves.
Repeats work/11 (events-parity) and the Issue 10 `core-ipc.test.ts` import guard; differences below.

## Files that change
- `src/tests/lib/contracts/events-parity.test.ts`:
  - :38-50 registry parse reads only `events.rs`, any visibility (`pub`, `pub(crate)`, none) and `&str` or `&'static str`, any name (no `_EVENT` suffix needed). Values still equal `Object.values(EVENT_NAMES)`, MIN_EVENTS floor kept.
  - :28 + :52-57 literal check replaced by `emitOffenders(sources, registry)`: the event argument of every Emitter call (first arg of `emit`/`emit_str`/`emit_filter`/`emit_str_filter`, second of `emit_to`/`emit_str_to`, optional turbofish) must be an identifier, optionally path-qualified (`events::X`, `crate::events::X`), whose last segment is a registry const name. Anything else (literal, raw string, comment, local const) is an offender. Fail-closed: a target label with a comma also reports.
  - Also: no `const` outside `events.rs` may reuse a registry const name (a local shadow would pass the name check with another value).
  - Fixture cases inline in the same file: `pub(crate) const FOO_EVENT` + `app.emit(FOO_EVENT, p)`, a suffix-less const at an emit site, literal / `r"x"` / turbofish / `emit_to` literal, a shadowing const, and accepted cases (bare and qualified registry const, multi-line call as at `lib.rs:260`).
- New `src/tests/lib/architecture/event-listen.test.ts`: copy of `core-ipc.test.ts` shape over `src/lib` + `src/routes` (`.ts`/`.svelte`), module `@tauri-apps/api/event`, allowlist `src/lib/contracts/ipc.ts` only, with stale-allowlist check and shape cases (named, namespace, dynamic, type-only `UnlistenFn` allowed).

## Today
- Emit sites (all bare registry consts): lib.rs:78,260(multi-line),276; quick_capture/commands.rs:247,294,363; commands/semantic.rs:399; commands/watcher.rs:19; commands/vault.rs:319,406,719,863,907,1011,1351.
- `@tauri-apps/api/event` value import: only `src/lib/contracts/ipc.ts:2`; others are `import type { UnlistenFn }`.

## Plan (commits)
1. Discovery.
2. events-parity: fixture tests first (red against the old literal regex), then the const-set check (green on the tree).
3. event-listen architecture test.

## Defaults
- `once` from `@tauri-apps/api/event` is guarded with `listen` (same bypass of `on()`); `emit` from the TS event module is not in scope.
- UFCS `Emitter::emit(&app, ...)` is not parsed (none in tree; the Issue notes it as a nit). `getCurrentWindow().listen` window events stay out of scope (work/11 default).

## Risks
- An unrelated method named `.emit(` in Rust would be flagged; none today, and fail-closed is the safe side.
