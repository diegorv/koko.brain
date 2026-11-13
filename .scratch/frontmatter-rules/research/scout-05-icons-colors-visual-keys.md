# Scout 05: icons, colors and visual frontmatter keys

Area: how the app stores, reads, renders and writes `_icon`, `_color`, `_title_color`, and every other frontmatter key the app reads for look or behavior. Read-only research. Paths are relative to the repo root. "Not verified" marks anything I did not trace to code.

## 1. Headline findings

1. There is exactly one icon/color model, and it is frontmatter-only. Notes, folder notes, type definitions and `.view` files all carry `_icon`, `_color`, `_title_color`. A rule engine that writes those three keys needs no new render path: every renderer already reads them through one index (`fileIconsStore`) and one resolver (`resolveIconForPath`). ADR 0027 records that the old sidecar `.kokobrain/file-icons.json` was dropped in favor of frontmatter (`docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md:68`).
2. The existing write path (`setFrontmatterIcon` / `setFrontmatterIconColors`) is overwrite-and-delete, not fill-if-missing. An absent color REMOVES the key (`src/lib/features/file-icons/frontmatter-icon.service.ts:26-31`). Auto Move's call `setIconForPath(..., rule.icon.color, rule.icon.textColor)` (`src/lib/features/auto-move/auto-move.service.ts:209`) therefore deletes a note's existing `_color` / `_title_color` whenever the rule omits them, and always replaces `_icon`. A per-action "fill only if missing" mode cannot be built on these helpers as they are.
3. Live refresh after a write is already wired through the note-change consumer `file-icons` (`src/lib/features/file-icons/file-icons.service.ts:299-305`). A frontmatter edit from any source (autosave, 1 s `edit` debounce, watcher, property panel via `updateNoteFrontmatter`) updates the visual index with no rule-side code. The "on property change" trigger therefore has a ready-made hook point (consumer fan-out), with the cost that consumers must be synchronous (`note-change.service.ts:31-36`).
4. Beyond icon keys, the app reads a larger set of "behavior" frontmatter keys (section 4). No `cssclasses`, `banner`, `cover` or any CSS-class/banner key exists anywhere in `src/lib`, `src-tauri/src` or `docs` (grep for `cssclasses|cssClasses|banner|cover` returned only unrelated prose and CSS `object-fit: cover`).
5. Icon/color config living OUTSIDE frontmatter exists in four places (section 5). None of them is per-note state; the nearest to a rule system is Auto Move's `rule.icon`.

## 2. Storage and index (the data model)

| Piece | Where | Evidence |
|---|---|---|
| Canonical keys | `_icon`, `_color`, `_title_color` | `src-tauri/src/vault/aliases.rs:19-23`, mirror `src/lib/utils/frontmatter-aliases.ts:14-18` |
| Aliases | `icon`, `color`, `title_color` fold onto the canonical keys at parse time in Rust; TS mirror folds in `foldIconAliases` and `canonicalizeKey` | `file-icons.logic.ts:51-69`, `properties.logic.ts:298` |
| Rust side | Icon keys are in `SYSTEM_KEYS`, so a wikilink in a value never becomes a relationship; they are not otherwise interpreted in Rust | `src-tauri/src/vault/entry.rs:438-445` |
| Index (TS) | `fileIconsStore.frontmatterIcons: Map<path, FrontmatterIconRef>` with `{iconPack, iconName, color, titleColor}` | `file-icons.store.svelte.ts:4-13,43-51` |
| Bulk build | `buildFrontmatterIconIndex()` reads `get_all_vault_entries_v2` (pre-parsed, no YAML parse in JS); runs at vault init and in the watcher's full-rebuild branch | `file-icons.service.ts:201-232`, `app-lifecycle.service.ts:426`, `watcher-handler.service.ts:78` |
| Incremental | `updateFrontmatterIconForFile(path, content)` parses raw content (cheap pre-check `/icon\|color/` on the frontmatter block, `file-icons.logic.ts:83-91`), skips when unchanged, also indexes folder notes under the parent dir, and preloads the icon pack | `file-icons.service.ts:240-272` |
| Removal | `removeFrontmatterIconForFile`, same folder-note mirroring | `file-icons.service.ts:279-292` |
| Registration | `registerFileIconsNoteChangeConsumer` wired in `initializeVault` (`app-lifecycle.service.ts:260`), unwound by teardown; `resetFileIcons` at `:661` | `file-icons.service.ts:299-305` |
| Folder icons | Stored in folder note `X/X.md`; the index is keyed under both the note path and the directory path | `file-icons.service.ts:214-222,259-266` |
| `.view` files | Bare YAML (no fences); `extractViewIcon` parses the whole body | `file-icons.logic.ts:199-211`, `file-icons.service.ts:243-245` |

