# 068: DESC sort lists notes without a value last

**Origin:** `view-engine-fixes` Issue 04, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `compareForSort` puts null last (`src/lib/features/collection/collection.logic.ts:426-434`), but the sort loop negates the result for DESC (`:193-205`), so DESC puts notes with no value first. The comment "null/undefined always sort last" is wrong for DESC. "Sort by priority DESC" opens with every note that has no priority, and the help's "Top 10 by priority" example with `limit` (`help/documentation/12-collection.md:161`) can return 10 notes with no priority.

- Handle nulls before the direction is applied, so they are last in both directions. Fix the comment.

**Blocked by:** 067

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: `collection-logic.test.ts:640-659` asserts nulls last for DESC (owner-approved on 2026-11-06), plus a `limit: 2` DESC case that returns the two highest values.
- [ ] `help/documentation/12-collection.md` § Sort Panel: notes without the value come last.
- [ ] If view-editor 05 already landed with an info line "With DESC, notes without the value come first", remove it.

## Notes

- **Run before (other feature):** view-editor 05, so 05 needs no DESC info line. relay-lite does not enforce this.
- **Size:** S.

## Comments

- 2026-11-06, owner decision: notes without the value sort last in both directions; changing the pinned test `collection-logic.test.ts:640-659` is approved.
