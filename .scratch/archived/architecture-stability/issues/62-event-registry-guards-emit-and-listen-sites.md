# 62: The event registry checks miss consts outside the `pub const *_EVENT: &str` form, and nothing keeps `listen` behind `on()`

**What to build:** Issue 11 (squash 7af00157) put every event-name const in `src-tauri/src/events.rs` and mirrored them in `src/lib/contracts/events.ts`. `src/tests/lib/contracts/events-parity.test.ts` checks two things: that the `pub const *_EVENT: &str` values equal `Object.values(EVENT_NAMES)` and that no such const is declared outside `events.rs` (:40, :47), and that no Emitter call passes a string literal as the event name (:28). Two gaps remain:
- **Rust side:** a const in any other form skips both checks and never reaches `EVENT_NAMES`: `pub(crate) const FOO_EVENT`, a private `const FOO_EVENT`, type `&'static str`, or a name without the `_EVENT` suffix. Example: `pub(crate) const FOO_EVENT: &str = "foo";` in `commands/foo.rs` plus `app.emit(FOO_EVENT, p)` passes the test. This has already happened once: before Issue 11, `commands/semantic.rs:401` emitted `SEMANTIC_INDEX_PROGRESS`, which has no suffix. Fix: require the event argument at every Emitter call site (`emit`, `emit_str`, `emit_filter`, `emit_str_filter`, and the second argument of `emit_to` / `emit_str_to`) to be one of the consts declared in `events.rs`, instead of matching declarations by name.
- **TS side:** nothing stops a new raw `listen(` from `@tauri-apps/api/event` outside `src/lib/contracts/ipc.ts`, which bypasses the typed `on()`. Fix: an architecture test that allows that import only in `ipc.ts` (plus any documented exception), the way Issue 37 does for `invoke(`.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/tests/lib/contracts/,src/tests/lib/architecture/

**Source:** post-delivery adversarial review of Issue 11 (7af00157), 2026-11-01, finding 1 (minor), plus finding 4 of the Issue 11 review (`work/11/review.md`), which deliver rejected as out of scope and suggested filing.

- [x] A failing test first: a fixture Rust source with `pub(crate) const FOO_EVENT: &str = "foo";` and `app.emit(FOO_EVENT, p)` fails the parity check, and so does a suffix-less const used at an emit site
- [x] Every emit site in `src-tauri/src` today passes, and the existing literal-name cases still fail
- [x] A test fails when a file outside `src/lib/contracts/ipc.ts` imports `listen` from `@tauri-apps/api/event`

## Notes

- **Size:** S.
- The same review listed nits the literal check does not catch: raw strings (`r"x"`), turbofish (`.emit::<_>("x", p)`), UFCS (`Emitter::emit(&app, "x", p)`), a comment before the literal, and a target label containing a comma. None of them appear in the tree. Matching the call's event argument against the const set, as above, covers most of them.

## Comments

- 2026-11-01, branch `issue/62-event-registry-guards-emit-and-listen-sites`: the events parity test now matches each Rust emit call's event argument against the registry const set (any visibility, any name, plus shadow checks), and a new architecture test (`event-listen.test.ts`) allows importing `listen` from `@tauri-apps/api/event` only in `src/lib/contracts/ipc.ts`. Tests: `pnpm check` 0 errors; guard files 28/28; full suite (62-deliver-2.log) 408/408 files, 9639 passed, `pnpm build` ok (first run hit 2 load-related timeouts in queryjs-globals.test.ts, unrelated). Reviews: round 1 APPROVED, round 2 APPROVED with 3 nits (parameter/tuple shadowing, `>::emit` UFCS, `export *` barrel), none of which appear in the tree; shipped as is.
