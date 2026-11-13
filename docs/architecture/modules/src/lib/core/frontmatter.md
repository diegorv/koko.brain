---
summary: "Pure YAML frontmatter parsing, serialization and lossless checks, plus the single write path that rewrites a note's frontmatter by path."
---

## Responsibility

Owns the frontend frontmatter layer: turning a note's YAML block into typed Property values and back, deciding whether a rewrite would lose data (detectLossyFrontmatter), and rewriting a note's frontmatter whether the note is open in a tab or closed on disk. properties.logic.ts is the pure parse, serialize and relationship layer. frontmatter-write.service.ts is the side-effecting write path. yaml-quoting.logic.ts transcribes the scalar quoting rules the yaml library applies, for parity tests and for producers that must write the same canonical form. It does not own the Rust-side properties index, the Properties panel UI, or the editor autosave timers.

## Key files

- `src/lib/core/frontmatter/properties.logic.ts`: Parse with a small LRU cache, detectLossyFrontmatter and LOSSY_FRONTMATTER_MESSAGES, serializeProperties, rebuildContent, ensureFrontmatterLink, relationship helpers and the configurePropertiesDiagnostics sink.
- `src/lib/core/frontmatter/frontmatter-write.service.ts`: updateNoteFrontmatter, FrontmatterWriteError and toastFrontmatterWriteError for its failure reasons.
- `src/lib/core/frontmatter/properties.types.ts`: Property and PropertyType shapes shared by every consumer.
- `src/lib/core/frontmatter/yaml-quoting.logic.ts`: Scalar quoting predicate and canonicalizeScalar, used by todoist-sync pull logic.
- `src/lib/utils/frontmatter-aliases.ts`: Alias-to-canonical key map applied to every parsed key.

## State

- Module-level LRU parse cache in properties.logic.ts keyed by raw frontmatter text, reset in tests by _resetParseFrontmatterCache
- Module-level diagnostics sink in properties.logic.ts, a no-op until configurePropertiesDiagnostics is called from src/routes/(app)/+layout.svelte
- Alias-pass step counter read only by tests
- Closed-note writes go to disk through the Tauri fs plugin in frontmatter-write.service.ts; open-note writes go to the tab content and then saveFileByPath

## Collaborators

- `src/lib/core/editor`: frontmatter-write.service.ts reads the tab store, patches tab content with syncExternalContentToEditor, saves with saveFileByPath and runs notifyAfterSave after a closed-note write.
- `src/lib/core/vault`: Reads vaultStore.path to refuse a write when the vault changed since entry.
- `src/lib/core/markdown-editor`: Live-preview widgets, the table field and the meta-bind input plugin call parseFrontmatterProperties, rebuildContent and detectLossyFrontmatter.
- `src/lib/features`: Properties, collection, event-calendar, auto-organize, todoist-sync, file-icons, rail-shell, note-action-bar, type-definitions and deep-link use the parse, rebuild and write helpers.
- `src/lib/plugins`: The mods app and vault services call updateNoteFrontmatter; one-on-one and quick-capture use the logic helpers.
- `src/lib/app`: deep-link-actions.ts uses detectLossyFrontmatter and the write error helpers.
- `src/routes`: (app)/+layout.svelte calls configurePropertiesDiagnostics with appendLog.
- `src/lib/utils`: frontmatter-aliases.ts for key canonicalization and path.ts for file names in toasts.

## Gotchas

- updateNoteFrontmatter is the only raw write path for frontmatter by path: an open note is patched and saved through saveFileByPath, a closed note is written with create false and then notifyAfterSave runs. src/tests/lib/raw-write-ratchet.test.ts exempts this file by name.
- The mutate callback passed to updateNoteFrontmatter must be pure because it can run twice if a tab opens during the read. Concurrent calls on one closed note race, so callers must serialize writes per path.
- detectLossyFrontmatter gates every rewrite. Unparseable, nested, comment-bearing, duplicate-key, alias-collision and anchor notes are refused, and the refusal texts are shared through LOSSY_FRONTMATTER_MESSAGES.
- The parse cache is keyed only by the raw frontmatter text. A failed parse is cached as an empty array, so a malformed block returns no properties until its text changes.
- The alias pass throws once the copy budget is exceeded, so an oversized alias chain reads as unparseable rather than slow.
- serializeProperties with the original raw text keeps unchanged number and boolean spellings. Without it those values are written in canonical form.
- ensureFrontmatterLink throws on unparseable frontmatter, and on any other lossy frontmatter when it must rewrite an existing key, instead of returning content, so callers must handle the error.
- Until configurePropertiesDiagnostics is called the diagnostics sink is a no-op, which keeps the module pure in tests.
