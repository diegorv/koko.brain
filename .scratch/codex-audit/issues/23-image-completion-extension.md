# 23: Preserve non-Markdown extensions in wikilink completion

**What to build:** Selecting an image or other non-Markdown file inserts and displays its full filename so the editor routes it to the correct feature.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P2
**Gate:** Frontend with completion-to-render integration.

## Acceptance criteria

- [ ] Accepting the image suggestion for `photo.png` in an embed produces the extension-qualified image embed.
- [ ] Markdown-note completion continues inserting its stem.
- [ ] Same-stem Markdown and PDF candidates are distinguishable; selecting the PDF retains its extension.
- [ ] Alias options and original filename casing remain unchanged; exercise an uppercase image extension.
- [ ] Leave the completed image line and verify image routing/rendering through the production host without reading the image as note text.
- [ ] Add the failing real-completion test before changing behavior.
- [ ] Do not expand into same-filename folder disambiguation, handwritten extensionless embeds, binary-read guards, or new media formats.

## Provenance

Supersedes the full approved scope of [open-itens 064](../../open-itens/issues/064-wikilink-autocomplete-inserts-non-markdown-file-extension.md). A broken primary image-insertion flow, not a cosmetic improvement; lower priority than data-loss fixes. [Evidence](../evidence.md#markdown-images).
