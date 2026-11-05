# 50: Sync conflict copies shown distinctly

**What to build:** p2p-sync conflict copies of event notes (`<stem> (conflict <peer> <hash>).md`) are marked as conflicts on the Calendar instead of rendering as duplicate events.

**Blocked by:** `.scratch/p2p-sync/plan-2026-08-25.md` (conflict copies exist only once it lands)

**Status:** needs-triage

- Plan Notes > Dependencies and Risks item 15; the Calendar user guide documents the duplicate today.
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- Open: how a conflict is shown (badge, Needs-attention entry) and whether resolving it is in scope.

- [ ] Conflict copies are detected by name and shown distinctly
- [ ] Logic test for the detection
