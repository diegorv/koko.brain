# 216: Collection table headers read as names and stay visible while the table scrolls

**Origin:** `audit-2026-11-05` Issue 161, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 66 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 66 first; its Details and evidence apply here. Humanized header fallback (due_date reads "Due date"), shared with the Sort and Properties panels so the names agree, with a rule for dotted keys (file.name, formula.x); and a sticky header, which needs the inner overflow wrapper restructured.

**Blocked by:** 215

**Status:** needs-info

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing first: `collection.logic` test for the humanized header fallback (`due_date` reads "Due date"), with stored config unchanged
- [ ] The header stays visible while the table scrolls (E2E or component check)
- [ ] Owner decision recorded in the Issue Notes: how dotted keys (file.name, formula.x) read when humanized.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
