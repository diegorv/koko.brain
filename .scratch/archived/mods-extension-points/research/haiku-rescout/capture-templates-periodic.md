## Where in code

- **Note creator (core, shared pipeline):** `src/lib/core/note-creator/note-creator.service.ts`
  - Options type: `:14-39`. Fields are `filePath`, `templatePath`, `inlineTemplate`, `title`, `customVariables`, `contextDate`, `buildContent`.
  - `loadNoteTemplate`: `:49-64`. Template read failure falls back to `inlineTemplate` (`:53-58`).
  - `openOrCreateNote`: `:78-132`. Order: `exists` (`:86`), `create_folder` (`:98`), render plus `buildContent` (`:100-101`), `create_note` (`:103`), `markRecentSave` (`:107`), `applyNoteChange` with `source: 'create'` (`:118`), `addToTree` (`:121`), `openFileInEditor` (`:126`).
- **Explicit organization helper:** `src/lib/core/note-creator/explicit-organization.logic.ts:29-45` (`withUnorganizedFlag`, `applyExplicitOrganization`).
- **Quick Capture, plugin:**
  - `src/lib/plugins/quick-capture/quick-capture.service.ts`: Tauri listener queue `:51-82`, `handleDetectedCapture` `:91-98`, `dispatchCapture` `:101-118` (needs `vaultStore`), `buildCaptureAction` `:126-173`.
  - `src/lib/plugins/quick-capture/note-composer.service.ts:20-51`: Cmd+N path. It calls `openOrCreateNote` with `buildContent: withUnorganizedFlag` when the setting is on (`:49`).
  - `src/lib/plugins/quick-capture/note-composer.logic.ts`: `buildCapturePath` `:12-20`, `buildCaptureVariables` `:49-85` (provenance defaults `:65-72`, `dailyNotePath` `:75-79`), `processCaptureTemplate` `:122-133` (YAML-safe placeholders).
- **Capture execution (app layer):** `src/lib/app/deep-link-actions.ts`
  - `executeCaptureAction`: `:137-226`. Per-kind template from `settingsStore.quickCapture.templates[kind]` (`:148`), template expansion `:168-198`, unique-path suffixing `:213`, `markRecentSave` `:214`, `writeTextFile` `:215`, `notifyAfterSave` `:216`, `addToTree` `:225`.
  - It does not call `openOrCreateNote`, so it writes the file itself.
  - Registration: `:232-240`, via `registerDeepLinkAction('capture', ...)`.
- **Deep-link dispatcher:** `src/lib/features/deep-link/deep-link.service.ts`. Registry `:39` (`RegisteredDeepLinkActionType = 'daily' | 'capture'`) and `:56-66` (`registerDeepLinkAction`, which replaces any earlier handler for the same type). `executeAction` `:182-216` returns a boolean and toasts on failure. `executeNewAction` `:245-330` has its own write paths.
- **Templates (plugin):**
  - `src/lib/plugins/templates/templates.service.ts`: `loadTemplates` `:20-48` (scans `_templates/`, `.md` only), `createFileFromTemplate` `:55-69` (delegates to `openOrCreateNote` with `templatePath`), `ensureTemplatesFolder` `:75-125` (also seeds placeholder files for the periodic and capture template paths).
  - `templates.store.svelte.ts:9-27`, `TemplatePicker.svelte` (opened from `AppOverlays.svelte:7,19`).
- **Periodic notes (plugin):** `src/lib/plugins/periodic-notes/periodic-notes.service.ts`
  - `dailyNotePath` `:23-28`.
  - `openOrCreatePeriodicNoteForDate` `:38-61`: passes `contextDate` (`:59`), no `buildContent`, so no `_organized` flag. `explicit-organization.logic.ts:4-6` documents this as intentional.
  - `autoOpenDailyNote` `:92-121`, `refreshDailyNoteIfDateChanged` `:129-160`, `resetPeriodicNotes` `:163-165`.
  - `DailyNoteButton.svelte` is the rail button (`onclick` calls `openOrCreateDailyNote`).
