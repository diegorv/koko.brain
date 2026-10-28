# 53: A Rust date-range command for events, if profiling shows a need

**What to build:** only if the projection is measured to be slow on large vaults, a Rust command that returns the event entries in a date range instead of the TS projection over the full `get_all_vault_entries_v2` snapshot.

**Blocked by:** None

**Status:** needs-triage

- Plan Risks item 9: the O(N) projection runs per index bump while the tab is mounted, over a snapshot the listener already fetched. No measurement shows a problem today.
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- Profile with the LP-PROFILE style `appendLog` timing first.

- [ ] Profiling numbers on a large vault recorded in this ticket
- [ ] Only if they justify it: the command plus a Rust test, and the TS side switched
