# 59: EmptyState, InlineAlert and Badge primitives exist

**What to build:** About 30 empty states come in 5 sizes, errors reuse empty copy, and there are about 12 chip recipes. Add three primitives under `src/lib/components/ui/`: `EmptyState` (title, optional description and action, plus a compact variant), `InlineAlert` (extracted from the already-correct pattern in `CollectionView.svelte`, about lines 585-590) and `Badge` (neutral, primary, status, count). Migrate one call site of each as the proof.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Each primitive has a component test (variants, accessible roles: `role="alert"` on InlineAlert)
- [ ] One real call site per primitive is migrated with its existing test green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6 and section 4 Issue 11.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/145-emptystate-inlinealert-badge-primitives-exist.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