- **Entry points:** `src/lib/app/commands.ts:300-331` (palette entries `quick-capture:create-note`, `daily-notes:open`, `templates:new`), `src/lib/app/global-keybindings.ts:152` (Cmd+N).
- **Template expansion util:** `src/lib/utils/template.ts:22-31` (`processTemplate`, regex `<% %>`, unknown names fall through).

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)

- **Note creation:** no registry. `openOrCreateNote` is a plain function. Its only extension point is the per-call `buildContent` option (`note-creator.service.ts:38`), and `customVariables` (`:25`) for template variables. Each caller passes its own values.
- **Quick Capture targets:** hard-coded by kind. `QuickCaptureTemplates` is keyed by kind (`settings.types.ts:222`), `CaptureKind` is a closed union (`deep-link.types.ts`, imported at `quick-capture.service.ts:6`), and the handler is one `switch` (`quick-capture.service.ts:139-172`).
- **Deep-link actions:** a registry exists (`deep-link.service.ts:56-66`) but its type is closed to `'daily' | 'capture'` (`:39`). A mod could not register a new type without widening that union.
- **Rail:** `railRegistryStore` (`rail-registry.store.svelte.ts:24-79`) has `registerNavigator`, `registerLensProvider`, `registerFolderCreator`, `registerAction`. Built-ins (calendar, kanban, one-on-one) and mods (`mods-host.service.ts:344`) both use it.
- **Command palette:** a literal array in `commands.ts:300-331`. I did not read the enclosing function, so I cannot say whether it is reactive.
- **Mods today:** `MOD_APP` (`mod-app.service.ts:23-53`) exposes `dailyNotePath` and `openOrCreateDailyNote` (`:42-44`), `createTypedNote`, and `createOneOnOneNote`. It does not expose `openOrCreateNote`, `loadNoteTemplate`, `openOrCreatePeriodicNoteForDate`, Quick Capture, or templates. The mod context gives `addAction` (`mod-api.v1.ts:303`, `ModActionV1` `:66-82`, with an optional text `input` `:73`) and `addRailButton` (`:305`, `ModRailButtonV1` `:87-97`).
- **Mod note creation:** `ModVaultV1.create` (`mod-api.v1.ts:113-133`) is implemented in `mod-vault.service.ts:71-88`. It copies the `openOrCreateNote` steps but has no template, no `buildContent`, and no explicit-organization flag.

## What mods could do

- Add palette commands, rail buttons, and rail actions (already possible via `addAction` and `addRailButton`).
- Create a note from a vault template, or from a template path they name, through a new `ctx` method wrapping `openOrCreateNote`.
- Set or extend template variables (`customVariables`), so a template can use `<% myVar %>`.
- Change the rendered content of a note just before creation (`buildContent`), where a throw aborts the write (`note-creator.service.ts:36-37`).
- Add a new capture target or kind. This needs a registry in core or app, and it changes the `CaptureKind` union.
- React to daily-note creation. This needs a hook; none exists in `periodic-notes.service.ts` today.

## API sketch

```ts
// Added to ModContextV1 (contract v1 additions are minor). Vault-relative paths only.
ctx.notes.createFromTemplate(opts: {
  path: string;            // vault-relative target
  templatePath?: string;   // vault-relative, must be inside the vault
  inlineTemplate?: string;
  title: string;
  variables?: Record<string, string>; // becomes customVariables
}): Promise<string>;       // resolves to the absolute path actually opened

ctx.notes.onBeforeCreate(fn: (ctx: { path: string; kind: 'template' | 'quick' | 'periodic' | 'mod'; content: string }) => string): () => void;
// Backed by a core registry that openOrCreateNote consults next to buildContent.
// Each entry is disposed at unload.

ctx.capture.addTarget?(...)  // deferred: needs CaptureKind and QuickCaptureTemplates to become open
```

## Cost

**M.** The create hook and the variables extension each need one small core registry, and `openOrCreateNote` has a single insertion point (`buildContent`). The contract additions are small. The cost rises to **L** if capture targets are included, because `CaptureKind`, `QuickCaptureTemplates`, the settings UI, and the `switch` in `executeCaptureAction` all become data-driven.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)

