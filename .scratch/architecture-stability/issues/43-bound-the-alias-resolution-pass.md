# 43: Bound the alias-resolution pass in the frontmatter parse

**What to build:** Issue 41 (squash ecd8c482) added an alias-resolution pass to `foldUnquotedWikilinks` (`src/lib/features/properties/properties.logic.ts:62-81`). It replaces each alias whose target is a scalar chain with a clone of the target. Two things make it super-linear, with no cap:
- `alias.resolve(doc)` (:65) is called without a `ctx`, so yaml 2.9.1 (`dist/nodes/Alias.js`) walks the whole document again for every alias, and the document grows as copies are inserted.
- Copies have no budget, and they bypass yaml's `maxAliasCount`. A chain `l_i: &l_i [*l_{i-1}]` becomes a scalar chain after each copy, so L lines build about L²/2 nodes.

Measured by the post-delivery review on a /tmp copy of the function (`uniqueKeys: false`):

| Input | Size | `yaml.parse` before 41 | After 41 |
|---|---|---|---|
| N aliases to `&x X`, N=10k | 99 KB | 48 ms, "Excessive alias count" | 21 s |
| N=50k | 539 KB | 183 ms, throws | 543 s |
| depth-1000 chain × 100 aliases | 2.8 KB | 29 ms, throws | 13 s |
| alias chain, L=600 | 11 KB | 25 ms, throws | 30.6 s |

The LRU cache does not help. `updateCalendarForFile` (`calendar.service.ts:80`) and the other note-change consumers parse on watcher and save events, so one synced or clipped note can hang the app. A panel commit pays the cost again through `isFrontmatterUnparseable` (:259), which has no cache.

Fix:
- One `visit` with a `Node` visitor and a `Map<anchor, node>`. On an alias, look up `anchors.get(alias.source)`; otherwise record `node.anchor`. This keeps yaml's "most recent preceding anchor" rule, because it visits in the same order as `resolve`.
- A budget on copied nodes (the review prototyped 10,000). Past it, throw, so the note parses to `[]` and `isFrontmatterUnparseable` refuses panel edits, as before Issue 41.
- Correct the ADR 0029 amendment (`docs/adr/0029-frontmatter-yaml-canonical-form.md:107`), which calls the bypass harmless.

The review prototyped both: 50k aliases took 286 ms, and the L=600 alias chain threw at once with the budget.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** post-delivery adversarial review of Issue 41 (the alias pass from 3915051e and the fix range a22aee7d..e5760829, all in ecd8c482), 2026-11-01, finding 1 (high). The review also checked the anchor clearing (13 cases match `yaml.parse` apart from the intended folds) and the panel parse guard (cc238bb7), and found both correct. The same pass was flagged by the automated security review of 3915051e.

- [x] A failing test first, for each shape in the table: N aliases to one anchor, a deep chain with many aliases, and an alias chain. Each finishes well under a second (assert a bound loose enough not to flake on CI, for example 2 s), and the over-budget shapes parse to `[]`.
- [x] The existing Issue 39 and 41 tests pass unedited, including the 13 anchor and alias cases the review ran (add the ones that are not already tests).
- [x] `isFrontmatterUnparseable` does not pay the full cost a second time on a panel commit (share the parse, or reuse the cache).
- [x] The ADR 0029 amendment states the budget and drops "harmless".

## Notes

- **Not checked:** whether the Rust yaml-rust2 path (Issue 26) amplifies the same inputs. Its `MAX_ALIAS_EXPANSION_NODES` budget (parsing.rs:581) caps expansion, and sidebar-redesign Issue 30 bounds its depth.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/43-bound-the-alias-resolution-pass`: the frontmatter parse in `properties.logic.ts` now bounds alias copies (each alias target sized once, a self-referencing alias list reads as unparseable), `isFrontmatterUnparseable` shares the parse, ADR 0029 amendment states the budget. Tests added in `properties.logic.test.ts`. Full suite: 381 files, 9250 passed, 1 skipped, 1 todo, build ok. Review round 1 CHANGES_REQUESTED (fixed), round 2 APPROVED.
