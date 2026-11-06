# 18: A `.view` checker for agents

**What to build:** an agent writing a `.view` from outside the app gets feedback only 3 to 12 s later, in the UI, and several mistakes fail silently (a list filter matches everything, an unknown method matches nothing, a quoted `_rail` is ignored). `docs/agents/view-files.md` documents the rules; this gives a check.

- A command that takes `.view` paths and prints, per file: the `parseCollectionYaml` error, if any; `validateExpression` errors for every filter and formula (with 02's method check); the reader notes (`ignoredKeyNotes`, `railViewNameNote`); and the pitfalls the reference lists that code can detect (fences, a list under `filters:`, lowercase `asc`, an unquoted `#` color).
- Exit code 0 when every file is clean, 1 otherwise.
- `docs/agents/view-files.md` points to it.

**Blocked by:** 02

**Status:** needs-info

**Needs human:** how a script loads the app's TS modules here (a vitest-based runner, `tsx`, or a small build step). Each adds a different dependency or convention.

**Gate:** frontend: `pnpm check` + `pnpm vitest run` (and `pnpm build` if `package.json` changes).

- [ ] Failing test first: a vitest over fixtures: a list filter, `direction: asc`, an unquoted numeric `name` and `---` fences each give the documented message; a clean file gives none.

## Notes

- **Size:** S-M.
