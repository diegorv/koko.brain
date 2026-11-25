# 24: Load relative Markdown images through the vault asset host

**What to build:** Scheme-less inline and reference-style Markdown image destinations resolve through the existing vault host and load as filesystem assets.

**Blocked by:** None (can start immediately).
**Status:** ready-for-agent
**Priority:** P2
**Gate:** Frontend plus native asset-loading verification in a supported vault.

## Acceptance criteria

- [ ] A vault-relative image destination resolves through the existing host and its asset-URL conversion rather than the application's web origin.
- [ ] Decode encoded path characters once before resolution, including spaces.
- [ ] An unresolved image is marked missing and receives no source.
- [ ] Preserve existing HTTP(S), file-URL, data-URL, and unsafe-scheme behavior; this does not enable currently rejected URL forms.
- [ ] Cover inline and reference-style images in a note opened from disk and through the external open entry point.
- [ ] Assert the chosen filesystem target and rendered asset, not only a converter call.
- [ ] Retain approved vault-relative semantics. Note-folder-relative behavior is conditional on existing host support; adding source-note context or new precedence is not required.
- [ ] Do not expand into out-of-vault access, nested rendering in note embeds, or move-invalidation redesign.

## Provenance

Supersedes [open-itens 063](../../open-itens/issues/063-standard-markdown-images-vault-relative-path-load.md). The old missing-default-vault asset-scope claim is stale and is not a blocker. [Evidence](../evidence.md#markdown-images).
