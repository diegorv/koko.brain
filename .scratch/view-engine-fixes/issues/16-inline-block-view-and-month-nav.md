# 16: Inline blocks choose a view and navigate months

**What to build:** an inline ` ```collection ` block always runs `views[0]` (`src/lib/features/collection/collection-block-widget.ts:110`), so a block cannot show a file's second view, and block calendars are built for the current month or year with no navigation (`:188-191`, `:284`).

- An optional top-level key in the block picks the view by `name`. Unknown name: the block shows an error naming it.
- Block calendars get previous / next / today controls.

**Blocked by:** 03, 06

**Status:** needs-info

**Needs human:** the key's name and form. `view` is taken: it is an alias of `_view` (`src-tauri/src/vault/aliases.rs:24`, `src/lib/utils/frontmatter-aliases.ts:20`), and Rust folds it in a `.view` file. Proposals: `_block_view: Board` or `block_view: Board` at the top level of the block, matching `_rail_view` semantics (exact name, first match). Read `docs/agents/live-preview-rules.md` before changing the widget.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/collection/collection-block-widget.test.ts`: the chosen key naming `Board` renders Board's rows; an unknown name renders the error; clicking next renders the next month's label.
- [ ] `help/documentation/12-collection.md` § Inline Collection.

## Notes

- **Size:** M.