Value validation (relevant for any rule that writes these keys):

- `_icon` must be a string; `pack:name` with `pack` in the closed list `lucide, feather, fa-solid, fa-regular, fa-brands, octicons, boxicons, coolicons, simple-icons, tabler, remix, emoji`; a bare name is read as lucide. Unknown pack or empty name yields no icon (`file-icons.logic.ts:19-48,149-155`).
- `_color`, `_title_color` must be non-empty strings that pass `isSafeCssValue`: no `;` and no `url(` (`file-icons.logic.ts:162-164,170-179`). A rule action that writes an unsafe value would be silently ignored at read time. Validate at rule-save time.
- `_color` renders as the theme token `var(--type-<name>)` when it is one of `red, orange, yellow, green, teal, blue, purple, pink, gray` (case-insensitive); anything else is used verbatim as a CSS color (`iconColorCss`, `file-icons.logic.ts:219-223`; palette names at `src/lib/core/settings/theme-builder.logic.ts:5-11`).
- `_title_color` is used verbatim as a CSS color (no palette-name mapping): every reader passes `resolved.titleColor` straight to `style:color` (see section 3). A palette name such as `green` is a valid CSS named color, but `teal`/`pink`/`gray` would map to CSS named colors, not the theme tokens. Docs say "CSS color" (`help/documentation/25-types-and-relationships.md:55`).
- The picker writes hex values from a fixed swatch list (`IconPicker.svelte:51-60`), plus a custom color. `src/lib/utils/color-presets.ts` is NOT part of the icon system: it feeds QueryJS cards, kanban and Collection `badge()/progress()/color()` display functions (`color-presets.ts:22-30`, `collection/expression/evaluator.ts:444-461`, `kanban/*`, `queryjs/kb-ui.ts:24,910`) with seven names (blue, green, red, orange, purple, yellow, gray). It has no teal or pink, so it is a different palette from `TYPE_PALETTE_NAMES`.

## 3. Resolution chain and every renderer

Resolver: `resolveIconForPath(path)` (`src/lib/features/file-icons/icon-resolver.ts:64-77`):

1. Own frontmatter icon, with its own colors only.
2. Else the type definition's icon (found through `registerTypeIconLookup`, filled by `registerAppPorts()`, `src/lib/app/boot.ts:11`), with the file's own colors laid over the type's.
3. Else undefined; the caller keeps its own default icon but still applies `titleColor`.

`resolveIconForType(typeName)` (`icon-resolver.ts:84-90`) reads the definition note's ref. It reads `fileIconsStore.packVersion` so consumers re-render when a pack finishes loading (`icon-resolver.ts:65,85`).

Consequence for rules: a rule that sets `_icon`/`_color`/`_title_color` on a note overrides the type-inherited look for that note only because own icon wins; own colors without own icon are laid over the type icon (`icon-resolver.ts:72-76`). A rule that sets only `_color` on a note with no type icon and no own icon renders nothing, except in the Rail pin color (below). The docs state this: "`_color` applies only together with `_icon`" (`25-types-and-relationships.md:49`).

Renderers (all read via the resolver or the store; `IconRenderer` applies `iconColorCss`, `IconRenderer.svelte:19-20,24,34`):

| Surface | Icon | Icon color | Title color | Evidence |
|---|---|---|---|---|
| Editor tabs | yes | yes | yes (`tabTitleColor`) | `src/lib/app/EditorView.svelte:55-66`, `src/lib/core/markdown-editor/EditorTabs.svelte:19-24,85` |
| Files navigator (folder rows; file rows go through the same resolver) | yes | yes | yes, not when row active | `src/lib/features/rail-shell/FilesNavigator.svelte:430,483-490` |
| Types navigator (type rows and view rows) | yes | yes | yes, not when active | `src/lib/features/rail-shell/TypesNavigator.svelte:278-293,403-423` |
| Note list rows (`RailNoteList`, `NoteRow`) | yes | yes | yes, not when active | `RailNoteList.svelte:651-662,914`, `src/lib/features/note-list/NoteRow.svelte:53,83,88` |
| Rail pins (pinned type/view) | yes | yes; also the pin dot color via `iconColorCss(_color) ?? RAIL_PIN_COLOR` even with no icon | no | `src/lib/features/rail-shell/Rail.svelte:167,336-348` |
| Properties panel: Type selector, relationship links | yes | yes | no | `src/lib/features/properties/PropertiesView.svelte:172-192,257-265` |
| Relationship search dropdown | yes | yes | no | `src/lib/features/properties/RelationshipSearch.svelte:64-73` |
| Auto Move settings row preview | yes (from the rule, not frontmatter) | yes | no | `src/lib/features/auto-move/AutoMoveRuleRow.svelte:56-58,148` |

