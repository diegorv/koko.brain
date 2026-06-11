# Virtualize TypeNoteList

Render only visible rows in the type sidebar's note list using `virtua` (VList,
Svelte 5 native, dynamic row heights via ResizeObserver). Motivation: with the
O(1) icon-lookup fix the 300-item type click dropped to ~200ms, but nav
selections like Inbox render ~7.8k DOM rows in large vaults (rossini-vault-old:
7846 files, 6 organized, 1 archived) and full DOM creation is the remaining
bottleneck.

## Tasks

- [x] Task 1: Add `virtua` dependency (latest quarantine-compliant 0.49.x), verify install + `pnpm check` + `pnpm vitest run` green
- [x] Task 2: Refactor TypeNoteList to render rows through `VList` (children snippet, per-row divider, empty state outside, `getKey` by path, fill-height styling inside the ContextMenu trigger container); update `TypeNoteList.perf.test.ts` to the virtualization contract (bounded rendered-row count, content assertions, timing ceiling, ResizeObserver stub for jsdom if needed)
- [x] Task 3: Run full gates + E2E suite (`bash scripts/e2e.sh`), fix fallout, move this plan to tasks/done/

## Notes

- `virtua` 0.49.1 released 2026-04-12, passes the 7-day `minimumReleaseAge`
  quarantine (ADR 0014). TanStack svelte-virtual rejected: open Svelte 5
  compatibility issues (TanStack/virtual #866).
- User decision 2026-06-11: keep virtua, re-evaluate TanStack when #866
  closes — tracked in
  `.scratch/virtualize-type-note-list/issues/01-reevaluate-tanstack-virtual.md`.
- Preserve exactly: context menu per row, F2/inline rename flow, pill rendering
  + wikilink clicks, empty state, row divider visuals, default scroll
  behavior (no new scroll-reset behavior added).
- Scope is ONLY TypeNoteList. TypeSidebar sections are small; not touched.
- No E2E spec currently exercises the type note list (verified by grep over
  e2e/specs), so the E2E run is a regression sanity gate, not a contract.
