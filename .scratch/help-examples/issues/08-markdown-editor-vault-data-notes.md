# 08: markdown-editor-vault has its own data notes

**What to build:** The query sections in `help/examples/markdown-editor-vault/` (collection blocks in `20-collection.md`, queryjs in `22-queryjs.md`, `23-queryjs-real-scripts.md`, `24-queryjs-advanced.md`) show real rows when the folder is opened on its own or copied into any vault. Since issue 03 scoped them to the folder, they render empty, because the folder holds no notes with the properties they query. Add a small set of data notes inside the folder (for example a `data/` subfolder, around 10-15 notes) with the frontmatter the examples use: `status`, `priority`, `progress`, `assignee`, `due`, tags such as `bug` / `meeting` / `pessoal`, dates. Each section's "ESPERADO" text should then describe what those notes produce. Keep the notes obviously fake and self-describing.

**Context:** Owner decision 2026-10-29 (option A after issue 03): without data, the query examples no longer show what they do.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `help/examples/markdown-editor-vault/` (new data notes; modify ESPERADO texts)

**Gate:** examples only: `./node_modules/.bin/vitest run src/tests/help` (the scoping guard). No `pnpm check` / `pnpm build`.

- [ ] Every collection and queryjs section in the four notes has at least one matching data note, and its ESPERADO text matches
- [ ] The scoping guard still passes (data notes add no unscoped query)