Notes on that list:

- `_title_color` doc text says "Tab title text color in the editor" (`help/documentation/02-file-explorer.md:149`) but code also applies it in the Files navigator, Types navigator and note list. The type doc is accurate ("titles of its notes", `25-types-and-relationships.md:55`). Docs for `02-file-explorer.md` are stale on this point.
- Rail pins do not apply `titleColor`.
- No renderer exists in: Graph view (colors derive from theme tokens only, `src/lib/plugins/graph-view/graph-view.logic.ts:157-214`), Collection table/views (no `_icon` rendering; only the `icon(name)` display function with a Lucide name, `evaluator.ts:434-436`), Quick Switcher, Search results, backlinks panels. I found no `resolveIconForPath` / `fileIconsStore` import in any of those (grep of `src/lib` outside `features/file-icons`). Not verified: a Rust-side or CodeMirror-side consumer (the editor reads no icon; wikilink decorations were not inspected for icon use, grep found no `file-icons` import in `core/markdown-editor`).
- `TypeMetadata.icon` / `.color` (`type-definitions.logic.ts:12-14,108-109`, with builtin fallbacks Project=rocket/red, Person=users/blue, Event=calendar/purple, Topic=tag/green, Task=check-square/orange, Note=file-text/gray at `:38-45`) have NO render consumer I could find: `getTypeMetadata` users read `listPropertiesDisplay`, `sidebarLabel`, `order`, `sort`, `visible` (`RailNoteList.svelte:710`, `lens.logic.ts:235,365,503`, `type-sidebar.logic.ts:207-216`). A grep for `(metadata|meta|typeMeta|m)?.(icon|color)` found only unrelated hits. The builtin type icons are effectively dead data; the rendered type icon comes from the definition note's frontmatter via the resolver. Flagging as unverified-dead code, not a change request.

## 4. Every visual or behavior key the app reads from frontmatter

Reader paths are the primary readers; Rust parse sits behind all of them (`src-tauri/src/vault/entry.rs`, `parsing.rs`). Aliases per `src-tauri/src/vault/aliases.rs:10-26`. ADR 0027's amendment table (`docs/adr/0027-...md:17-34`) is the maintained list; it matches what I found and I add the readers.

### 4.1 Visual keys

| Key (alias) | On | Effect | Reader |
|---|---|---|---|
| `_icon` (`icon`) | notes, folder notes, type definitions, `.view` | Icon everywhere in section 3 | `file-icons.logic.ts:149-155`, `file-icons.service.ts:206-210`, `type-sidebar.logic.ts` (view icon via `extractViewIcon`) |
| `_color` (`color`) | same | Icon color; Rail pin color | `file-icons.logic.ts:170-179`, `Rail.svelte:167` |
| `_title_color` (`title_color`) | same | Title text color | `file-icons.logic.ts:176-177` |
| `_sidebar_label` (`sidebar_label`, `sidebar label`) | type definitions, `.view` | Row label and pin name | `type-sidebar.logic.ts:349-351`, `type-definitions.logic.ts:111` |
| `_visible` (`visible`) | type definitions, `.view` | Hides type row / hides view from Views | `type-sidebar.logic.ts:392`, `type-definitions.logic.ts:116` |
| `_order` (`order`) | notes, type definitions, `.view` | Pins a note on top; orders rows | `src/lib/core/filesystem/folder-notes.logic.ts:46-48`, `type-sidebar.logic.ts:150,467`, `type-definitions.logic.ts:110` |
| `_list_properties_display` (`list_properties_display`) | type definitions, `.view` | Property pills on note rows | `type-sidebar.logic.ts:491`, `type-definitions.logic.ts:117`, `RailNoteList.svelte:710` |
| `_rail` | type definitions, `.view` | Pin to rail | `lens.logic.ts:223,234` |
| `_group` | `.view` | Views subheading | per ADR 0027 amendment; reader not traced by me |
| `_list_sort` | type/view entry | Saved note-list sort | `RailNoteList.svelte:382` |
| `event_color` | event notes | Calendar event color (closed list `EVENT_CALENDAR_COLORS`; no underscore, no alias) | `src/lib/features/event-calendar/event-calendar-event.logic.ts:50,201-205,322` |

