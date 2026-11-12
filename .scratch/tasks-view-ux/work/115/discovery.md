# 115 discovery: the Tasks heading rule runs in TS

## Files that change

- `src/lib/features/tasks/task-headings.logic.ts` (new): `headingChains` and `matchesHeading`. Imports only `findInlineTags` (`src/lib/utils/tag-extraction.ts:117-129`) and `type TaskHeadingV2` from `#lib/types/vault-v2.types.js:31` (Issue 074's re-export of the generated `TaskHeading`; other `.logic.ts` files already import that module, e.g. `core/vault/vault-entries.logic.ts`). No new type named `TaskHeading*`.
- `src/tests/lib/features/tasks/task-headings.logic.test.ts` (new).

Nothing else: no caller (Issue 244 and 116 wire it), no store, service, view, Rust or e2e change.

## Plan

1. Stubs (`headingChains` returns `[]`, `matchesHeading` returns `false`) + the full test file, run it red on assertions. Commit.
2. Implement:
   - `headingChains(taskHeadings?: readonly TaskHeadingV2[] | null): string[][]`: one stack pass; pop while `top.level >= h.level`, push, `chains[i] = stack texts`. Fresh arrays per chain, input untouched.
   - `taskHeadingChain(chains, heading?: number | null)` is not added: the Issue names two exports only; callers index `chains[task.heading] ?? []` (Issue 244). The test does that lookup inline.
   - `matchesHeading(headings, tags, mode)`: normalize tags (trim, add `#`, drop `''`/`'#'`); no active tag -> `true`. `'tag'`: lower-cased `findInlineTags(h).tag` equals `name` or starts with `name + '/'`. `'substring'`: `h.toLowerCase().includes('#' + name lower)`. Any tag x any heading.
   Run green. Commit.

## Prior-art tests

- Fixture import: `src/tests/e2e/task-headings-parity.test.ts:2` (`import parity from '../fixtures/task-headings-parity.fixture.json'`); from `src/tests/lib/features/tasks/` the path is `../../../fixtures/...`. Case "frontmatter comment and fenced lines are not headings" gives A (`A #to-list`), B (`B`), C (`C`).
- Style: `src/tests/lib/features/tasks/task-status.logic.test.ts` (`it.each`).

## Defaults taken

- `headingChains` accepts `undefined`/`null` input as `[]` (074 ships `taskHeadings?:`).
- Tag compare lower-cases with `toLowerCase()` (the Rust section match and `extractAllTags` dedupe use the same simple fold).
- `'substring'` mode normalizes tags the same way (trim, add `#`, inactive when empty).

## Risks

- `findInlineTags` first char is `[\p{L}_]`: a digit-first filter tag (`#2026`) never matches in `'tag'` mode. Same as the note tag rule; not in the Issue's cases.
- Architecture tests (`pure-logic`, `layer-rules`, `feature-cycle`, `ipc-mirrors`) must stay green with no baseline or allowlist change.
