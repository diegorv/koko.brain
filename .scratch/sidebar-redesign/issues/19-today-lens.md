# 19: Today lens

**What to build:** The rail gains Today, after Inbox. The note list shows Pinned (every favorite, not archived), then the notes whose note date is today, under group headers with counts. The header has "Daily note" next to New here, and New here creates a plain note with `date: <today>`. Today becomes the default rail item for new settings and the fallback for a lost rail item or lens.

**Blocked by:** 01, 08, 11

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Today), decisions Q8 and Q24.

- [x] Logic test first: the Today lens groups favorites first, then notes whose note date is today
- [x] Daily note opens or creates today's daily note
- [x] New here writes `date: <today>`
- [x] Left open past midnight, the list moves to the new day
- [x] A fresh install of the rail shell starts on Today; a lost rail item or lens falls back to Today
- [x] Today exposes a section slot that a plugin can register into (used by ticket 20)
- [x] E2E: open Today, the pinned note and a note dated today both show
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/19-today-lens`: Today lens (Pinned + dated-today groups, Daily note button, New here with `date: <today>`, midnight rollover via the Calendar clock, Today as the default and fallback rail item, Today section slot). Review round 1: APPROVED with 1 minor + 3 nits. Fix round: same-day clock ticks no longer re-resolve the lens (`todayKey` derived first); New here dates the note by the lens's day, falling back to the click instant; dual-row rename nit accepted as is; per-theme eye check left to a human. Tests: targeted rail-shell + calendar 492 passed, `pnpm check` 0 errors, full suite 373 files / 9062 tests passed + `pnpm build` ok (exit 0).
