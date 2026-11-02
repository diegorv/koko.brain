# Issue 67 discovery

## Files that change
- `e2e/mocks/tauri-deep-link.ts`: `onOpenUrl` keeps its handlers; `window.__e2e.deepLink.open(urls)` calls them (throws when none is registered, so a dropped listener fails loudly).
- `e2e/types/global.d.ts`: `deepLink` on `E2eAPI`.
- `e2e/specs/deep-link.spec.ts` (new), `e2e/specs/copy-block-link.spec.ts` (new), `e2e/specs/collection-block.spec.ts` (new).

## Paths under test
- Deep links: `src/routes/(app)/+layout.svelte` registers `registerDeepLinkListener`; `open`/`new` run in `deep-link.service.ts::executeAction`; `daily`/`capture` run through `registerDeepLinkActions` (`src/lib/app/boot.ts:49`, `src/lib/app/deep-link-actions.ts:184`). Vault name is `test-vault` (`vaultStore.open` -> recent vaults).
- Copy-block-link: `MarkdownEditor.svelte:416-424` menu items call `blockLinks.copyLink/copyEmbed`, wired by `appBlockLinks` (`src/lib/app/editor-host.ts:121`).
- Collection: `collectionBlockRenderer.rebuildOn` (`collection-block-widget.ts:386-392`) drives the editor's rebuild `$effect`.

## Plan
1. Mock + deep-link spec (one commit). `clockTime` 2026-11-10T10:00 Europe/Berlin. `open` Inbox -> tab + editor text; `new` `Projects/Deep Note` with `content` -> tab, editor text, file on disk; `daily` with `autoOpen: false` (seeded settings) and `content` -> `Daily/2026-11-10.md` created, tab active, content appended; `capture` `kind=note&v=2&tags=e2e` -> one file in `Daily/2026/11-Nov/` named `capture-note-2026-11-10_*.md` (default quickCapture formats; fixture has no `quickCapture` key), body = text, tags in frontmatter.
2. Copy-block-link spec: right-click a paragraph line in Welcome.md, each menu item, read clipboard (pattern `note-action-bar.spec.ts:135-141`), assert `[[Welcome#^id]]` / `![[Welcome#^id]]` and `^id` in the editor and, after Mod+S, in the saved file.
3. Collection spec: seed `Collection.md` with a block filtering `status == 'active'`, order `[file.name, status]`; rows = Roadmap only. Rewrite `Projects/2026-Q2.md` to `status: active` + emit `vault-files-changed` (watcher prior art: `kanban-view.spec.ts:14-24`); rows gain 2026-Q2 without touching the block's note.

## Prior art
`note-action-bar.spec.ts` (clipboard), `kanban-view.spec.ts` (watcher emit), `event-calendar-daily-note.spec.ts` (clockTime + timezoneId), `test-vault.ts` `vaultFiles` option.

## Risks / defaults
- "Expected title" for a `note` capture: no title is injected for kind `note`, so the title is the file name from the capture filename format; asserted by prefix regex (ms in the name are not deterministic).
- Scratch reverts (not committed): drop `registerDeepLinkActions()` from boot / the `+layout` listener; no-op `appBlockLinks.copyLink`; drop `rebuildOn` from the collection renderer.
- E2E uses port 1421: one `scripts/e2e.sh` run at a time.

## Found while building
- Full E2E run at 46a35558 (no `-x`): 262 passed, 36 failed, all in the five `event-calendar*.spec.ts` files. Each emits `vault-index-updated` without `removed`, the payload field Issue 65 (98ec341b) made `tauri-listeners.service.ts:258` iterate (`TypeError: payload.removed is not iterable`). Not caused by this Issue; left for a follow-up Issue, so the "full E2E suite passes" criterion is open.
