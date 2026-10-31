# 19: Today lens

**What to build:** The rail gains Today, after Inbox. The note list shows Pinned (every favorite, not archived), then the notes whose note date is today, under group headers with counts. The header has "Daily note" next to New here, and New here creates a plain note with `date: <today>`. Today becomes the default rail item for new settings and the fallback for a lost rail item or lens.

**Blocked by:** 01, 08, 11

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Today), decisions Q8 and Q24.

- [ ] Logic test first: the Today lens groups favorites first, then notes whose note date is today
- [ ] Daily note opens or creates today's daily note
- [ ] New here writes `date: <today>`
- [ ] Left open past midnight, the list moves to the new day
- [ ] A fresh install of the rail shell starts on Today; a lost rail item or lens falls back to Today
- [ ] Today exposes a section slot that a plugin can register into (used by ticket 20)
- [ ] E2E: open Today, the pinned note and a note dated today both show
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
