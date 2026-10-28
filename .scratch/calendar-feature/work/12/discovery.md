# 12 discovery: detectLossyFrontmatter

## Files that change

- `src/lib/features/properties/properties.logic.ts`: import `parseDocument`, `visit`, `isMap`, `isSeq`, `isCollection`, `isScalar`, `isAlias` from `yaml` (`:1`); add exported `LossyFrontmatterReason` and `detectLossyFrontmatter(content)` right after `parseFrontmatterProperties` (`:169-173`). Reuses `extractRawFrontmatter` (`:13`), `canonicalizeKey` and `isEmptyPropertyValue` (`:176`, hoisted).
- `src/tests/lib/features/properties/properties.logic.test.ts`: new `describe('detectLossyFrontmatter')` (one case per reason, the non-cases) and a fixture-driven round-trip describe, appended after `round-trip: parse -> serialize -> rebuild` (`:722-776`).

## Plan

1. Tests first (red: export missing), then the function, one feat commit (the ticket asks for one).
2. Algorithm: `raw = extractRawFrontmatter`; null or whitespace-only -> null. `parseDocument(raw, { uniqueKeys: false })`; `errors.length > 0` or contents neither null nor `YAMLMap` -> `unparseable`. One `visit` pass collects flags; return the first in the listed order (`unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`).
   - nested: any `YAMLMap` other than the root; any collection whose nearest collection ancestor is a `YAMLSeq`.
   - comments: `doc.commentBefore` / `doc.comment`, plus `comment` / `commentBefore` on every visited node (root map and pair keys included, per the Task 1 (d) probe).
   - duplicate-keys / alias-collision: walk the root map's `items`; raw key seen twice -> duplicate; canonical key seen twice with both values non-empty (`null`, `''`, `[]` count as empty, matching `dedupeCanonicalKeys`) -> collision.
   - anchors: any node with `anchor`, or any `Alias` node.

## Prior art

- Round-trip describe at test `:722`; cache reset via `_resetParseFrontmatterCache`; `appendLog` is already mocked at `:3-5`.

## Defaults for open questions

- Task 1 (d) answered yes, so the `parseDocument` + `visit` path is used (no raw-line fallback).
- A comment-only block (contents null, comment on doc) returns `comments`, not `unparseable`: it is a mapping-less empty block whose only content would be dropped.
- A non-scalar (collection) key on the root map is reported as `nested`: the parse stringifies it, so the rewrite would lose it. Not in the ticket list; one extra condition.
- Explicit tags (`!!str 1`) are not reported: the ticket does not list them and the round-trip compares parsed values, which match.

## Risks

- Reason precedence only matters for multi-reason blocks; tests use single-reason inputs.
- The round-trip normalizer must mirror `dedupeCanonicalKeys` (placeholder loses to populated) to pass the `color: ''` + `_color: red` fixture.
