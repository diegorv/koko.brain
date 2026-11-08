# 41: An anchored wikilink empties the parsed frontmatter

**What to build:** Issue 39 (squash 7c46f6bf) added `foldUnquotedWikilinks` to `parseFrontmatterProperties` (`src/lib/features/properties/properties.logic.ts:45-55`, called from `computeAndCache` at :133-136). It replaces a sequence holding a one-item sequence of a scalar with `doc.createNode("[[X]]")`. The new node does not carry the old node's anchor, so a later alias to it no longer resolves: `doc.toJS()` throws `ReferenceError: Unresolved alias`, the catch caches `[]`, and the whole frontmatter parses to no properties.
- `a: &x [[X]]` + `b: *x`: before 7c46f6bf `{a: "[[X]]", b: "[[X]]"}`, now `[]`.
- `a: [[&x X]]` + `b: *x`: before `{a: "[[X]]", b: "X"}`, now `[]`.

Why it matters: with the Properties panel showing no properties, a panel edit goes through `commitChanges` (`src/lib/features/properties/properties.service.ts:74-90`), which calls `rebuildContent(updated, body)` with no `detectLossyFrontmatter` check. Adding one property would then rewrite the block with only that property and drop every other key. `frontmatter-write.service.ts:120` and `duplicateEvent` refuse anchors first, so they are safe. Anchors in frontmatter are rare, but the result is data loss.

Fix:
- Skip the fold when the outer sequence, the inner sequence or the target carries an anchor, or copy the anchor onto the new node. Pick the one that keeps `b: *x` resolving to what it resolved to before 7c46f6bf, and pin both inputs above in `properties.logic.test.ts`.
- Two low findings from the same review, in the same function:
  - An alias as the inner item no longer folds: `z: &x X` + `a: [[*x]]` gave `"[[X]]"` before and gives `['["X"]']` now (`isScalar(Alias)` is false). The same happens for `a: &l [X]` + `b: [*l]`. Decide whether to resolve the alias first, or keep the new value and record it in the ADR 0029 amendment.
  - `yaml.parse` logged each warning (an unresolved `!foo` tag, collection keys) through `log.warn`; `parseDocument` leaves them in `doc.warnings` and nothing logs them now. Log them the same way.
- Check the wider guard: whenever `parseFrontmatterProperties` returns `[]` for a block that is not empty (any parse failure, not only this one), can a panel edit rewrite the block and lose the original keys? If it can, refuse the commit in that case (or reuse `detectLossyFrontmatter`) and add a test. If the panel already blocks editing on a parse failure, name where in a comment and add no code.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`. Add `cargo test --manifest-path src-tauri/Cargo.toml` if the shared fixture `src-tauri/tests/fixtures/note-record-projection.json` changes.

**Source:** post-delivery adversarial review of Issue 39 (fix range 0517f4be..98bbd5c2, merged in 7c46f6bf), 2026-11-01: finding 1 (medium) and findings 2-3 (low). Reproduced by the reviewer in node against `yaml@2.9.1` with copies of the old and new code paths, not through the shipped module.

- [x] A failing test first: `a: &x [[X]]\nb: *x` and `a: [[&x X]]\nb: *x` parse to the same properties as before 7c46f6bf (not `[]`)
- [x] The alias-as-inner-item behaviour is pinned by a test, and recorded in the ADR 0029 amendment if it differs from Rust `project_value`
- [x] YAML warnings are logged again
- [x] A panel edit on a note whose frontmatter fails to parse cannot drop the note's existing keys (a test, or a comment naming the existing guard)

## Notes

- **Not checked:** how the Rust side (yaml-rust2, Issue 26) projects these anchor and alias inputs, so whether Rust agrees with the old or the new TS result. Check it while writing the tests.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/41-anchored-wikilink-empties-frontmatter`: `foldUnquotedWikilinks` resolves aliases to scalar chains into copies before folding (anchors inside copies cleared), so anchored wikilinks no longer empty the frontmatter and `[[*x]]` / `[*l]` fold like Rust; YAML warnings are logged again; Properties panel edits refuse unparseable frontmatter (`isFrontmatterUnparseable` in `commitChanges`); four inputs pinned in the parity fixture; ADR 0029 amended. Review round 1: APPROVED (claude), with 2 minor + 3 nits; fixes: nested-anchor clearing + test, warning-test cache reset, ADR note on `maxAliasCount`, follow-up Issue 42 for the meta-bind writers. Tests: `pnpm vitest run` 9179 passed (379 files), `pnpm build` ok, `cargo test` 1141 passed, 0 failed.
