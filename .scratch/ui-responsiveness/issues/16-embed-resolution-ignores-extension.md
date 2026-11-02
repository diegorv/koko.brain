# 16: `![[foo.png]]` resolves to the file it names, not to `foo.md`

**Status:** needs-triage

Priority: P3 (correctness; needs an owner decision)

**What to build:** Wikilink resolution strips the extension before matching (`getNoteName`, `src/lib/core/filesystem/wikilink-resolution.logic.ts:4-8,24-29`), so `![[foo.png]]` can resolve to `foo.md` when that path comes first. Pass 1 compares the extension-stripped basename with the full target and never matches a target with `/` or an extension (`:11-35`). For embeds and links that carry an extension, match the exact vault-relative path or exact file name first. `buildResolutionCache` keys on the stripped name, so this needs a second map (exact name or vault-relative path to absolute path).

The owner decides the rule: exact match first with today's fallback, or exact only for targets with an extension.

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/filesystem/wikilink-resolution.logic.ts:4-67, src/lib/app/editor-host.ts:59-64

- [ ] Owner decision recorded in Notes
- [ ] Failing first: with `foo.md` before `foo.png` in the tree, `![[foo.png]]` resolves to `foo.png`
- [ ] `[[foo]]` still resolves to `foo.md`; the existing wikilink-resolution tests stay green
- [ ] Issue 03's memoized cache serves both maps from one tree identity

## Notes

- Parked by the synthesis, not filed as Issues (they wait for the owner or for data): headings in `NoteEntry` for the section query (A-F5, see Issue 02), dropping the eager startup tag build (C-4, use a `hasBuilt` flag, not `tagTree.length === 0`), dropping `filePaths` from `TagAggregate` (C-5, IPC DTO change), patching the semantic search cache in place (G-5), ORT memory tuning (G-6, gated on Issue 07's resource line).
- Research: `.scratch/ui-responsiveness/research/F-deep-dive.md` (fix 4), `F-verify.md`, `99-synthesis.md` section 4.
