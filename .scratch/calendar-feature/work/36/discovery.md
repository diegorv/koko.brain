# Issue 36 discovery: calendar follow-ups filed, full E2E green

Tracker and docs only; no source or test file changes (no Pre-Change Checklist applies).

## Numbering
- Highest ticket number ever used for this feature: 39 (`git log --all --name-only -- .scratch/calendar-feature/issues/`: 38-dates-prototype-parity, 39-write-service-rename-flicker). The follow-ups start at 40, not at the 38 the Issue names.

## Files that change
- `.scratch/calendar-feature/issues/40-*.md` to `64-*.md` (new, 25 files):
  - 40-60: the 21 plan Notes > Follow-ups items (plan lines 1298-1318), in plan order. The archify item is filed: ticket 34 left both map files untouched (`work/34/review.md:40`; last commit on them is 0001d3b6).
  - 61 (A): vault-switch drain gap from close commit f984319f. `initializeVault` drains at `app-lifecycle.service.ts:178`, but `vaultStore.open` (`vault.service.ts:11,33`) already set the new path, so `assertVault` after the write (`frontmatter-write.service.ts:120`) throws `vault-changed` and `notifyAfterSave` (`:123`) never runs.
  - 62 (B): ticket 31 review finding (1), `EventTimeGrid.svelte:124-125` / `:158`.
  - 63 (C): ticket 31 review finding (2), `event-calendar.service.ts:773`.
  - 64 (D): one polish checklist, every other review candidate in this Issue's Comments (tickets 22, 26, 27, 28, 29, 32), quoted with file:line.
- `.scratch/sveltekit-3-migration/issues/11-migrate-tests-to-lib-subpath.md`: still open, so it gains a `## Comments` entry. Plan-added `vi.mock` strings (git blame, 2026-10-28 commits):
  - `app-lifecycle.service.test.ts:151` `'$lib/features/event-calendar/event-calendar.service'` (8b6bb486)
  - `tauri-listeners.service.test.ts:67` `'$lib/features/event-calendar/event-calendar.service'` (70c60368)
  - `type-definitions.service.test.ts:17` `'$lib/core/note-creator/note-creator.service'` (58561937)

## Format
- Template: `.scratch/embedder-memory/issues/02-update-semantic-file-silent-skip.md` (title, What to build, Blocked by, Status, context bullets, checklist).

## Defaults taken
- Status: `ready-for-agent` for items with a clear fix; `needs-triage` for the ones that wait on a decision or on another plan (recurrence, holidays, tab-kind registry, sync conflict copies, Rust range command, helper consolidation, theme-editor colors). The owner-mandated A-D are `ready-for-agent`.
- Blocked by: `None` unless a ticket waits on another plan or ticket (sync conflict copies wait on `.scratch/p2p-sync`). Ticket 37 (plan closer) blocks none of them.
- Per the owner's 2026-10-28 rule the follow-ups are 25 tickets, not the Issue's 21; the review and deliver steps should read the extra four against that rule.
- One commit for the follow-up files plus the kit-3 comment (the Issue asks for one commit). The full E2E run and the frontend gate are the deliver step's.

## Risks
- Line anchors in the review comments may have drifted; tickets quote them as recorded and say "as recorded".
