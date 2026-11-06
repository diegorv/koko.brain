# 144: The tab strip shows overflow and hides the .md extension

**Migrated from:** `.scratch/ux-polish/issues/54-tab-strip-overflow.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A feature request with no defect. Its blocker 07 is resolved.

**Audit check at `5f8003d67`:** still_present (ux, low). src/lib/core/markdown-editor/EditorTabs.svelte:45 the strip is a plain overflow-x-auto flex with no edge fade and no tab-list menu; :78-80 renders {tab.name}, and tab names come from getFileName(filePath) (editor.service.ts:136, basename), so .md is shown. Issue 07 (active tab scrolls into view) is delivered at EditorTabs.svelte:40 (scrollIntoView), so the blocker is gone. A scrollable strip with many open tabs is normal use, but the active tab always stays visible.

**Stale in the text below:** Blocked-by 07 is done. Status is needs-triage, so it is a feature request with no defect; the Issue's breadcrumb mention was not checked (no breadcrumb component found by rg).

**What to build:** After Issue 07 keeps the active tab visible, the strip still gives no cue that more tabs exist off screen. Add an edge fade on the overflowing side and a tab-list menu button listing every open tab, and hide the `.md` extension in tab labels and the breadcrumb (other extensions stay).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A component test asserts the `.md` suffix is not rendered for Markdown tabs and is rendered for `.canvas`
- [ ] The tab-list menu lists every open tab and activates the chosen one (test)
- [ ] The fade appears only when the strip overflows (test on the overflow state)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 1; `work/layout.md` P13.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/54-tab-strip-overflow.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
