---
summary: "Template picker: lists .md files in the vault templates folder and creates new notes from them."
---

## Responsibility

Owns the New File from Template flow. It scans the configured templates folder (settingsStore.templates.folder) for .md files, holds the list and dialog open state in templatesStore, and renders TemplatePicker, a two-step dialog (pick a template, then type a file name). It also creates the templates folder and the empty placeholder files that periodic notes, Quick Capture and one-on-one settings reference. Template expansion and note creation are delegated to core/note-creator. It does not own the settings schema or the vault index, and it has no Rust module.

## Key files

- `src/lib/plugins/templates/templates.service.ts`: loadTemplates, createFileFromTemplate, ensureTemplatesFolder, openTemplatePicker and resetTemplates.
- `src/lib/plugins/templates/templates.logic.ts`: Pure helpers: TemplateEntry, extractTitleFromPath, buildTemplatesFolderPath and filterTemplates.
- `src/lib/plugins/templates/templates.store.svelte.ts`: Reactive isOpen and templates with open, close, toggle, setTemplates and reset.
- `src/lib/plugins/templates/TemplatePicker.svelte`: Command dialog: search and pick a template, then enter a file name and confirm with Enter.

## State

- templatesStore: module state for isOpen and templates, in memory only.
- On disk: the vault folder settingsStore.templates.folder with the template .md files, plus empty placeholder .md files that ensureTemplatesFolder creates at the configured template paths.

## Collaborators

- `src/lib/core/note-creator`: openOrCreateNote creates the note from the template path. withUnorganizedFlag is the content builder when explicit organization is on.
- `src/lib/core/settings`: Reads templates.folder, periodicNotes template paths, quickCapture.templates, oneOnOne.templatePath and explicitOrganization.
- `src/lib/core/vault`: vaultStore.path builds absolute template and note paths.
- `src/lib/core/filesystem`: addToTree adds the created folder and placeholder files to the file tree.
- `src/lib/contracts`: The call() wrapper for create_folder.
- `IPC:create_folder`: Called by ensureTemplatesFolder to create the templates folder through Rust so the watcher self-save filter sees the event.
- `src/lib/components/ui`: The command dialog component behind TemplatePicker.
- `src/lib/utils`: error() logging in loadTemplates and ensureTemplatesFolder.
- `src/lib/app`: AppOverlays.svelte mounts TemplatePicker, commands.ts registers templates:new, and app-lifecycle.service.ts calls ensureTemplatesFolder at vault startup and resetTemplates on teardown.

## Gotchas

- ensureTemplatesFolder writes the placeholder files with writeTextFile directly, not through Rust. It is listed as an allowed raw-write exception in src/tests/lib/raw-write-ratchet.test.ts.
- ensureTemplatesFolder collects paths from every periodic note type (daily through yearly), every Quick Capture kind (deduplicated) and the one-on-one template, so those files exist even when the features are unused.
- createFileFromTemplate writes the new note to the vault root, not into the templates folder, and appends .md to the typed name when missing.
- loadTemplates and ensureTemplatesFolder log failures with error(), while TemplatePicker reports a create failure with console.error and a toast.
- src-tauri/src/commands/semantic.rs excludes the literal folder name _templates from semantic indexing, so it does not follow a custom templates.folder setting.
- No event listeners are registered here. Loading and reset are driven by app-lifecycle and the command palette.
