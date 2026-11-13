# 04: `file.inFolder` takes a vault-relative folder

**What to build:** `file.inFolder("work/topics/AWS")` matches notes in that vault folder and its subfolders. Today it compares the note's absolute parent folder with a case-insensitive `startsWith` (`src/lib/features/collection/expression/evaluator.ts:572-575`). So a relative path never matches, and an absolute one also matches sibling folders: `/v/work` matches `/v/workshop`. The help page documents the trap (`help/documentation/12-collection.md:409-418`).

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. `EvalContext` (`evaluator.ts:11-16`) gets an optional `vaultPath?: string`. It is built at `collection.logic.ts:162` and `:183`, both inside `executeQuery(definition, view, index, rowSet)` (`collection.logic.ts:128-133`), and at `auto-move.logic.ts:25`.
   - `executeQuery` gets a **required** `vaultPath` parameter, so the type checker finds every caller: `CollectionView.svelte:268`, `collection-block-widget.ts:123` and `queryViewLens` (`lens.logic.ts:809`), plus `queryViewLens`'s own callers.
   - `findMatchingRule` takes it too. An optional parameter would let a caller forget it, and a relative `inFolder` would then silently match nothing in rail lenses and embedded collection blocks.
   - Logic files stay pure: the vault path arrives as an argument from the service or component that already has `vaultStore.path`.
2. `inFolder(arg)`:
   - trims a trailing `/`;
   - an argument that does not start with `/` is resolved against `vaultPath` (`${vaultPath}/${arg}`). Without `vaultPath`, a relative argument matches nothing;
   - an absolute argument keeps working;
   - a note matches when its folder equals the target or starts with `target + '/'`, compared case-insensitively. This also fixes the sibling match.
3. Same engine: Collection views, view filters and Auto Move rules all get the fix.

### Docs

`12-collection.md:409-418`: rewrite the section. A relative folder now works and is the recommended form. An absolute one still works, and siblings no longer match. Update the `file.inFolder(path)` table row (`:326`). In `22-auto-move.md`, use `file.inFolder("...")` in the folder examples.

### Acceptance

- [x] Failing test first, in the evaluator test file under `src/tests/lib/features/collection/expression/`: with `vaultPath: '/v'`, a note at `/v/work/topics/AWS/n.md` matches `file.inFolder("work/topics/AWS")` and `file.inFolder("work")`. It fails today.
- [x] `file.inFolder("/v/work")` does not match `/v/workshop/n.md`, and does match `/v/work/n.md`.
- [x] A trailing slash and different letter case still match.
- [x] A relative argument with no `vaultPath` matches nothing and does not throw.
- [x] A Collection query test passes a vault path through and filters by a relative folder.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- Touches `auto-move.logic.ts`, as Issue 01 does. Whichever lands second rebases onto the other.
- The owner chose vault-relative on 2026-11-10. Absolute arguments are kept so existing `.view` files do not break. Their sibling-folder matches do change.
- Research: `.scratch/frontmatter-rules/research/validation-02.md` M11, `completeness-critic.md` G5.

## Comments

- 2026-11-10, branch `issue/04-infolder-takes-vault-relative-folder`: `file.inFolder` resolves a relative argument against `EvalContext.vaultPath` and matches the folder or its subfolders only (no sibling prefix matches), ignoring case and a trailing slash. `executeQuery` and `findMatchingRule` take the vault path, passed by every caller. Docs updated. Full suite: 606 files passed, 14906 tests passed, 54 skipped, 1 todo (exit 0). Review round 1: APPROVED (two nits, both resolved with no change).
