# 178: Images and embeds load

**Origin:** `ios-app` Issue 06, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** In the browser, images and embedded files inside notes show up as they do on the desktop: `![[image.png]]`, markdown images, PDF embeds, audio and video players. The files come from the Mac through the host, never from outside the vault, and no other web page can use the host to probe the vault.

**Blocked by:** 175, 177

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] An asset endpoint on the host serves a vault file by vault-relative path, through the containment from 03 and the same access rules as the page (and the identity rule from 04 once that is merged)
- [ ] Cross-site requests are refused (`Sec-Fetch-Site` other than `same-origin`, or a foreign `Origin`), so a page open in another tab on the Mac cannot test which vault files exist through `<img>` load and error events
- [ ] The stand-in's `convertFileSrc` maps a vault path to that endpoint, so the existing image and embed code works unchanged
- [ ] Only images (not SVG), audio, video and PDF are served inline. Everything else, `.html` and `.svg` included, is served with `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`; nothing is sniffed into `text/html`. Reason: on the desktop assets come from a separate origin, in the browser they share the app's origin
- [ ] The page CSP from 01 allows what the desktop's embeds need (for example `frame-src` / `object-src` `'self'` for PDF embeds), and nothing more
- [ ] Tests: `.kokobrain/**` and paths outside the vault refused; an `.html` asset gets the sandbox and attachment headers; a cross-site request refused

## Owner check (not an acceptance criterion; recorded here after delivery)

A note with a wikilink image, a markdown image, a PDF embed and a video shows all four in Mac Safari and on the iPad.

## Notes

- No HTTP Range support yet: video plays but may not seek. Range and ETag are in `research/next-phases.md`.
- Known desktop gaps (relative `![](x.png)`, binary `![[x.pdf]]` read as text, raw `<video>` src; proposal fix track X2-X4) are out of scope: the browser behaves like the desktop, gaps included.
