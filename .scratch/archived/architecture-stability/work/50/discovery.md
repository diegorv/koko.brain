# Issue 50 discovery: ADR-0015 amendment for the debug()/error() idiom

## Files that change

- `docs/adr/0015-dual-logging-frontend-rust.md:9-11`: existing `## Amendment (2026-10-29)` sits between frontmatter and Context. Add `## Amendment (2026-11-01): debug()/error() is the frontend idiom` right after it (chronological order, as in 0016:9-15).
- `docs/adr/README.md:122`: the 0015 index row. Append an `(amended: ...)` note, the pattern the 0016 row uses (README.md:123).

## Plan

1. Amendment text: `debug(tag, ...args)` (`src/lib/utils/debug.ts:16`) and `error(tag, ...args)` (`debug.ts:27`) from `#lib/utils/debug.js` are the frontend idiom; `debug()` is gated by `settingsStore.debugLogToFile` (file) and `debugMode` (console), `error()` always hits console + Sentry and the file when `debugLogToFile` is on; both write through `appendLog` with a `FRONT-END:` / `ERROR:FRONT-END:` tag prefix. `appendLog` (`src/lib/utils/log.service.ts`) stays the raw writer for ungated temporary debugging and hot-path timing (LP-PROFILE, `core/profiling.ts`). Cite `CLAUDE.md:171-186` § Frontend logging as authoritative. State the two-facility decision is unchanged, and that the Decision, Enforcement quote and Consequences import line below read as historical.
2. README row: `Dual logging: appendLog (frontend → file) and debug_log (Rust → stderr + event) (amended: frontend idiom is debug()/error() over appendLog)`.

## Defaults taken

- Frontmatter `title:` left unchanged: README Rules (README.md:99) say leave original text in place; README rows may differ from titles (0008 row vs its title).
- Body above/below the amendment untouched.

## Tests

None: docs only, no test reads these files (Issue Gate). Checked with grep for the ADR file name under `src/tests`.

## Risks

- Line citations into CLAUDE.md / debug.ts drift; matches the convention of other amendments.
