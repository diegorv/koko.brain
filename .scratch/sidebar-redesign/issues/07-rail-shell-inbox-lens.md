# 07: Rail shell with the Inbox lens

**What to build:** A new Settings choice, Layout: Classic or Rail (`layout.shell`, default Classic), switches the left side live. In the rail shell the far left is the icon rail, which for now holds only Inbox, with its count badge. Inbox fills the note list: a header with the label and the rule in plain words, then one shared row per note (type icon, title, a subtitle with type, note date and folder, the type's list-property pills, inbox notes in italics) with the shared row menu. Clicking a row opens the note as today. Tabs, editor, action bar, right sidebar and status bar are unchanged. The classic shell is unchanged. Later tickets add the other rail items in their final positions. The shell, the lens model and the note list live in `features/` (PRD, Code placement).

**Blocked by:** 01, 06
Also blocked by `.scratch/sidebar-fixes/issues/07-stale-shortcut-and-settings-text.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Layout, Rail, Lenses, Code placement, Rollout step 1.

- [x] The Settings choice switches shells without a restart and persists
- [x] The rail uses the app background, readable icons and a highlighted active item; the Inbox badge shows the same count as the dock badge
- [x] The rail leaves room for the macOS traffic lights and its top strip is a window drag region
- [x] Logic test first: the Inbox lens resolves to its label, its rule text and today's inbox predicate over the entries snapshot, with type definitions and the system folder excluded
- [x] Each row's subtitle shows the note date from the rule of ticket 01
- [x] The shared row menu works on rail list rows (rename, favorite and move to trash at least, asserted on the resulting state)
- [x] The row of the active tab's note is highlighted; an empty Inbox shows an empty state
- [x] The right sidebar still auto-hides on the Calendar and Tasks tabs in the rail shell
- [x] The shell exposes a registration point that plugins use to add navigators, lenses and Today sections; nothing in `features/` imports `plugins/`
- [x] Switching back to Classic shows the classic sidebar exactly as before
- [x] E2E: switch to Rail, the Inbox list shows the vault's inbox notes, clicking one opens it
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/07-rail-shell-inbox-lens`: rail shell with the Inbox lens (Layout setting Classic/Rail, icon rail with the Inbox badge, rail note list over the shared row and menu, rail registry for navigators / lenses / Today sections). Review round 1: APPROVED with four minor findings and three nits; the fix round changed the active rail item to the classic selection pairing, made Cmd+Shift+B and the "Toggle Left Sidebar" command a no-op in Rail (ticket 10 gives them their rail meaning), added the Calendar-tab step to the rail E2E, made the boundary scan recursive and import()-aware, and noted in the row-menu tests that the E2E owns the resulting state; nit 6 deferred to tickets 17/19/20, nit 7 rejected (lens kinds and rail keys stay open for plugins). Tests: `pnpm check` 0 errors; full `pnpm vitest run && pnpm build` exit 0 (362 files, 8688 passed, 1 todo); `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts` 4 passed.
