# 064: Wikilink autocomplete inserts a non-markdown file with its extension, so ![[photo.png]] embeds the image

**Origin:** `audit-2026-11-05` Issue 19, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** buildFileCompletions (src/lib/core/markdown-editor/extensions/wikilink/completion.ts:71-82) labels and inserts `file.nameWithoutExt` for every candidate, and listLinkCandidates offers every non-.view file (src/lib/app/editor-host.ts:76-82 `treeLinkIndex`, :128-133 `listLinkCandidates`). Picking photo.png inserts `![[photo]]`. isImageEmbed (live-preview/parsers/wikilink-embed.ts:32-36) needs an extension, so this becomes a note embed; resolveLink('photo') then resolves by stem to photo.png (wikilink-resolution.logic.ts `buildResolutionCache` :109, `resolveWikilinkCached` :128) and loadEmbedContent reads the PNG with readTextFile (live-preview/widgets.ts:606-610), so the embed shows binary text instead of the image. Two files sharing a stem show as the same label. Fix direction: for a candidate that is not a markdown note, insert (and show) the full file name; keep the stem for .md notes. The change stays in `buildFileCompletions`; `loadEmbedContent` is not touched (see Notes).

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** approved by the owner on 2026-11-12 as a deep-dive addition to the queue. Nothing open.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in a new src/tests/lib/core/markdown-editor/extensions/wikilink/completion.test.ts (jsdom, like decoration.test.ts beside it): run wikilinkCompletionSource on '![[pho' with an editorHost whose listLinkCandidates returns photo.png, apply the first option; the doc is '![[photo.png]]'. It fails today ('![[photo]]').
- [ ] A .md note still inserts its name without .md ('[[Daily Notes]]').
- [ ] Report.md and Report.pdf appear as two distinguishable options, and picking the PDF inserts 'Report.pdf'.
- [ ] Alias options are unchanged.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. Picking an image from the popup inserts a stem that embeds as a note, a daily editor flow.
- **Trigger:** Type `![[pho`, pick photo.png from the popup, press Enter. Same for a PDF, or for Report.md and Report.pdf sharing a stem.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/filesystem/file-entries.logic.ts:19-21 nameWithoutExt -> src/lib/app/editor-host.ts:76-82 treeLinkIndex keeps all non-.view files, :128-133 listLinkCandidates (re-checked at `635b4af36`) -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:76-90 matches on file.name -> completion.ts:71-82 label/insert nameWithoutExt -> live-preview/parsers/wikilink-embed.ts:32-36,67 no extension => 'note' embed -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache (:109) stem key maps 'photo' to photo.png, resolved in resolveWikilinkCached (:128) -> live-preview/widgets.ts:606-610 host.readNote(photo.png) = readTextFile. Help: help/documentation/05-wikilinks.md shows image embeds with the extension. No test covers completion.ts (only completion.logic.test.ts).
- **Second opinion:** upheld (ux, medium). completion.ts:71-82 labels and inserts file.nameWithoutExt for every candidate. listLinkCandidates excludes only .view (isLinkTargetFile), so images and PDFs are offered by stem. isImageEmbed needs an extension, so `![[photo]]` becomes a note embed, and the stem key in buildResolutionCache resolves it to photo.png, which readTextFile then reads. Re-rated to ux: the bad text is the inserted link, the user sees the broken embed at once, and no existing content is corrupted. A plain `[[photo]]` link still resolves. Corrections to apply while implementing: Category content -> ux. The resolution evidence lines are wikilink-resolution.logic.ts:110-145 (the cache build is at :111-126 and the stem fallback is in resolveWikilinkCached), not exactly :113-118/:139.
- **Out of scope:** guarding `loadEmbedContent` (live-preview `widgets.ts`) against a binary file that a hand-typed `![[photo]]` resolves to by stem. That is live-preview code shared with 061, 062 and 063, and this fix does not need it.
- **Frequency (deep dive 2026-11-12, validate-s3+s4):** the editor has no image paste or drop handler that writes `![[x.png]]` (the only generator is `app/deep-link-actions.ts:114`), so the popup is the main in-app way to embed an image, and through it the embed always breaks.
- **Source:** audit 2026-11-05, domain `editor`, finding `N-editor-04` (from editor-spec-2). Size S.

## Comments

- 2026-11-12: deep dive (sweep-s3, validate-s3+s4) confirmed it at `635b4af36` and found no edit needed beyond pointers. Approved as an addition. The `editor-host.ts` and `wikilink-resolution.logic.ts` line pointers are updated, and the optional `loadEmbedContent` guard moved to Notes as out of scope.
