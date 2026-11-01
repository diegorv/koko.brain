VERDICT: APPROVED

# Issue 50 review

## Acceptance criteria

- [met] ADR-0015 has a dated amendment naming `debug()` / `error()` as the frontend idiom and `appendLog` as the raw writer, with paths — `docs/adr/0015-dual-logging-frontend-rust.md:13-22` adds `## Amendment (2026-11-01): debug() and error() are the frontend idiom`, placed after the 2026-10-29 amendment. It names `debug()` / `error()` from `#lib/utils/debug.js` with the path `src/lib/utils/debug.ts:16-33` (verified: `debug` is at 16-22, `error` at 27-33), cites `CLAUDE.md:171-186` § Frontend logging (verified: 171 is the heading and 186 is the `appendLog` paragraph, 188 is `### Rust logging`), and names `appendLog` as "the raw writer underneath" with `src/lib/utils/log.service.ts`. The behavior claims match the code: the `FRONT-END:` / `ERROR:FRONT-END:` prefixes (debug.ts:18, 29), `captureSentryException` (debug.ts:31), `appendLog` being a no-op only without an active session (log.service.ts:61-62), both settings defaulting to `false` (settings.store.svelte.ts:125, 127), and LP-PROFILE going through `appendLog` (profiling.ts:33). The ADR body from `## Context` down is byte-identical to main (`git diff main...HEAD` only adds lines 13-23).
- [met] The `docs/adr/README.md` row for 0015 no longer presents `appendLog` alone as the frontend path — `docs/adr/README.md:122` now ends with "(amended: frontend code calls `debug()` / `error()`, with `appendLog` as the raw writer)". This is the same `(amended: ...)` pattern the 0016 row uses on line 123. The status stays `active`.

## Findings

1. minor — `docs/adr/0015-dual-logging-frontend-rust.md:20`: "Call it directly **only** for temporary debugging ... and for hot-path timing logs" is stricter than the authoritative text it cites. `CLAUDE.md:186` says "Use it for ...", not "only". It is also contradicted by permanent, non-timing direct callers on main: `widgets.ts:794` (META-BIND refused write), `properties.service.ts:83` (PROPERTIES), `inline-formatting-plugin.ts:90` (LP-INLINE handler threw), `RailNoteList.svelte:185,204,304` and `view-lens.service.ts:27` (VIEW-LENS / RAIL-SHELL failures). The `FE-STARTUP-PROBE` and `QJS-PROFILE` callers fit the timing case. So the ADR records a rule the code does not follow, which creates drift on day one. Fix: change "Call it directly only for" to "Call it directly for", matching CLAUDE.md. A later Issue can decide whether those error-path callers should move to `error()`. Not a blocker.
2. nit — `docs/adr/0015-dual-logging-frontend-rust.md:4`: the frontmatter `title:` still reads "appendLog (frontend → file)". The build agent kept it on purpose, because README Rules (README.md:99) say the original text stays in place, and the README row now carries the amendment note. I agree that it should stay. I mention it only so deliver knows it was a deliberate choice.
3. nit — `docs/adr/0015-dual-logging-frontend-rust.md:15,20`: the line citations `debug.ts:16-33` and `CLAUDE.md:171-186` are correct at this commit but will go stale when either file changes. The other amendments cite line ranges the same way, so no change is needed.

## Checks

- Typecheck: `pnpm check` in the worktree, exit 0 (`212 FILES 0 ERRORS 0 WARNINGS`), after `pnpm install --frozen-lockfile` (exit 0).
- Tests: the diff touches only Markdown (`git diff main...HEAD --name-only` returns three `.md` files and no others). No test file reads them: a grep for `0015-dual-logging`, `ADR.0015` and `adr/0015` under `src/tests`, `scripts` and `e2e` found nothing. So my test verdict rests on no test files, and I ran no vitest. The full suite is deliver's to run.
- Scope: the diff is the amendment, the README row and the discovery file. No source code, layer baseline or composition-root list changed. `ledger.md` is untouched.
- The worktree was clean before this review file was written.

## Resolution

1. Fixed: `docs/adr/0015-dual-logging-frontend-rust.md:20` now reads "Call it directly for", matching `CLAUDE.md:186` and the existing direct callers.
2. No change, as the review agrees: the frontmatter title stays as the original record (README Rules), and the README row carries the amendment.
3. No change: line citations follow the convention of the other amendments.
