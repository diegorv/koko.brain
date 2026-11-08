# 063: Standard markdown images with a vault-relative path load from the vault

**Origin:** `audit-2026-11-05` Issue 18, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `ImageWidget.toDOM` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:157-165) resolves only `file:` URLs through `host.assetUrl`. Any other URL that passes `isSafeUrl` is assigned to `img.src` as is (:163-164), and `isSafeUrl` accepts any scheme-less string as a relative path (src/lib/utils/sanitize-url.ts:10-14). `assets/photo.jpg` therefore resolves against the webview origin, not the vault, and the image shows as broken alt text. Only `![[...]]` embeds resolve vault paths (`resolveImageEmbedAssetUrl`, widgets.ts:554-558). For a URL with no scheme, decode it (`%20` and similar), resolve it through the host the way `resolveImageEmbedAssetUrl` does (vault-relative, and relative to the note's folder if the host can supply it), and load it through `host.assetUrl`. When it cannot be resolved, mark the image missing the way `applyFileSrc` does. http(s), data and file: handling stays as it is.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: audit-2026-11-05 10.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts: with a fake EditorHost whose resolveLink('assets/photo.jpg') returns '/vault/assets/photo.jpg' and whose assetUrl maps it to 'asset://localhost/vault/assets/photo.jpg', new ImageWidget('assets/photo.jpg', 'Photo').toDOM(view) gives an img whose src is that asset URL. It fails today.
- [ ] `assets/my%20photo.jpg` resolves to the decoded path `assets/my photo.jpg`.
- [ ] A relative path the host cannot resolve adds cm-lp-image-missing and sets no src.
- [ ] http(s) URLs, file:// URLs and unsafe schemes behave as in the existing image-widget tests.
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. The documented ![](assets/x.png) form does not display. For the owner's vault, the resolved asset URL needs N-file-io-01's scope fix first.
- **Trigger:** Following help/documentation/04-markdown.md:184-198, or in notes brought over from Obsidian with markdown-style links, the user writes `![Photo](assets/photo.jpg)` or a reference-style `[img-ref]: assets/screenshot.png`, with the file inside the vault. The cursor is off the line.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:137-153 builds ImageWidget(url, ...) from the raw URL; widgets.ts:157-165 resolves only the file: branch through the host and otherwise sets img.src = this.url; src/lib/utils/sanitize-url.ts:10-14 treats a scheme-less path as safe; widgets.ts:554-558 is the only vault resolution, via host.resolveLink + assetUrl; src-tauri/tauri.conf.json:29 img-src allows asset:, so the asset URL loads; help/documentation/04-markdown.md:184-198,203-210 documents the relative form; widgets/image-widget.test.ts covers http(s) and file:// only.
- **Second opinion:** upheld (ux, medium). ImageWidget.toDOM (widgets.ts:157-165) routes only file: URLs through the host. A scheme-less path passes isSafeUrl and is assigned to img.src as-is, so it resolves against the webview origin. image-plugin.ts passes the raw URL through. help 04-markdown.md:184-198 documents `![Photo](assets/photo.jpg)` as vault-relative. The image does not display, and no data is affected. Corrections to apply while implementing: Category content -> ux. Once fixed, it also depends on N-file-io-01: the asset scope lacks ~/kokobrain-vaults, so a resolved asset URL would still be refused for the owner's vault.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-05` (from live-preview-ux-3, live-preview-spec-2). Size S.

## Comments
