# 04: DESC sort lists notes without a value last

**What to build:** `compareForSort` puts null last (`src/lib/features/collection/collection.logic.ts:426-434`), but the sort loop negates the result for DESC (`:193-205`), so DESC puts notes with no value first. The comment "null/undefined always sort last" is wrong for DESC. "Sort by priority DESC" opens with every note that has no priority, and the help's "Top 10 by priority" example with `limit` (`help/documentation/12-collection.md:161`) can return 10 notes with no priority.

- Handle nulls before the direction is applied, so they are last in both directions. Fix the comment.

**Blocked by:** 03

**Status:** needs-info

**Needs human:** `src/tests/lib/features/collection/collection-logic.test.ts:640-659` pins today's order (nulls first in DESC). Changing it flips a pinned behavior: the owner confirms nulls-last in both directions before this starts.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: `collection-logic.test.ts:640-659` asserts nulls last for DESC (the owner-approved change), plus a `limit: 2` DESC case that returns the two highest values.
- [ ] `help/documentation/12-collection.md` § Sort Panel: notes without the value come last.
- [ ] View-editor 05 added an info line "With DESC, notes without the value come first": remove it.

## Notes

- **Run after (other feature):** view-editor 05 (it removes 05's DESC info line). relay-lite does not enforce this.
- **Size:** S.
