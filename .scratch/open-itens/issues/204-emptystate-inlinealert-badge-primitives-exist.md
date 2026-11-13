# 204: EmptyState, InlineAlert and Badge primitives exist

**Origin:** `audit-2026-11-05` Issue 145, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/59-empty-error-badge-primitives.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A design-system refactor that 60 and 61 build on.

**Audit check at `5f8003d67`:** design_or_refactor (refactor, low). src/lib/components/ui/ has no empty-state, inline-alert or badge directory (ls); rg for EmptyState/InlineAlert finds only the ledger and Issue docs. The alert pattern still lives inline at src/lib/features/collection/CollectionView.svelte:688 and src/lib/features/rail-shell/RailNoteList.svelte:862 (role=alert, border-destructive/50 bg-destructive/10). Valid consolidation work, no user-visible defect.

**Stale in the text below:** CollectionView 'about lines 585-590' is now line 688 (a second copy at RailNoteList.svelte:862; CollectionView:502 has a variant without role=alert).

**What to build:** About 30 empty states come in 5 sizes, errors reuse empty copy, and there are about 12 chip recipes. Add three primitives under `src/lib/components/ui/`: `EmptyState` (title, optional description and action, plus a compact variant), `InlineAlert` (extracted from the already-correct pattern in `CollectionView.svelte`, about lines 585-590) and `Badge` (neutral, primary, status, count). Migrate one call site of each as the proof.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, added on 2026-11-06 because first-wave Issue 147 is blocked by it.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Each primitive has a component test (variants, accessible roles: `role="alert"` on InlineAlert)
- [ ] One real call site per primitive is migrated with its existing test green

## Notes

- **Source:** `.scratch/archived/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6 and section 4 Issue 11.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/59-empty-error-badge-primitives.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
