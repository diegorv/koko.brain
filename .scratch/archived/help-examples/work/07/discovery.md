# 07 discovery: auto-move, canvas, kanban and search-types

Template: issue 01 (`help/examples/SCOPING.md`, guard `src/tests/help/examples-scoping.test.ts`). These folders have no queryjs/collection blocks; only `auto-move-rules.json` is allowlisted (`examples-scoping.test.ts:25`).

## Files that change
- `help/examples/auto-move-features/auto-move-rules.json`: all five rules are vault-wide (`file.hasTag(...)`) with root destinations (`Archive/Projects`, `Cooking`, ...). Scope every expression with `file.folder.endsWith('/auto-move-features/Inbox')` and make destinations `{parent}/...` (SCOPING.md pattern; `resolveDestination` at `auto-move.logic.ts:101`). Bug rule: `{folder}/Bugs` (stays `Inbox/Bugs`).
- `help/examples/auto-move-features/README.md`: scope, large-vault note, vault-relative `excludedFolders`.
- `help/examples/kanban-features/*.kanban`: cards link `[[Release Plan]]`, `[[Weekly Review]]`, `[[OKRs]]`, ... Kanban resolves by basename only (`kanban.service.ts:61` -> `resolveWikilinkCached`, `backlinks.logic.ts:107`, first path wins), so in a large vault the linked-file preview shows the owner's own "Weekly Review". Add six small notes under `kanban-features/notes/` with `kanban-example-` basenames and link `[[kanban-example-x|Old Text]]` (alias keeps the card text). README gets the large-vault note.
- `help/examples/canvas-features/README.md`: file/image nodes are vault-relative (`FileNode.svelte:40`, `canvas-image.logic.ts:33`, JSON Canvas spec); `help/examples/canvas-features/...` only resolves in the help vault. Never reads other notes. Gap: document, no change to the `.canvas`.
- `help/examples/search-types/README.md` (new): corpus notes, use `path:search-types` in text mode. Gap: semantic and hybrid strip `path:` (`search.service.ts:157,255`) and search the whole vault.
- `src/tests/help/examples-scoping.test.ts`: drop the allowlist entry; add tests below.
- `help/examples/SCOPING.md`: Kanban section corrected (cards' wikilinks resolve by basename vault-wide), search gap.

## Plan (tasks = commits)
1. Auto-move: test first (real `findMatchingRule` + `resolveDestination` + `buildNoteRecord` on the real JSON): every rule, forced enabled, matches a catch-all note inside `<vault>/x/auto-move-features/Inbox` with a destination inside `x/auto-move-features/`, and matches nothing for the same note outside; each real Inbox note matches an enabled rule when nested. Then rules + README + remove allowlist entry.
2. Kanban: test that every card wikilink in `kanban-features/*.kanban` (real `extractCardWikilinks`) names a note inside the folder. Then notes + links + README.
3. Canvas + search-types READMEs, SCOPING.md updates.

## Prior art
- `src/tests/lib/features/auto-move/auto-move.logic.test.ts` (rules + records), the walk in `examples-scoping.test.ts`.

## Risks / defaults taken
- `endsWith('/auto-move-features/Inbox')` breaks if the folder is renamed or opened as its own vault root (documented in README; same limit as SCOPING.md).
- `excludedFolders` stay vault-relative root folders (harmless: they only prevent moves).
- Kanban: unique basenames are a convention, not a guarantee; kept card display text via aliases.
- Help-vault data (dates, names) untouched: nothing breaks without it.
