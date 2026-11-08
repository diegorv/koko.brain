# 167: Pasting an HTML table keeps the links in its cells

**Origin:** `audit-2026-11-05` Issue 158, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 41 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 41 first; its Details and evidence apply here. Convert a pasted HTML table to a markdown table with its cell links, instead of leaving it to the TSV path, covering header rows without TH, newlines in cells and pipes.

**Blocked by:** 055

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Same file: '<table><tr><th>Name</th><th>Link</th></tr><tr><td>Task</td><td><a href="https://j.io/1">JIRA-1</a></td></tr></table>' with plain 'Name\tLink\nTask\tJIRA-1' converts to a two-column markdown table whose second body cell is [JIRA-1](https://j.io/1). It fails today.
- [ ] A `|` in a cell or in link text is escaped as \| in the table output.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
