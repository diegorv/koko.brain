# 32: Both inbox badges live on the Rail page, build info shows once, and Sentry moves to Advanced (assumes owner decision)

**What to build:** ASSUMES THE OWNER DECISION on the three IA moves (recommended yes for all three). Three settings move to where users look for them:

1. **Dock badge next to the rail badge.** The "Show inbox count on dock" switch moves from Quick Capture (`src/lib/core/settings/sections/QuickCaptureSection.svelte` about lines 81-95, its "Dock badge" group) into Rail's badge group (`src/lib/features/rail-shell/RailSection.svelte` about lines 56-68). The group heading becomes "Inbox badges"; the rail row's description drops "The dock badge has its own switch under Quick Capture." (about line 61); the dock row keeps its label and writes `settingsStore.dockBadgeInboxCount` the same way. Quick Capture loses the group.
2. **Build info once.** Remove Troubleshooting's "About" heading and Build row (`TroubleshootingSection.svelte` about lines 22-26) and the then-unused `BuildInfo` import. Update's "Current version" row (`UpdateSection.svelte` about line 273) stays and its description becomes "Release channel, version, commit and build time". Update the usage list in `BuildInfo.svelte`'s header comment (about lines 5-9).
3. **Sentry under Advanced.** In `src/lib/core/settings/settings.logic.ts` (about lines 247-261), Integrations holds only Todoist and Advanced becomes Sentry, Troubleshooting, Update. The nav label stays "Sentry" (`e2e/specs/settings.spec.ts:31-45` selects `/^sentry$/i`).

Update `help/documentation/19-settings.md` in the same change: the group list (about line 9), the rail badge row (about line 47), the dock badge row (about line 134, moves to the Rail table) and the Troubleshooting Build info row (about line 293).

**Blocked by:** 24

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [x] Failing first, `src/tests/lib/features/rail-shell/RailSection.test.ts`: the page renders a "Show inbox count on dock" switch in the badge group; clicking it flips `settingsStore.dockBadgeInboxCount` and leaves `railInboxBadge` alone; the page text no longer contains "under Quick Capture". The group listing test (about line 70) is updated on purpose: the last group is "Inbox badges"
- [x] Failing first: a Quick Capture render test asserts "Show inbox count on dock" is absent
- [x] Failing first: a Troubleshooting render test asserts no "Build" row and no "About" heading (extend `TroubleshootingSection.test.ts` if it exists, else create it)
- [x] `src/tests/lib/core/settings/settings.logic.test.ts` (about lines 346-354) is updated on purpose: the group order stays `['General','Notes','Tools','Integrations','Advanced']`, the section id order is unchanged (`..., 'todoist', 'sentry', 'troubleshooting', 'update'`), and a new assertion checks Advanced is `['sentry', 'troubleshooting', 'update']` and Integrations is `['todoist']`
- [x] `dock-badge.service.test.ts` and `settings.store.test.ts` stay green (the setting key does not change)
- [ ] The Sentry E2E case stays green

## Notes

- Source: review section 3 Settings row "Misplaced or duplicated settings"; `.scratch/ux-polish/work/settings.md` P7 and section 3 point 7.
- Owner decision covers all three moves; if the owner rejects one, drop that part and its criteria.
- Layer: `features/rail-shell/RailSection.svelte` already imports `core/settings`; the dock badge feature (`features/dock-badge`) reads the same store key, so no new import edge.
- Out of scope: Folder notes living on the Sidebar page and the `GeneralSection` name (`work/settings.md` P7, not in this cluster's items).
- Size: M.

## Partial work outside relay (2026-11-05)

**Done:** none of the three moves. Commit `c41976f92` reorganized `UpdateSection.svelte` into Version, Preferences and Changes in this build, and changed the Update table in `help/documentation/19-settings.md`, so line numbers there moved. The Current version row still exists, with its old description.

**Missing:** all three moves and their criteria. The owner decision is still open.

**Related proposal, not decided:** the main session suggested merging Sidebar and Rail into a Layout page, moving the dock badge there, adding a Files & Folders page (Templates folder, System folder, Folder notes) and leaving Sentry under Integrations. That last point differs from this ticket, so settle it before starting.

## Comments

Closed by hand on main at the owner's request, not through relay, by `a6b28484d`. This supersedes the "Partial work" section above, which was written before that commit. The owner settled the open decision: all three moves are in, Sentry under Advanced.

What differs from the text above:
- The badges live on a new Layout page, which merged Sidebar and Rail, so `RailSection.svelte` and its test are now `LayoutSection.svelte` and `LayoutSection.test.ts`.
- The group order gained Vault (General, Notes, Vault, Tools, Integrations, Advanced), and the section ids changed with the new pages, so `settings.logic.test.ts` holds that order instead of the one in the criterion.

Left open: `settings.spec.ts`, including the Sentry case, was read by a reviewer but not run. The full vitest suite and `pnpm build` did not run either, at the owner's request.
