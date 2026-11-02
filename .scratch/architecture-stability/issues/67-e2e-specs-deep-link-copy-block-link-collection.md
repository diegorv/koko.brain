# 67: E2E specs for deep links, copy-block-link and collection blocks

**What to build:** Issue 66 (squash 6edd5ee6) moved three paths behind app-level wiring, and none of them has an E2E spec, so only unit tests cover them (`e2e/specs/` has 41 specs; only `note-action-bar.spec.ts` and `table-of-contents.spec.ts` touch what 66 moved). Add three specs that drive the real UI:
- **Deep links** (`e2e/specs/deep-link.spec.ts`). `e2e/mocks/tauri-deep-link.ts` never delivers a URL today: `onOpenUrl` drops its handler and `getCurrent()` returns `null`. Let a spec deliver one, for example by keeping the registered handlers and exposing a test-only `window.__e2eOpenDeepLink(urls)`, or by letting `getCurrent()` return URLs a spec seeds before load. Then cover `open` (an existing note opens in a tab), `new` (a note is created and opened), `daily` (today's daily note opens, created when missing, in the periodic-notes folder) and one `capture` kind (`note`: the note lands at the capture path with the expected title). Take the URI shapes from `src/lib/features/deep-link/deep-link.logic.ts`.
- **Copy-block-link** (`e2e/specs/copy-block-link.spec.ts`). From the editor context menu, "Copy link to block" and "Copy block embed" (`MarkdownEditor.svelte:418-423`) put the expected `[[note#^id]]` / `![[note#^id]]` text on the clipboard and write the `^id` block marker into the note. Use the clipboard pattern from `note-action-bar.spec.ts:135-141` (`grantPermissions`, `navigator.clipboard.readText()`).
- **Collection blocks** (`e2e/specs/collection-block.spec.ts`). A note with a fenced collection block renders its rows from the seeded vault, and the rows update after a note the query matches changes (the rebuild signal Issue 66 moved behind the block renderers).

Assert on rendered content (CLAUDE.md rule 8), not on container existence.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Files:** e2e/specs/,e2e/mocks/tauri-deep-link.ts,e2e/fixtures/

**Source:** delivery report of Issue 66, 2026-11-01: its E2E criterion stayed unticked because no deep-link, copy-block-link or collection spec exists.

- [x] `deep-link.spec.ts` covers `open`, `new`, `daily` and a `capture` note through a URL the mock delivers, asserting the opened tab and the note's content
- [x] `copy-block-link.spec.ts` checks the clipboard text of both menu items and the `^id` marker written into the note
- [x] `collection-block.spec.ts` checks the rendered rows, and that they change after a matching note changes
- [x] Each new spec fails when the path it covers is broken (check by a scratch revert of one wiring line, not committed)
- [ ] The full E2E suite passes

## Notes

- **Size:** M. One commit per spec.
- Run E2E only through `bash scripts/e2e.sh` (CLAUDE.md), one run at a time.

## Comments

- 2026-11-01, branch `issue/67-e2e-specs-deep-link-copy-block-link-collection`: added `e2e/specs/deep-link.spec.ts` (open, new, daily, capture note), `e2e/specs/copy-block-link.spec.ts` (both menu items, clipboard and `^id` marker) and `e2e/specs/collection-block.spec.ts` (rows and their rebuild); the deep-link mock now keeps `onOpenUrl` handlers and exposes `window.__e2e.deepLink.open`. Tests: the 8 new E2E tests pass; full suite `pnpm vitest run` 416 files, 9811 passed, 1 skipped, 1 todo, and `pnpm build` passed (exit=0, test-logs/architecture-stability/67-deliver.log). Review round 1: APPROVED. Its major finding (event-calendar specs emit the old `vault-index-updated` shape, red on main since Issue 65) is deferred to a follow-up Issue, so "The full E2E suite passes" stays unticked; nit 2 declined; nit 3 checked by a scratch break (both collection tests fail without `collectionBlockRenderer`).
