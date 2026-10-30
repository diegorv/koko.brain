# 01: Example notes work inside any vault, scoped to their own folder

**What to build:** Every example under `help/examples/` behaves the same whether its folder is opened as its own vault or copied anywhere inside a large personal vault. Today the queries in the examples assume the example folder is the whole vault, so inside a real vault they read every note. Seen 2026-10-29 by the owner after copying the examples into a ~10,600-note vault:
- `markdown-editor-vault/24-queryjs-advanced.md`, section "4. Status Cards — kb.ui.statusCards": "All Items by Status (3023)", listing personal clippings.
- `markdown-editor-vault/20-collection.md`: an unfiltered "All Notes" block and several near-unfiltered ones froze the app (the freeze itself is issue 17 in `.scratch/live-preview-analysis`; this Issue fixes the examples).

Review every file under `help/examples/` (queryjs, collection, `.view`, `.canvas`, kanban, templates, type definitions, search examples, auto-move rules, triada, markdown-editor-vault, live-preview-regressions) and make each query, collection filter, view and rule select only notes inside its own example folder, using a path relative to the note itself where the API allows it, so the folder can live at any depth. Where an example only makes sense as its own vault, say so at the top of the note. Where a scope is not expressible with today's API, keep the example, add an explicit limit, and list the gap in the closing commit. Keep each example's intent; replace data that only makes sense in the help vault (dates, names) only when the example breaks without it.

**Context:** The examples were written to run as the `help` vault. Copied into a personal vault they produce thousands of rows, slow or freeze the editor, and show unrelated personal notes, so they stop being useful as tests or as documentation.

**Blocked by:** None (can start immediately). Do not depend on live-preview-analysis issue 17 (collection row cap); both are needed.

**Status:** ready-for-agent

**Touches:**
- `help/examples/**` (modify)
- Read only: the queryjs API (`kb-api.ts`, `kb.pages` / `kb.ui.*` scoping), collection query filters (`file.folder`, `file.path`, `file.inFolder` or equivalent), `.view` and type-definition query syntax, to find the supported way to scope by folder

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only; also run any test that loads files from `help/examples/`)

- [ ] Every queryjs block, collection block, `.view` file and rule in `help/examples/` is scoped to its example folder, or the note states why it is not
- [ ] Scoping works when the folder is nested (relative to the note, not a hard-coded vault path)
- [ ] A test or script lists every query site in `help/examples/` and fails on one with no folder scope or explicit limit
- [ ] Manual check recorded in the closing commit: copied into a large vault, `24-queryjs-advanced.md` and `20-collection.md` list only example notes
