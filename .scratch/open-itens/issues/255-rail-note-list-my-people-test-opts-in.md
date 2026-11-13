# 255: RailNoteList's My people test opts its person in with _one_on_one_every

**Origin:** filed by the main session on 2026-11-13. The full gate for `53326acc1` (live-preview rebuild fix) found the failure, and it also fails with that fix stashed.

**What to build:** `src/tests/lib/features/rail-shell/RailNoteList.test.ts`, "Today > renders the one-on-one plugin's My people before the notes dated today", fails on main:

```
AssertionError: expected undefined to be 'never'
 ❯ src/tests/lib/features/rail-shell/RailNoteList.test.ts:795
```

Cause: `abdc97b6c` (feat(one-on-one): My people lists only people opted in with `_one_on_one_every`) made My people opt-in. A person note appears only when its frontmatter sets `_one_on_one_every` (a positive whole number, or `true` for the `dueAfterDays` default). That commit updated `one-on-one.logic.test.ts` and `MyPeopleSection.test.ts` but not this test, whose "Ana" fixture has no `_one_on_one_every`. The logic now leaves her out, so the row the test reads does not exist.

The fixture is `entryV2('/vault/Work/_people/Ana.md', { isA: 'Person' })` (around line 787). Add `_one_on_one_every: true` to it, which keeps the old "never" expectation. Do not change `one-on-one.logic.ts`: the opt-in is the intended behavior.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only, tests only: `pnpm check` + `pnpm vitest run src/tests/lib/features/rail-shell/RailNoteList.test.ts`, then the full `pnpm vitest run` once.

- [ ] "renders the one-on-one plugin's My people before the notes dated today" passes, and still asserts that Ana's row shows "never" and that My people comes before the notes dated today.
- [ ] No change under `src/lib/`.
- [ ] `pnpm vitest run` passes with no failures.

## Notes

- **Size:** XS.
- On 2026-11-13 this was the only failure in the full suite (16927 passed), so `abdc97b6c` left no other test behind.

## Comments

- 2026-11-13: filed by the main session.
