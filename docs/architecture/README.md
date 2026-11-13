# Architecture map

A snapshot of how the code is laid out: one page per module, saying what it owns, its key files, the modules it imports and is imported by, the IPC commands it calls or registers, its tests, and a diagram of its neighbors. It is a map for finding your way around, not a file-by-file reference.

[← Back to Documentation](../README.md)

## Where to read it

- **Published:** the `architecture` branch. `.github/workflows/architecture.yml` regenerates it on every push to main that touches the code, the tests or these docs. The index names the source commit, so in practice each such push adds one commit to the branch. The branch holds only the generated pages, `graph/modules.json` and graphify's `graphify/` folder (`graph.html`, `graph.json`, `GRAPH_REPORT.md`).
- **Locally:** `node scripts/architecture-map.mjs` writes the same pages to `docs/architecture/generated/` (gitignored) in under a second. `node scripts/architecture-map.mjs --check` only checks the docs against the code.
- **graphify locally:** with Python 3.12 or newer (the pinned numpy and networkx need it), install it from the pinned list (commands in `scripts/architecture-graphify.sh`), run `bash scripts/architecture-graphify.sh docs/architecture/generated`, then `graphify query "<question>" --graph docs/architecture/generated/graphify/graph.json`, or `graphify path A B`, or `graphify explain X`. It reads the committed tree, not uncommitted edits.

## What is in this folder

This folder holds the prose a script cannot derive. Everything else on the published pages comes from the code.

| Path | Contents |
|---|---|
| `overview.md` | Shape of the system, main flows, where to start |
| `groups/<group>.md` | One paragraph per group: `core`, `features`, `plugins`, `frontend-root`, `rust` |
| `modules/<repo path>.md` | One doc per module, at the module's own path. Frontmatter `summary:` (one line), then Responsibility, Key files, State, Collaborators, Subfolders, Gotchas |

A module is one folder of `src/lib/core`, `src/lib/features` or `src/lib/plugins`; each other `src/lib` layer (`app`, `contracts`, `utils`, `types`, `components`); `src/lib/utils.ts`; `src/routes`; the Rust crate root files (`src-tauri/src.md`); and each folder of `src-tauri/src`. A doc for a folder inside a module makes that folder a module of its own, as the live-preview docs do.

## Keeping it current

`src/tests/lib/architecture/architecture-map.test.ts` fails when:

- a module folder has no doc (write `modules/<path>.md`);
- a doc's module folder is gone (delete or move the doc);
- a doc has no `summary:`;
- a doc names a repo path in backticks that does not exist (paths with placeholders such as `<feature>` are skipped).

So adding, renaming or removing a module means updating its doc in the same change. Write docs the way the existing ones are written: what the code does now, repo-relative paths in backticks, no file counts, line numbers or dates, since those go stale and the generator adds the counts itself.
