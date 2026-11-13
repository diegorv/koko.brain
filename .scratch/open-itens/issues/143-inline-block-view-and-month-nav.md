# 143: Inline blocks choose a view and navigate months

**Origin:** `view-engine-fixes` Issue 16, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** an inline ` ```collection ` block always runs `views[0]` (`src/lib/features/collection/collection-block-widget.ts:110`), so a block cannot show a file's second view, and block calendars are built for the current month or year with no navigation (`:188-191`, `:284`).

- An optional top-level `_block_view` key in the block picks the view by `name`. Unknown name: the block shows an error naming it.
- Block calendars get previous / next / today controls.

**Blocked by:** 067, 138

**Status:** ready-for-agent

The key is `_block_view` (owner decision below): `_block_view: Board` at the top level of the block, with `_rail_view` semantics (exact name, first match). `view` is not usable: it is an alias of `_view` (`src-tauri/src/vault/aliases.rs:24`, `src/lib/utils/frontmatter-aliases.ts:20`). Read `docs/agents/live-preview-rules.md` before changing the widget.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/collection/collection-block-widget.test.ts`: `_block_view: Board` renders Board's rows; an unknown name renders the error; clicking next renders the next month's label.
- [ ] `help/documentation/12-collection.md` § Inline Collection.

## Notes

- **Size:** M.

## Comments

- 2026-11-06, owner decision: the key is `_block_view`.
