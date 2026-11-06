# 11: Small `.view` tab write feedback

**What to build:**
- **Refused tab rename is silent.** `renameView` returns the input for an empty, unchanged or duplicate name (`src/lib/features/collection/yaml-parser.ts:388-407`), and the tab just snaps back (`commitTabRename`, `CollectionView.svelte:470-477`). Show why: "Another view is named …".
- **`addView` repeats `Untitled`** with no duplicate check (`yaml-parser.ts:344-356`). A second Untitled view can never be the `_rail_view` (first match wins). Pick `Untitled 2`, `Untitled 3`, ...
- **`limit` accepts non-integers.** `.nan` passes and applies no limit, `.inf` returns everything, `2.5` keeps 2 (`yaml-parser.ts:86-88`). Require a finite integer of at least 1, with the existing message.

**Blocked by:** 06

**Status:** needs-info

**Needs human:** only the `limit` part. A file with `limit: 2.5`, `.inf` or `.nan` parses today and would show a parse error after this. The owner picks: make it an error, or keep accepting it (then drop that bullet and its test, and this Issue becomes ready-for-agent).

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/yaml-parser.test.ts`: two `addView` calls give distinct names; `limit: .inf`, `.nan` and `2.5` fail the parse.
  - `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`: a duplicate rename renders the message.

## Notes

- **Run after (other feature):** view-editor 02 (`yaml-parser.ts`) and view-editor 05 (its limit wording). relay-lite does not enforce this.
- A file with `limit: 2.5` that parses today will show a parse error after this. View-editor 05's dialog already shows such a limit as "acts as 2"; update that wording to the new rule.
- **Size:** S.