- **Layer rule:** `core/note-creator` may hold only the registry, not plugin logic. Capture composes deep-link and plugin code and so lives in `src/lib/app/` (`deep-link-actions.ts:1-38`). A mod hook must be wired from `app/` or `mods-host`, not from `features/`.
- **Disposal:** `registerDeepLinkAction` overwrites by type with no owner check (`deep-link.service.ts:62`). A mod registering `'capture'` would silently replace the built-in handler. The unregister closure only deletes its own entry (`:63-65`), which is safe. Any new registry needs the same identity check, and `ctx.register` must cover it (`mod-api.v1.ts:297`).
- **Indexing invariant:** every creation path must go through `applyNoteChange` with `source: 'create'`, and must not call per-file updaters directly (`docs/agents/indexing-watcher-rules.md` item 6). `mod-vault.service.ts:82-91` already does this. A new path must not skip it.
- **Data:** `buildContent` runs only on create, never on open (`note-creator.service.ts:97-101`). A throw writes nothing. A template path from a mod would read any file the process can reach (`readTextFile` at `:55`), so mod-supplied `templatePath` must be validated as vault-relative, like `ModVaultV1` paths.
- **Reactivity:** the picker reads `templatesStore` (`templates.store.svelte.ts:9-27`). Mod-supplied templates must reload that store, or they will not appear.
- **Explicit organization:** a mod-created note gets no `_organized: false` today (`mod-vault.service.ts:71-88`). Whether it should is a product decision, not something I can settle from code.
- **Hot path:** none. All these paths are user-triggered or run once per app start.

## Bugs or complexity removed (say none if none)

- **Silent swallow (verified by reading):** `deep-link-actions.ts:168-197`. The `try` wraps `readTextFile`, `buildCaptureVariables`, and `processCaptureTemplate`, and `catch {}` (`:195`) drops every error. A template that exists but cannot be read, or that throws during expansion, silently produces the raw body. This contradicts CLAUDE.md's "never silently swallow" rule for services. Severity is low. Fix: catch only the read, and log or toast the rest.
- **Four creators of new notes (complexity):** `openOrCreateNote` (`note-creator.service.ts:97-127`), `executeCaptureAction` (`deep-link-actions.ts:213-225`), the silent `new` branch (`deep-link.service.ts` around `:300-316`), and `ModVaultV1.create` (`mod-vault.service.ts:71-88`). Each repeats `markRecentSave`, `applyNoteChange`, `addToTree`, and the write. Only `openOrCreateNote` gets templates and explicit organization. A shared core helper would remove the duplication, but this is a refactor, not a bug.
- **Redundant defaults (minor):** `buildCaptureVariables` sets provenance defaults (`note-composer.logic.ts:65-72`), and `executeCaptureAction` overwrites most of them (`deep-link-actions.ts:173-192`). The comment at `note-composer.logic.ts:41-42` says so.
- **Possible behavior split, unconfirmed:** Cmd+N (`openOrCreateNote`) opens an existing note on a filename collision, while capture (`resolveUniqueCapturePath`, `deep-link-actions.ts:90-102`) suffixes. The default `filenameFormat` has milliseconds (`settings.store.svelte.ts:35`), so the collision needs a custom format. I did not confirm that case.

## Could not verify

- `docs/28-mods.md` and the real mods in `kokobrain-vaults/kokobrain-mods-src/mods/` were not read. The task asked for them, but I did not open them.
- Whether `deep-link-actions.ts`'s `registerDeepLinkActions` is reachable from mod code. I did not grep `mods-host.service.ts` for `registerDeepLinkAction`.
- The full `commands.ts` function that returns the palette array (only lines 300-331 read), and whether it is reactive.
- Rust `create_note` / `create_folder` behavior beyond their call sites.
- Existing test coverage for these files. The directories `src/tests/lib/plugins/{quick-capture,templates,periodic-notes,mods}` exist, but I did not read the test files.
- `DailyNoteButton.svelte`'s mount point in the rail.
- `TemplatePicker.svelte` beyond its import of `createFileFromTemplate`.
- No build, test, or run was done (read-only task).