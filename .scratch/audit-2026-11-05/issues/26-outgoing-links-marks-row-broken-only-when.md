# 26: Outgoing links marks a row as broken only when its target is missing: same-note heading links and embeds of existing files are not red

**What to build:** extract_outgoing_links keeps every `[[...]]`, including embeds and `[[#Heading]]` with an empty target (src-tauri/src/vault/parsing.rs:1057-1105, target split at :1095-1104). lookup_outgoing_links resolves each through the VaultIndex (src-tauri/src/vault/index.rs:852-867 -> resolve_with_cache :151-159), which returns None for an empty target and can only resolve to indexed entries (.md/.markdown/.view, src-tauri/src/commands/vault.rs:310-318), so an existing image, PDF or canvas never resolves. OutgoingLinksPanel.svelte:82-89 renders every unresolved row with the warning icon in the destructive color, and deduplicateByTarget (src/lib/features/outgoing-links/outgoing-links.service.ts:25-34) folds all `[[#...]]` links into one row with an empty name. The editor itself resolves links against the whole file tree (src/lib/app/editor-host.ts:79 and :97-98), so the editor and the panel disagree. Fix direction: a link with an empty target and a heading resolves to the note itself (and dedupes by heading, not by the empty target); a target that is not a note resolves against the vault's files the way the editor does (resolveWikilinkCached over the file tree), so only truly missing targets are red.

**Blocked by:** 12

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Scope (owner, 2026-11-06):** frontend only, after Issue 12 (same file, outgoing-links.service.ts): after the IPC, resolve each unresolved target against fsStore.fileTree, map an empty target with a heading to the note itself, and dedupe by target plus heading. No Rust change.

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/outgoing-links/outgoing-links.service.test.ts: get_outgoing_links_v2 resolving [{ target: 'photo.png', resolvedPath: null }, { target: '', heading: 'Action Items', resolvedPath: null }, { target: 'Missing', resolvedPath: null }] for /v/A.md, with photo.png present in the vault file tree; after fetchOutgoingLinksV2, photo.png and the heading link have a resolvedPath and only 'Missing' is unresolved. It fails today. (If the fix lands in Rust, put the equivalent case in src-tauri/tests/vault_index_test.rs instead.)
- [ ] Two same-note links `[[#One]]` and `[[#Two]]` give two rows, labelled by heading, not one row with an empty name.
- [ ] Clicking a same-note heading row stays on the note; clicking an attachment row opens the file.
- [ ] A link to a note that does not exist is still red (existing OutgoingLinksPanel.test.ts case at :115 stays green).
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. Image embeds and [[#Heading]] links show as broken on every note that has them.
- **Trigger:** Open a note that contains `![[photo.png]]`, `![[doc.pdf]]`, `![[board.canvas]]` or a same-note heading link `[[#Action Items]]` (all documented in help 05) and expand Outgoing links.
- **Evidence (verified by reading code at `5f8003d67`):** src-tauri/src/vault/parsing.rs:1057 extract_outgoing_links scans every `[[`, so `![[x]]` is included; :1095-1104 `[[#H]]` -> target '' + heading -> src-tauri/src/vault/index.rs:852-867 resolved_path = self.resolve(&link.target) -> :151-159 empty target returns None; :161-176 lookups only in by_file_name / by_path, built from index entries -> src-tauri/src/commands/vault.rs:310-318 index membership is .md/.markdown/.view only -> src/lib/features/outgoing-links/outgoing-links.service.ts:25-34 dedupe by lowercase target merges every empty target -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:82-89 AlertCircle + text-destructive for any row without resolvedPath. help/documentation/07-sidebar-panels.md:90 says the warning means the target note does not exist; help/documentation/05-wikilinks.md:32 and :37 document `[[#Heading]]` and `![[image.png]]`.
- **Second opinion:** upheld (ux, medium). Confirmed. resolve_with_cache returns None for an empty target (index.rs:157-159). by_file_name and by_path are filled only from index entries (index.rs:421-428, :521-525), and index membership is .md/.markdown/.view only (vault.rs:310-318). So `![[photo.png]]` and `[[#Heading]]` never resolve, and OutgoingLinksPanel.svelte:82-89 draws them red. deduplicateByTarget (outgoing-links.service.ts:25-34) merges every empty target into one row. Wrong status shown, no data effect. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-04` (from index-spec-4). Size M.

## Comments

- 2026-11-06: scoped to the frontend and blocked by 12 by the owner after the challenge review.
