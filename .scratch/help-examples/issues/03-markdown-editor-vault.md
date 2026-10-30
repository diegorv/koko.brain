# 03: Scope markdown-editor-vault and live-preview-regressions examples

**What to build:** Review every file in the folder. Scope each query, collection block, `.view` file, filter and rule to the example folder with the pattern from issue 01; remove the folder's entries from the guard's allowlist. Where an example only makes sense as its own vault, say so at the top of the note. Where scoping is impossible with today's API, keep the example with an explicit limit, keep it in the allowlist with a reason, and list the gap in the closing commit. Replace help-vault-only data (dates, names) only when the example breaks without it. Includes `20-collection.md`, `22-queryjs.md`, `23-queryjs-real-scripts.md`, `24-queryjs-advanced.md` (owner-reported) and `help/examples/live-preview-regressions/`.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** 01 (scoping-pattern-and-guard)

**Status:** ready-for-agent

**Touches:**
- `help/examples/markdown-editor-vault/**` (modify)
- `help/examples/live-preview-regressions/**` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `24-queryjs-advanced.md` section 4 counts only notes in the example folder
- [ ] Every collection block in `20-collection.md` is scoped to the folder
- [ ] Allowlist entries for these folders removed

## Comments

- 2026-10-29 21:28 — discovery — scope every block to markdown-editor-vault (QueryJS relative to the note, collection by folder name); live-preview-regressions has no vault reads — pending