### 4.2 Behavior keys

| Key (alias) | Effect | Reader |
|---|---|---|
| `_type` (`type`) | Note type; `isA` normalized casing; drives type icon inheritance | `src-tauri/src/vault/entry.rs:250,399-406` |
| `_organized` (`organized`), `_archived` (`archived`), `_favorite` (`favorite`) | Lifecycle flags; missing `_organized` reads as true | `entry.rs:251-256`, `lifecycle.logic.ts:8-25,50-63`, `note-action-bar.logic.ts:13-17`, `collection.logic.ts:63-65`, `type-lifecycle-rules.ts:43,52` (Auto Move reads `_archived` through expressions) |
| `_favorite_index` | Parsed, no effect on the rail | ADR 0027 table |
| `_belongs_to`, `_related_to`, `_has_many` | Relationships | `entry.rs:257-259` |
| `_template` (`template`), `_folder`, `_archive_to`, `_hub`, `_sort` (`sort`), `_view` (`view`) | Type definition settings; `_view` parsed, not applied; `_sort` on a definition parsed, not applied | `type-definitions.logic.ts:112-119` |
| `_open_in_editor`, `_rail_view`, `_group` | `.view` behavior | ADR 0027 amendments; `yaml-parser.ts:118-125,298-319` |
| `aliases` / `alias` | Wikilink completion aliases | `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:29` |
| `tags` | Tags | Rust `extract_tags_strict` (`entry.rs:248`) |
| `title`, `date`, `created` | `date`/`created` read by the Today lens | `lens.logic.ts:265-266` |
| `date`, `end_date`, `start`, `end`, `all_day`, `location`, `event_color` | Event calendar | `event-calendar-event.logic.ts:165-206` |

Not present anywhere: `cssclasses`, `banner`, `cover`, `image`, `publish`. No per-note CSS class hook exists, so "colors, basically frontmatter things" in the owner's goal maps to exactly the three icon keys plus `event_color`.

System-key convention (ADR 0027): `_` prefix means managed by the app and is shown in a separate System section of the properties panel (`docs/adr/0027...md:114`; I did not verify the panel code for that section). User keys without prefix remain user content. Any visual key a new feature adds should follow the `_` convention or an alias-free documented name, and gets added to `ALIAS_MAP` in BOTH `aliases.rs` and `frontmatter-aliases.ts` (mirror, no shared source).

## 5. Icon/color configuration outside frontmatter

1. Auto Move rule icons: `AutoMoveRule.icon?: AutoMoveIcon {iconPack, iconName, color?, textColor?}` persisted in `.kokobrain/auto-move-rules.json` (`src/lib/features/auto-move/auto-move.types.ts:2-37`). Applied by writing frontmatter after a move (`auto-move.service.ts:199-214`), so it is a rule-to-frontmatter bridge, not a separate render source. Note the naming drift: rule uses `textColor`, frontmatter uses `titleColor`/`_title_color`.
2. Recent icons: `.kokobrain/recent-icons.json`, max 20, picker convenience only (`file-icons.service.ts:23-81`, `file-icons.logic.ts:8-17`).
3. Tag colors: `settingsStore.tagColors.colors` (lowercase tag path to hex), per-vault settings, read by the editor decorations (`src/lib/core/settings/settings.types.ts:294-298`, `settings.store.svelte.ts:147,192,380`, `MarkdownEditor.svelte:663`). Not frontmatter, not related to `_color`.
4. Mod rail buttons: `manifest.color` of a mod (`src/lib/plugins/mods/mods-host.service.ts:549`), icon string in `addRailButton`. Unrelated to notes.
5. Builtin type fallbacks (`BUILTIN_TYPES`, `type-definitions.logic.ts:38-45`), apparently unrendered (see section 3).
6. Theme: `TYPE_PALETTE_NAMES` / `ui.type<Name>` tokens (`theme-builder.logic.ts:5-17`, `src/lib/core/settings/theme.types.ts:101-117`). The only place named colors resolve to real shades.

