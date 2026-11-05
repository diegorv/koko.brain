# 08: The `_rail_view` mark is validated against the file

**What to build:** Every correct `_rail_view` gets the false mark "names no view; the first view runs" on its Views row.

The check (`type-sidebar.logic.ts:417`) calls `viewIndexByName(fm.views, v)` on the index entry's frontmatter (`lens.logic.ts:622`). Rust projects nested maps to null, so `views` is `[null]` there (`vault_frontmatter_parity_test.rs:62`, `parsing.rs:815`), and every name returns -1. The view still runs correctly, because that uses the parsed definition. A right name and a wrong name look identical, and the row states the opposite of what happens. `type-sidebar.logic.test.ts:1099-1105` and `lens.logic.test.ts:1122` pass because they inject real objects.

The owner chose to keep the wrong-name mark, which the docs promise (`25-types-and-relationships.md`, Multiple Views). So:

- The entry check tests only the value's kind.
- The wrong-name note comes from the parsed definition. `countViewNotes` already reads and parses each view (`view-lens.service.ts:27`), so carry the result to the row, consistent with ADR-0027 line 30, which says this key is read from the parsed definition.
- Before a view has been counted, show no wrong-name mark.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, with the Rust shape `views: [null]` in the entry and a real `.view` body on the mocked disk: a right name shows no mark, and a wrong name shows the mark once counted.
- [ ] A value of the wrong kind still gets its mark from the entry.
- [ ] Existing test intent at `type-sidebar.logic.test.ts:1104-1105` and `lens.logic.test.ts:1122` is kept. Do not delete them; move them to the new source of the check if the shape changes.

## Notes

- A view hidden with `_visible: false` has no row, so no mark to compute.
- **Size:** S.
