---
summary: "Rule-driven post-save automation: renames, moves, property writes, note creation and mod actions for saved notes."
---

## Responsibility

Owns the rule model (a filter plus rename, move, property, create-note and run-action consequences), the vault-persisted rule list and excluded folders, the after-save pipeline that evaluates rules against a saved note and applies the matching consequences, and the Settings section that edits rules. It does not own filesystem primitives (core/filesystem), frontmatter parsing and writing (core/frontmatter), the filter expression language (features/collection), type definitions (features/type-definitions), or the registry of mod actions (core/rule-actions); it calls into those.

## Key files

- `src/lib/features/auto-organize/auto-organize.service.ts`: Config load and save, the after-save hook with per-file debounce, and the evaluateAndMove pipeline (rename, move, icon, properties, create-note, run-action).
- `src/lib/features/auto-organize/auto-organize.logic.ts`: Pure rule logic: rule matching, destination and name templates, sanitizers, property write planning and skip reasons.
- `src/lib/features/auto-organize/auto-organize.types.ts`: Persisted shape: AutoOrganizeRule, RuleProperty, RuleCreateNote, RuleRename, RuleRunAction, AutoOrganizeConfig.
- `src/lib/features/auto-organize/auto-organize.store.svelte.ts`: Reactive rules, excludedFolders and isConfigLoaded, with the enabledRules getter.
- `src/lib/features/auto-organize/type-lifecycle-rules.ts`: Derives archive rules from type definitions that set archiveTo, plus an unarchive rule when archiveTo has the {folder}/<segment> shape; these are never stored in the config file.
- `src/lib/features/auto-organize/AutoOrganizeSection.svelte`: Settings section: enable switch, debounce, excluded folders, rule list and config save.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`: Editor for one rule: name, filter, destination, icon, properties, create-note, rename and run-action fields.
- `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte`: Editor for one rule property entry, mounted by AutoOrganizeRuleRow.

## State

- Vault file .kokobrain/auto-organize-rules.json holding rules and excludedFolders (written by saveAutoOrganizeConfig, read by loadAutoOrganizeConfig).
- autoOrganizeStore (module-level $state): rules, excludedFolders, isConfigLoaded.
- Module-level state in auto-organize.service.ts: per-path debounce timers, writingPaths and creatingPaths write guards, the after-save unsubscribe handle, and the reported* sets that log each problem once per rule per session.
- Reads settingsStore.autoOrganize (enabled, debounceMs) and the templates and system folders from settings; those settings are owned by core/settings.

## Collaborators

- `src/lib/core/editor`: addAfterSaveObserver is the trigger; reads open tab content and dirty state, and adds tabs for notes created with open.
- `src/lib/core/filesystem`: createFile, moveItem and renameItem from fs.service so links are rewritten and tabs follow; isViewFile and isMarkdownFile.
- `src/lib/core/frontmatter`: Parsing, lossy detection and rebuild helpers, and updateNoteFrontmatter for property writes.
- `src/lib/core/note-creator`: loadNoteTemplate builds the initial content of a note created from a template.
- `src/lib/core/rule-actions`: ruleActionsStore.get finds a mod action by id, so the feature never imports plugins.
- `src/lib/core/settings`: Reads the auto-organize settings and the protected templates and system folders.
- `src/lib/core/vault`: vaultStore.path for the config path and vault-relative paths.
- `src/lib/features/collection`: buildNoteRecord, collectionStore.propertyIndex, evaluateFilter, the expression parser and evaluator, and the toolbar FilterPanel used to match and edit rules.
- `src/lib/features/file-icons`: setIconForPath for the legacy per-rule icon; IconPicker, IconRenderer and the icon store in the rule editors.
- `src/lib/features/type-definitions`: typeDefinitionsStore.typeMetadataMap and TypeMetadata; archiveTo produces lifecycle rules.
- `src/lib/app`: app-lifecycle calls loadAutoOrganizeConfig, toggleAutoOrganizeHook and resetAutoOrganize; SettingsPanel mounts AutoOrganizeSection.

## Gotchas

- Lifecycle rules are generated on every evaluation from typeDefinitionsStore and are never written to the config file, so they do not appear in saved rules. An unarchive rule exists only when archiveTo has the {folder}/<segment> shape.
- Loop protection: a run registers its target path in writingPaths during the write phase and the after-save observer returns early for those paths, so a run's own writes do not schedule another evaluation.
- Order inside a run: the first matching rule with a rename runs first, later steps read the note at its new name, and a failed rename or move stops the whole run.
- Note content comes from the open editor tab when one exists, not from disk. A tab with unsaved edits is not renamed.
- A rule's runAction starts after the write phase and is not awaited, because an action may wait on a dialog. Its saves are ordinary saves and can trigger their own evaluation.
- Notes created by a run are not evaluated by that run, since createFile fires no after-save. A created note that would match its own rule is refused, and create-note runs are capped per run.
- Property writes are skipped (propertyWriteSkipReason) for non-Markdown files, notes in the templates or system folder, type definitions, and frontmatter that is lossy or unreadable on rewrite. Renames are also skipped for Todoist project notes, and a rule may never set the todoist_project key.
- Loading is lenient: a parse failure resets the store to empty defaults and logs. The next Settings save writes the in-memory state over the file. Invalid createNote and rename entries are kept as stored (createNote only with a text path) so a save does not erase them.
- The after-save hook logs errors instead of throwing. saveAutoOrganizeConfig logs and rethrows.
- The folder calls no IPC command directly and listens to no event. The config file and existence checks use @tauri-apps/plugin-fs; moves, renames and creates go through core/filesystem.
