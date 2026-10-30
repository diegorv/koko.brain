# 07: Review auto-move, canvas, kanban and search-types examples

**What to build:** Review every file in the folder. Scope each query, collection block, `.view` file, filter and rule to the example folder with the pattern from issue 01; remove the folder's entries from the guard's allowlist. Where an example only makes sense as its own vault, say so at the top of the note. Where scoping is impossible with today's API, keep the example with an explicit limit, keep it in the allowlist with a reason, and list the gap in the closing commit. Replace help-vault-only data (dates, names) only when the example breaks without it. These folders have no queryjs/collection blocks, but rules and examples can still act vault-wide: `auto-move-features/auto-move-rules.json` must never move notes outside the example folder, kanban boards must only reference their own notes, and search examples must say which results come from the example folder.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** 01 (scoping-pattern-and-guard)

**Status:** ready-for-agent

**Touches:**
- `help/examples/auto-move-features/**`, `canvas-features/**`, `kanban-features/**`, `search-types/**` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Auto-move rules match only paths inside the example folder (test or documented check)
- [ ] Each folder's README states what to expect inside a large vault
- [ ] Allowlist entries for these folders removed

## Comments

- 2026-10-29 21:27 — discovery — plan in work/07/discovery.md: scope auto-move rules, kanban links to own notes, README large-vault notes — 28a8cf0c
