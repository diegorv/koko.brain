# 18: A `.view` checker for agents

**What to build:** an agent writing a `.view` from outside the app gets feedback only 3 to 12 s later, in the UI, and several mistakes fail silently (a list filter matches everything, an unknown method matches nothing, a quoted `_rail` is ignored). `docs/agents/view-files.md` documents the rules; this gives a check.

- A command that takes `.view` paths and prints, per file: the `parseCollectionYaml` error, if any; `validateExpression` errors for every filter and formula (with 02's method check); the reader notes (`ignoredKeyNotes`, `railViewNameNote`); and the pitfalls the reference lists that code can detect (fences, a list under `filters:`, lowercase `asc`, an unquoted `#` color).
- Exit code 0 when every file is clean, 1 otherwise.
- `docs/agents/view-files.md` points to it.

**Blocked by:** 02

**Status:** ready-for-agent

**How it runs** (owner decision below): as a vitest file that reads the paths from an environment variable, e.g. `VIEW_FILES="a.view b.view" pnpm vitest run src/tests/tools/view-check.test.ts`. No new dependency. With no variable set, the file runs only its fixture tests, so the suite stays green.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: a vitest over fixtures: a list filter, `direction: asc`, an unquoted numeric `name` and `---` fences each give the documented message; a clean file gives none.

## Notes

- **Size:** S-M.

## Comments

- 2026-11-06, owner decision: run the checker as a vitest file driven by an environment variable; no `tsx`, no new dependency.