Answer to "is any icon/color config stored outside frontmatter?": for notes, no. Only the Auto Move rule's icon template (stored in `.kokobrain/auto-move-rules.json`) and non-note settings (tag colors, mod colors, theme tokens).

## 6. Write path (what a rule action must reuse or replace)

- `setIconForPath(vaultPath, path, pack, name, color?, textColor?, isDirectory)` (`file-icons.service.ts:118-145`): for Markdown calls `setFrontmatterIcon`, then writes the store directly (`updateFrontmatterIcon`). For a directory it ensures the folder note exists (writes `---\n---\n` placeholder and routes it through `applyNoteChange`, `:98-110`) and updates both the note path and directory key. It does NOT handle non-Markdown non-directory paths (silent return, `:144`).
- `setIconColors(path, color?, textColor?, isDirectory)` (`:153-166`): colors only, leaves `_icon`; absent color removes its key.
- `removeIconForPath` (`:174-193`): removes all three keys.
- `setFrontmatterIcon` / `setFrontmatterIconColors` / `removeFrontmatterIcon` (`frontmatter-icon.service.ts:57-90`) all go through `updateNoteFrontmatter(filePath, mutate)` (`src/lib/core/frontmatter/frontmatter-write.service.ts:99`), which for an open tab patches `tab.content` keeping unsaved body edits, saves the tab at once, then calls `notifyAfterSave` (`:116-161`); for a closed note it reads, writes and routes through `applyNoteChange`. `FrontmatterWriteError` (lossy frontmatter, save-failed, vault-changed, missing) is toasted by `toastFrontmatterWriteError` (`frontmatter-icon.service.ts:38-50`), so a rule engine writing in the background would toast on every refusal unless it pre-checks. Auto Move does the pre-check with `detectLossyFrontmatter(content)` and skips quietly (`auto-move.service.ts:199-207`); a new feature must do the same or every autosave of a lossy note toasts.
- `mutate` must be pure and may run twice (`frontmatter-write.service.ts:95`).
- Upsert detail: `upsertProperty` updates an existing canonical key, else appends via `addProperty` + `updatePropertyValue` (`frontmatter-icon.service.ts:20-24`). Parsed properties are canonicalized and deduped, so a note authored with `icon:` is rewritten under `_icon` on the next write (`properties.logic.ts:298-310,481-503`). Reading the "existing value" for fill-if-missing must go through the canonical key, not the raw spelling.
- The open-tab path is the Issue 001 blocker: the tab content is rewritten and the caret keeps its old offset (`.scratch/open-itens/issues/001-...`). Any rule that writes frontmatter of the ACTIVE note while the user types (on-save or on-property-change triggers) goes through this path.

## 7. Constraints and risks for the design

