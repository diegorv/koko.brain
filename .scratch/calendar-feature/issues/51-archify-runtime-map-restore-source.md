# 51: Archify runtime map shows the `restore` note-change source

**What to build:** regenerate the archify runtime map so it lists six note-change sources, including `restore`.

**Blocked by:** None

**Status:** ready-for-agent

- Ticket 34 could not run the `archify` skill, so `docs/architecture/archify/kokobrain-runtime.architecture.json` (`:73` still reads "5 change sources") and `kokobrain-runtime.html` are untouched (`.scratch/calendar-feature/work/34/review.md:40`).
- The `restore` row: `note-change.service.ts` SOURCE_POLICY, ADR-0009 amendment, ADR-0032.

- [ ] Both map files regenerated with the `archify` skill and show `restore`
- [ ] No other map changes beyond what the regeneration produces from current code
