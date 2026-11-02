# 05: Images and embeds load

**What to build:** In the browser, images and embedded files inside notes show up as they do on the desktop: `![[image.png]]`, markdown images, PDF embeds, audio and video players. The files come from the Mac through the host, never from outside the vault.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend).

- [ ] An asset endpoint on the host serves a vault file by vault-relative path, through the same containment and the same access rules as the page (loopback, or the Tailscale identity from 03 when that is merged)
- [ ] The bridge stand-in's `convertFileSrc` maps a vault path to that endpoint, so the existing image and embed code works unchanged
- [ ] Only images (not SVG), audio, video and PDF are served inline. Everything else, `.html` and `.svg` included, is served with `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`; nothing is sniffed into `text/html`. Reason: on the desktop assets come from a separate origin, in the browser they share the app's origin
- [ ] `.kokobrain/**` and paths outside the vault are refused (tests)
- [ ] Manual check, recorded here: a note with a wikilink image, a markdown image, a PDF embed and a video shows all four in Mac Safari and on the iPad

## Notes

- No HTTP Range support yet: video plays but may not seek. Range and ETag are a later ticket.
- Known desktop gaps (relative `![](x.png)`, binary `![[x.pdf]]` read as text, raw `<video>` src; proposal fix track X2-X4) are out of scope: the browser should behave like the desktop, gaps included.
