# 06: E2E case for clicking a row in an embedded collection block

**Status:** resolved

**Blocked by:** 02

Priority: P3 (test only; follow-up of Issue 02's review, finding 1)

**What to build:** Issue 02 (cd9527ee) made collection block rows, calendar pills and linear bars stop `mousedown`, so a click opens the note instead of revealing the block's YAML. Its tests run in jsdom with `view.posAndSideAtCoords` stubbed, so no real browser has exercised the fix. Add a Playwright case to `e2e/specs/collection-block.spec.ts`: open `Active.md` (the spec's existing collection block fixture), click the row of `Projects/Roadmap.md` in `.cm-lp-collection-block`, and assert that the Roadmap note's tab opens and that, back on `Active.md`, `.cm-lp-collection-block` is still rendered (not the raw ```` ```collection ```` source). Assert on rendered content, not only container existence (CLAUDE.md rule 8).

**Gate:** `bash scripts/e2e.sh e2e/specs/collection-block.spec.ts` (test-only change; run the spec, and the full E2E suite if the fixture changes)

**Source:** e2e/specs/collection-block.spec.ts, e2e/fixtures/test-vault.ts, src/lib/features/collection/collection-block-widget.ts, .scratch/live-preview-audit/work/02/review.md (finding 1)

## Acceptance criteria

- [x] The new case fails when the `mousedown` guard from cd9527ee is removed (check once by reverting it locally, then restore)
- [x] With the guard, clicking the row opens the note's tab and the collection block stays rendered with its rows
- [x] The rest of `collection-block.spec.ts` passes

## Comments

- 2026-11-03, a06cc54f (done in the main session, not through the relay; test-only): `e2e/specs/collection-block.spec.ts` 'clicking a row opens its note and the block stays rendered'. With `stopEditorMousedown` disabled locally it fails (the Roadmap tab never becomes active); with it, the spec passes 3/3 (`bash scripts/e2e.sh e2e/specs/collection-block.spec.ts`).
