# 056: Cmd+click on a reference link or an email autolink opens its target, and a link with no openable URL is not sent to the opener

**Origin:** `audit-2026-11-05` Issue 43, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** handleLivePreviewLinkMousedown (src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:17-41) gets the URL from findMarkdownLinkUrlAtPosition (parsers/link.ts:74-110), which needs a `URL` child (:88, :99) that a reference link lacks, so it falls back at click-handler.ts:30-32 to the link's textContent: the label 'this article', or the bare 'user@example.com'. isSafeUrl (src/lib/utils/sanitize-url.ts:10-13) accepts any scheme-less string as relative, so the label, the email and '#heading' or 'other.md' go to openExternal (src/lib/app/editor-host.ts:121-123, openUrl), which the opener rejects for anything outside http(s)/mailto/tel. The rejection only reaches reportError (click-handler.ts:38), so the user sees nothing and every click logs an error and a Sentry event. Fix direction: resolve a reference link's label to its `[ref]: url` LinkReference definition in the document; prefix an email autolink with `mailto:`; and only pass a URL with a scheme the opener accepts to openExternal. For anything else, do not call openExternal (falling through so the click places the cursor is a reasonable choice). Opening `[x](note.md)` as an internal note is a separate feature and out of scope.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts: with doc 'See [this article][ref1].\n\n[ref1]: https://example.com', posAtDOM inside the label and linkWithText('this article'), Cmd+click calls the host openExternal with 'https://example.com'; it fails today (called with 'this article').
- [ ] Cmd+click on `<user@example.com>` calls openExternal with 'mailto:user@example.com'.
- [ ] Cmd+click on `[x](#heading)` or `[x](other.md)` does not call openExternal and reports no error.
- [ ] Existing cases stay green: bare URL, inline markdown link, unsafe URL not opened, platform modifier rules.
- [ ] A reference link whose definition is missing does not call openExternal.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. These are documented link forms that are rarely used.
- **Trigger:** In a rendered line, Cmd+click a reference-style link `[this article][ref1]` or an email autolink `<user@example.com>` (both documented in help/documentation/04-markdown.md:144-165), or a scheme-less link such as `[x](#heading)` or `[x](other.md)`.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:42-45,54 styles reference links `[text][ref]` with cm-lp-link; inline/handlers/autolink-handlers.ts:10-17 styles `<email>` with cm-lp-link; click-handler.ts:19 matches .cm-lp-link; :27 findMarkdownLinkUrlAtPosition; parsers/link.ts:88,99 requires a URL child, absent for reference links; click-handler.ts:30-32 falls back to textContent; src/lib/utils/sanitize-url.ts:10-13 treats '#...' and scheme-less strings as safe; click-handler.ts:34-39 calls openExternal and sends a rejection to reportError; src/lib/app/editor-host.ts:121-123 openExternal = openUrl; src-tauri/capabilities/default.json:23 opener:default; help/documentation/04-markdown.md:135 'external links open in your default browser', :144-165 reference links and email autolinks.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-09` (from live-preview-spec-6). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). findMarkdownLinkUrlAtPosition (parsers/link.ts:74-110) needs a URL child, which a reference link does not have. click-handler.ts:30-32 then falls back to textContent. isSafeUrl (sanitize-url.ts:10-13) accepts scheme-less strings and '#...'. openExternal is openUrl (editor-host.ts:121-123), and a rejection reaches only reportError. These link forms are rare in daily use.

## Comments
