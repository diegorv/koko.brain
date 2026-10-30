# 02: Scope queryjs-features examples to their folder

**What to build:** Review every file in the folder. Scope each query, collection block, `.view` file, filter and rule to the example folder with the pattern from issue 01; remove the folder's entries from the guard's allowlist. Where an example only makes sense as its own vault, say so at the top of the note. Where scoping is impossible with today's API, keep the example with an explicit limit, keep it in the allowlist with a reason, and list the gap in the closing commit. Replace help-vault-only data (dates, names) only when the example breaks without it.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** 01 (scoping-pattern-and-guard)

**Status:** ready-for-agent

**Touches:**
- `help/examples/queryjs-features/**` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] No queryjs block in the folder reads notes outside it, or it is allowlisted with a reason
- [ ] Allowlist entries for this folder removed

## Comments

- 2026-10-29 21:27 — discovery — plan: scope 21 reads via kb.current().file.folder, own-vault note on kb.view callers, drop 02 allowlist — (this commit)
- 2026-10-29 21:31 — implement — 20 reads scoped to the folder, allowlist entries for 02 removed, kb.view paths resolve as own vault (nested: API gap, noted in the 4 notes); help tests 28/28, pnpm check 0 errors — a6f8d4a7
- 2026-10-29 21:36 — review — APPROVED: no out-of-folder reads (30 scripts x 4 callers x 2 layouts + 18 inline blocks probed), 02 allowlist gone; 2 low findings, non-blocking — 4f5ba9d2
