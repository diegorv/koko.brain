# Fix wikilink image embeds (`![[image.png]]`)

Currently `![[image.png]]` does not render the image and clicking the source `[[...]]` token crashes the renderer. Two distinct bugs:

1. `WikilinkImageEmbedWidget.toDOM()` sets `img.src = this.target` directly, but `this.target` is a vault-relative path (e.g. `Resources/foo/bar.png`). The webview tries to resolve it against `tauri://localhost/...` and fails silently — empty image.
2. When the cursor is on an `![[image.png]]` line, the live-preview decorator falls back to source view. Clicking the underlying `cm-wikilink-target` span triggers `handleEditorClick`, which calls `openFileInEditor` on the PNG. `readTextFile` reads ~200 KB of binary as UTF-8, dumps it into CodeMirror, and the renderer process is killed (log just stops mid-decoration).

## Tasks

- [x] Task 1: Enable Tauri v2 asset protocol with a scope matching the existing `fs:allow-read-text-file` scope (`$DOCUMENT/**`, `$HOME/MyFiles/**`). This is the supported way to expose local files to `<img>` tags in Tauri 2; the CSP already permits `asset:` for `img-src`.
- [x] Task 2: Fix image-embed rendering. `WikilinkImageEmbedWidget` resolves the target via `resolveWikilink` against `fsStore.fileTree`, then converts the absolute path through `convertFileSrc` and sets the result on `img.src`. Show an inline error placeholder on resolution miss. Add unit tests for the resolution + conversion pipeline (mock `convertFileSrc` and `fsStore.fileTree`).
- [ ] Task 3: Stop the click crash. Add an `isImageEmbed(target)` guard in (a) `MarkdownEditor.svelte:handleEditorClick` before `openFileInEditor`, (b) `wikilink-navigation.ts:openWikilinkTarget`. Also add a defensive guard in `editor.service.ts:openFileInEditor` that rejects known binary extensions (image / audio / video / pdf) with a toast error, so any other call site is protected. Tests: clicking an image-target wikilink does not call `openFileInEditor`; `openFileInEditor` returns early for binary paths.

## Notes

- Out of scope: rendering `![alt](relative/path.png)` markdown images (same root cause but separate widget). Will mention as follow-up if it surfaces.
- Out of scope: making `![[audio.mp3]]` / `![[video.mp4]]` render — the parser only distinguishes `image | note` today.
- `parsers/image.ts` (the file the user pointed at) handles `![alt](url)` markdown images, not wikilink embeds. The actual wikilink-embed parser is `parsers/wikilink-embed.ts` and the widget is `WikilinkImageEmbedWidget` in `widgets.ts`.