1. Fill-if-missing vs always-set needs a new per-key write primitive. Today's helpers delete a key when its argument is undefined (`frontmatter-icon.service.ts:26-31`). The rule action must be expressed as a pure `Property[] -> Property[]` mutation that (a) reads the canonical key, (b) skips when missing-mode and the key holds a non-empty value, (c) never removes keys it does not own. For "fill only if missing", define "missing": absent key, empty string, or unreadable value. `_icon: ""` or an invalid icon string is "present but ignored" at render time; the owner should decide whether that counts as missing. Reading rule: `isEmptyPropertyValue` in `properties.logic.ts:466-467` already treats empty list/blank as empty for dedupe.
2. Convergence/loop risk: a rule write fires `notifyAfterSave` and the note-change fan-out, which would re-trigger an on-save/on-property-change rule. Always-set rules are idempotent (same value yields the identical bytes; the `index-dedupe` map skips consumers on a `save` dedupe hit, `note-change.service.ts:74-81`), but two always-set rules writing different values to the same key will flip-flop forever. Fill-if-missing is naturally convergent. The design needs either rule ordering with first-match-per-key, or a loop guard. Not something I verified experimentally.
3. `edit` source (typing, 1 s debounce) runs consumers but skips the Rust IPC when deduped (`note-change.service.ts:75`). Property edits through the panel go through `updateNoteFrontmatter` (source `save`, immediate). YAML edits typed in the editor arrive as `edit` (1 s) then `save` (frontmatter-only autosave 500 ms, `docs/agents/indexing-watcher-rules.md` rule 7). "Immediately" for a YAML edit is bounded by that debounce unless the rule trigger hooks the editor change itself.
4. Consumers must be synchronous (`NoteChangeConsumer.upsert`, `note-change.service.ts:31-36`); a rule consumer that writes frontmatter is async and cannot be a plain consumer. Write through a queued or `void` call after the sync fan-out. Per `docs/agents/indexing-watcher-rules.md` rule 6, do not add a second owner of "a note's bytes changed": the rule write must go through `updateNoteFrontmatter`, which already routes via `notifyAfterSave` / `applyNoteChange`. Per rule 6, consumer registration must be in `initializeVault` and unwound in `teardownVault`, and forgetting registration is a silent no-op.
5. Layering (ADR-0003, `CLAUDE.md` layer rules): `core/` must not import `features/`. `file-icons` sits below `type-definitions` and gets type data through a registered port (`icon-resolver.ts:5-31`). A shared rule core that both Auto Move and a new feature use should live where both can import it without upward edges; `auto-move` already imports `file-icons.service` and `collection` (`auto-move.service.ts:5-6`), so a new feature beside it has the same imports available.
6. Rail pin colors accept `_color` without an icon while every other surface needs an icon; a rule that sets only `_color` can look inconsistent. Consider writing `_icon` and `_color` as a unit when the owner wants a color to be visible on notes.
7. Palette mismatch: `_color` accepts the 9 type palette names (theme-aware), `_title_color` takes raw CSS only, `COLOR_PRESET_*` has 7 different names for cards/badges. A rule UI that offers "color" should say which of the three vocabularies it means; the existing IconPicker offers hex swatches (`IconPicker.svelte:51-60`) not palette names, and AutoMove's types say "hex color".
8. Security: color values come from vault files and reach inline styles. `isSafeCssValue` rejects `;` and `url(` (`file-icons.logic.ts:162-164`); the rule write path should reuse that check so a rule cannot persist a value the reader will drop, and an expression-computed value (if actions allow expressions) must pass through it.
9. Preloading: icon packs load lazily. The consumer path preloads the pack on update (`file-icons.service.ts:269-271`), but `setIconForPath`'s direct store write does not (the picker has loaded the pack already). A rule writing an icon from a pack no note uses yet relies on the consumer path or on an explicit `preloadPacks`, else the icon resolves to nothing until a pack-load `packVersion` bump.
10. Folder notes: writing `_icon` on `X/X.md` also indexes the directory key (`file-icons.service.ts:214-222`), so rules that match folder notes change folder icons too. Decide whether rules apply to folder notes (they are ordinary notes to the expression engine).
11. `.view` files take the same keys but a different parser path (`extractViewIcon`) and a different write path (`rewriteViewFile`, `type-definitions.service.ts:443-450,489`); a rule engine scoped to Markdown notes can skip them, but its matcher must not accidentally include `.view` entries (Auto Move already special-cases views, `auto-move.service.ts:3`).
12. Mixed-case and alias twins: a note with both `icon:` and `_icon:` collapses to the first populated one on the next write and logs a discard (`properties.logic.ts:494-499`). Rules acting on such a note can silently change which value wins; fill-if-missing must read the post-dedupe value.

## 8. Open questions only the owner can answer

1. Does "fill only if missing" count an empty or invalid `_icon` / `_color` as missing?
2. Which color vocabulary should a rule action write for `_color` (palette names that follow the theme, or hex values), and may `_title_color` be a palette name (it does not resolve to a theme token today)?
3. May a rule action target keys beyond `_icon`, `_color`, `_title_color` (for example `_favorite`, `_archived`, `_organized`, arbitrary user properties)? The owner said "basically frontmatter things"; the lifecycle flags are already driven by Auto Move through expressions on `_archived` (`type-lifecycle-rules.ts:43,52`), so overlap is real.
4. Should rules apply to folder notes and `.view` files, or only ordinary notes?
5. When two rules set the same key with "always set", does the first matching rule win, the last, or does each rule apply in order (last wins)?
6. Should a rule that sets only `_color` also write a default `_icon` so the color is visible on surfaces that need an icon?
7. Is it acceptable that a property-change trigger on the active note rewrites the tab content while the caret blocker (Issue 001) is open, or must that blocker land first?
