# 04: Scope collection-features examples to their folder

**What to build:** Review every file in the folder. Scope each query, collection block, `.view` file, filter and rule to the example folder with the pattern from issue 01; remove the folder's entries from the guard's allowlist. Where an example only makes sense as its own vault, say so at the top of the note. Where scoping is impossible with today's API, keep the example with an explicit limit, keep it in the allowlist with a reason, and list the gap in the closing commit. Replace help-vault-only data (dates, names) only when the example breaks without it.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** 01 (scoping-pattern-and-guard)

**Status:** ready-for-agent

**Touches:**
- `help/examples/collection-features/**` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] No collection block or `.collection`/`.view` file in the folder reads notes outside it, or it is allowlisted with a reason
- [ ] Allowlist entries for this folder removed

## Comments

- 2026-10-29 21:26 — discovery — plan: folder-name filter (endsWith) on every collection definition, drop 15 allowlist entries — 28a8cf0c
- 2026-10-29 21:28 — implement — every valid collection definition scoped with file.folder.endsWith("/collection-features"), 15 allowlist entries removed; guard 15/15, pnpm check 0 errors — 100d33c9
- 2026-10-29 21:31 — review — CHANGES_REQUESTED: nested or:/not: under and: renders 0 rows via the toolbar round-trip (sprint-board, filtros-avancados #3/#4); use sibling and:+or:/not: keys and guard it — d1468223
