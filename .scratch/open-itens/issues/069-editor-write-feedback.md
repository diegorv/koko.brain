# 069: Small `.view` tab write feedback

**Origin:** `view-engine-fixes` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:**
- **Refused tab rename is silent.** `renameView` returns the input for an empty, unchanged or duplicate name (`src/lib/features/collection/yaml-parser.ts:388-407`), and the tab just snaps back (`commitTabRename`, `CollectionView.svelte:470-477`). Show why: "Another view is named …".
- **`addView` repeats `Untitled`** with no duplicate check (`yaml-parser.ts:344-356`). A second Untitled view can never be the `_rail_view` (first match wins). Pick `Untitled 2`, `Untitled 3`, ...
- **`limit` accepts non-integers.** `.nan` passes and applies no limit, `.inf` returns everything, `2.5` keeps 2 (`yaml-parser.ts:86-88`). Require a finite integer of at least 1, with the existing message.

**Blocked by:** 013

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/yaml-parser.test.ts`: two `addView` calls give distinct names; `limit: .inf`, `.nan` and `2.5` fail the parse.
  - `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`: a duplicate rename renders the message.

## Notes

- **Run after (other feature):** view-editor 02 (`yaml-parser.ts`), and **before** view-editor 05, so 05's limit field never meets a non-integer value. relay-lite does not enforce this.
- Blocked by 07 only because both edit `CollectionView.svelte`.
- A file with `limit: 2.5`, `.inf` or `.nan` that parses today shows a parse error after this (owner decision below).
- **Size:** S.

## Comments

- 2026-11-06, owner decision: `limit` must be a finite integer of at least 1; `2.5`, `.inf` and `.nan` become a parse error.
