---
summary: "Opens or creates a note from a template and routes the new-note write through Rust and applyNoteChange."
---

## Responsibility

Owns creating a single note from a template: openOrCreateNote opens the note if it exists, otherwise creates parent folders, expands the template, applies an optional buildContent rewrite, writes the file through Rust, indexes it, adds it to the tree, opens it and notifies note-created observers. loadNoteTemplate loads and expands template content. explicit-organization.logic.ts holds pure helpers that add the unorganized flag to new-note frontmatter when the setting is on, which callers apply before writing. It has no store and no state. It does not own index updates (core/filesystem), the disk write (Rust create_note), or tab state (core/editor).

## Key files

- `src/lib/core/note-creator/note-creator.service.ts`: openOrCreateNote, loadNoteTemplate and the NoteCreationOptions types.
- `src/lib/core/note-creator/explicit-organization.logic.ts`: withUnorganizedFlag and applyExplicitOrganization, imported directly by feature, plugin and app callers.
- `src/lib/core/filesystem/note-change.service.ts`: applyNoteChange, called with the create source after the write.
- `src/lib/core/editor/editor.service.ts`: openFileInEditor, called after creation or when the note already exists.
- `docs/agents/indexing-watcher-rules.md`: Invariants for the create source policy and the vault path passed on create.

## Collaborators

- `IPC:create_folder`: Creates the parent directory recursively before the note is written.
- `IPC:create_note`: Writes the note, refuses an existing path, and updates the Rust VaultIndex.
- `src/lib/core/filesystem`: applyNoteChange with the create source indexes the note in the TS consumers and the search legs without a second Rust update, and addToTree places the file in the tree without a rescan.
- `src/lib/core/editor`: openFileInEditor opens the note, markRecentSave marks the write as a self-save, and notifyNoteCreated fires after the tab opens.
- `src/lib/core/vault`: Reads vaultStore.path to decide whether a Markdown note gets a vault path for the search legs.
- `src/lib/utils`: template.ts expands the template expressions.
- `src/lib/plugins`: periodic-notes, templates, one-on-one, quick-capture and mods call openOrCreateNote and the explicit-organization helpers.
- `src/lib/features`: deep-link, type-definitions, auto-organize, rail-shell, note-action-bar and quick-switcher call openOrCreateNote, loadNoteTemplate or the explicit-organization helpers.
- `src/lib/app`: editor-host.ts, commands.ts and deep-link-actions.ts call openOrCreateNote or the explicit-organization helpers.

## Gotchas

- openOrCreateNote checks exists() before create_note, and create_note also refuses existing paths. A race between the two surfaces as a thrown error, not as opening the existing file.
- The parent directory comes from the last slash in the path, so the split assumes POSIX separators.
- loadNoteTemplate falls back to inlineTemplate without logging when the template file cannot be read.
- Index work goes only through applyNoteChange with the create source. That policy skips the Rust update because create_note already did it, and the vault path is passed only for Markdown files. Calling per-file updaters directly would break this.
- notifyNoteCreated runs after openFileInEditor and only when the file was created, so an observer's write reaches the open tab instead of being overwritten by the tab's next autosave.
- explicit-organization.logic.ts is a separate file because tests mock note-creator.service.ts whole with only openOrCreateNote, so helpers placed there would be undefined.
- Errors are logged and rethrown. Callers decide how to show them.
