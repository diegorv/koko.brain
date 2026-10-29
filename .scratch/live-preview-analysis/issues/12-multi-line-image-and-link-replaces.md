# 12: Multi-line images do not crash; wrapped link text stays styled

**What to build:** An image whose markdown spans a line break (`![a](\n/url)`, or `![a][r\ns]` when the reference resolves) renders as source instead of crashing the editor. The image plugin is a ViewPlugin and replaces the whole `Image` node with a widget (`plugins/image-plugin.ts:137,150`); CodeMirror does not allow a plugin replace decoration to cross a line break, so such a node can throw a `RangeError` (not reproduced; found by reading the code). Second, the guard added in `f7638b13` renders every multi-line `Link` as source. That is over-conservative for `[a\nb](/url)`, whose hidden ranges (`[` on line 1, `](/url)` on line 2) are each single-line and were safe; that case regressed from styled to raw. Skip only the replace ranges that would contain a newline.

**Context:** Post-merge adversarial review of `f7638b13` (issue 02 review fix), 2026-10-29. It found no defect in that commit; it flagged the image path as pre-existing and the wrapped-label case as a cosmetic regression. Evidence: `.scratch/live-preview-analysis/findings-2026-10-29.md`.

**Blocked by:** 05 (block-decorators-shared-reveal), which ports the image plugin to the shared reveal predicate.

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts` (modify; :137, :150)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts` (modify; multi-line guard)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test (mounted `EditorView`): `![a](\n/url)` and a multi-line resolved reference image render as source without throwing; written and seen failing first
- [ ] Test: `[a\nb](/url)` is styled again (no replace range contains a newline)
- [ ] Test: `[a](\n/url)` and the other multi-line shapes from `f7638b13` still do not throw

## Comments

- 2026-10-29 18:07 — discovery — plan in work/12/discovery.md: guard multi-line Image nodes, link handler skips only when a hidden range crosses a line — a5e16246
- 2026-10-29 18:11 — implement — multi-line images render as source (f3cdb3e7), wrapped link labels styled again (df9ced92); live-preview vitest 89 files/1181 tests pass, pnpm check 0 errors — df9ced92
- 2026-10-29 18:14 — review — VERDICT: APPROVED; all 3 criteria met, the 7 new tests fail on main's source (both image shapes throw the RangeError), no blocking findings (work/12/review.md) — b9a749c8
