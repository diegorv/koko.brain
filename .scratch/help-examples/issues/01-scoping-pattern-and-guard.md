# 01: Folder-scoping pattern and a guard test for help/examples

**What to build:** Find the supported way to scope each query surface to the folder of the note that contains it, relative to that note: queryjs (`kb.pages`, `kb.ui.*`, the KBAPI in `kb-api.ts`), collection blocks (filters such as `file.folder` / `file.path` / `file.inFolder` or the closest equivalent), `.view` files and type-definition queries, kanban, auto-move rules and search examples. Write the pattern for each surface in `help/examples/SCOPING.md` (short, one snippet per surface). If a surface cannot express "this note's folder", say so there; do not add API in this Issue. Add a test that scans `help/examples/` for every query site and fails on one that has neither a folder scope nor an explicit limit, with an allowlist of the current offenders (one entry per file, each naming the folder issue that removes it). The test must pass on landing.

**Context:** The examples were written to run as the `help` vault. The owner copied them into a ~10,600-note personal vault on 2026-10-29: `markdown-editor-vault/24-queryjs-advanced.md` ("4. Status Cards", `kb.ui.statusCards`) listed 3023 personal notes, and `markdown-editor-vault/20-collection.md` froze the app (the freeze is also guarded by `.scratch/live-preview-analysis` issue 17, a row cap; both are needed). Goal for every folder: the examples behave the same whether the folder is its own vault or nested anywhere in a large vault, scoped to their own folder by a path relative to the note, keeping each example's intent.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `help/examples/SCOPING.md` (new)
- `src/tests/` (new guard test)
- Read only: `src/lib/plugins/queryjs/` (KBAPI), `src/lib/features/collection/`, type-definitions, kanban, auto-move

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `SCOPING.md` documents the scoping pattern (or the gap) for every query surface used in `help/examples/`
- [ ] Guard test fails when an unscoped query is added to a non-allowlisted file (seen failing on a temporary unscoped fixture)
- [ ] Allowlist names, per file, the folder issue (02-07) that removes it

## Comments

- 2026-10-29 21:15 — discovery — patterns per surface and guard design in work/01/discovery.md; collection filters cannot reference the host note (gap) — pending
- 2026-10-29 21:17 — implement — SCOPING.md + guard test (12 pass, 45 allowlisted files mapped to 02-07; fails on a temp unscoped fixture); pnpm check 0 errors — b5f9a976 + this commit
