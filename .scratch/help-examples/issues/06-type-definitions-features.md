# 06: Scope type-definitions-features views to their folder

**What to build:** Review every file in the folder. Scope each query, collection block, `.view` file, filter and rule to the example folder with the pattern from issue 01; remove the folder's entries from the guard's allowlist. Where an example only makes sense as its own vault, say so at the top of the note. Where scoping is impossible with today's API, keep the example with an explicit limit, keep it in the allowlist with a reason, and list the gap in the closing commit. Replace help-vault-only data (dates, names) only when the example breaks without it. The `.view` files (`active-projects.view`, `recent-meetings.view`) are the main query sites here.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** 01 (scoping-pattern-and-guard)

**Status:** ready-for-agent

**Touches:**
- `help/examples/type-definitions-features/**` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Both `.view` files list only notes in the folder, or are allowlisted with a reason
- [ ] Allowlist entries for this folder removed

## Comments

- 2026-10-29 21:27 — discovery — two .view filters are the only sites; plan: endsWith folder scope + render-path test — (this commit)
- 2026-10-29 21:28 — implement — both .view filters scoped with file.folder.endsWith, recent-meetings file.created -> file.ctime, allowlist entries removed; check 0 errors, help + type-definitions tests 321/321 — 221f4d7b
- 2026-10-29 21:31 — review — APPROVED: both .view filters scoped, allowlist entries removed, new render-path test red on main / green here; 2 low + 3 info findings, none blocking — (this commit)
