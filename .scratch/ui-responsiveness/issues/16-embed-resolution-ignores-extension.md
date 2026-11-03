# 16: `![[foo.png]]` resolves to the file it names, not to `foo.md`

**Status:** resolved

Priority: P3 (correctness; owner decision recorded)

**What to build:** Wikilink resolution strips the extension before matching (`getNoteName`, `src/lib/core/filesystem/wikilink-resolution.logic.ts:4-8,24-29`), so `![[foo.png]]` can resolve to `foo.md` when that path comes first. Pass 1 compares the extension-stripped basename with the full target and never matches a target with `/` or an extension (`:11-35`). For embeds and links that carry an extension, match the exact vault-relative path or exact file name first. `buildResolutionCache` keys on the stripped name, so this needs a second map (exact name or vault-relative path to absolute path).

Rule (owner decision): exact match first, with today's resolution as the fallback.

**Blocked by:** 03

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/filesystem/wikilink-resolution.logic.ts:4-67, src/lib/app/editor-host.ts:59-64

- [x] Owner decision recorded in Notes
- [x] Failing first: with `foo.md` before `foo.png` in the tree, `![[foo.png]]` resolves to `foo.png`
- [x] `[[foo]]` still resolves to `foo.md`; the existing wikilink-resolution tests stay green
- [x] Issue 03's memoized cache serves both maps from one tree identity

## Notes

- Owner decision (2026-11-03): exact match first, then today's rule as the fallback. A target with an extension resolves to that exact file when it exists; otherwise resolution behaves as today, so links that work now keep working.

- Parked by the synthesis, not filed as Issues (they wait for the owner or for data): headings in `NoteEntry` for the section query (A-F5, see Issue 02), dropping the eager startup tag build (C-4, use a `hasBuilt` flag, not `tagTree.length === 0`), dropping `filePaths` from `TagAggregate` (C-5, IPC DTO change), patching the semantic search cache in place (G-5), ORT memory tuning (G-6, gated on Issue 07's resource line).
- Research: `.scratch/ui-responsiveness/research/F-deep-dive.md` (fix 4), `F-verify.md`, `99-synthesis.md` section 4.

## Comments

- 2026-11-03, branch `issue/16-embed-resolution-ignores-extension`: a wikilink/embed target with an extension now resolves to the exact file it names (path-suffix match for path-style targets), falling back to today's note-name rule; one memoized tree build serves both maps. Review fixes: suffix precedence pinned by a test (follow-up Issue 17), Rust `VaultIndex` exact-first filed as Issue 18, `WikilinkResolutionCache` JSDoc, dotted-note-name precedence test, `counted` helper hoisted. Tests: `pnpm check` 0 errors; full suite `pnpm vitest run && pnpm build` exit=0, 449 files, 10302 passed, 1 skipped, 1 todo, build OK. Reviews: round 1 APPROVED (5 findings fixed), round 2 APPROVED (no findings).
