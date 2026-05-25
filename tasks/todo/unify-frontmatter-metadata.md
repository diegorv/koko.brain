# Unify Metadata Persistence: Frontmatter-First with `_` Prefix

## Context

Three JSON files + two frontmatter field conventions persist icon/color/order metadata. Goal: single frontmatter-based system using `_` prefix for ALL system metadata. JSON stays ONLY for non-.md files (images, PDFs) and `recent-icons.json` (UI state). **Frontmatter always wins priority** — JSON is pure fallback for files that can't have frontmatter.

### Target fields (all `_` prefixed)
- `_icon: pack:name` (e.g., `lucide:star`)
- `_color: "#hex"` — icon color
- `_title_color: "#hex"` — title/text color in sidebar/tree
- `_order: number` — sort order (already exists for types)

### Resolution order (applies to ALL files, including .md)
1. Frontmatter `_icon`/`_color`/`_title_color` — always wins if present
2. JSON `file-icons.json` entry — fallback for ANY file without frontmatter metadata
3. Default icon (FileText)

JSON is NOT restricted to non-.md files. A `.md` without `_icon` in frontmatter but with a JSON entry still gets the JSON icon. The difference is **write path**: new icon assignments go to frontmatter for `.md` files, JSON for non-`.md` files. Read path accepts both, frontmatter winning.

### Current state being replaced
- `file-icons.json` → custom icons per file (any type)
- `folder-order.json` → stays (out of scope, separate concern)
- `recent-icons.json` → stays (UI state)
- `icon: pack:name` (no underscore) → migrates to `_icon`
- `_icon: name` (type defs, no pack) → migrates to `_icon: pack:name`

## Design Decisions

1. **Backwards compat:** Read both `icon` and `_icon` from frontmatter. New writes always use `_icon`. Bare names (no `:`) assume `lucide:` pack.
2. **Resolution:** Frontmatter always wins. JSON is fallback only for non-.md files.
3. **Folder metadata:** Via folder notes (`Folder/Folder.md`). Auto-create on first icon set.
4. **Type `_color`:** Stays as section header color for types. Per-note `_color` is per-note only. No inheritance.
5. **`folder-order.json`:** NOT migrated in this plan. Separate concern.
6. **EditorTabs:** Moves from per-render regex to store lookup.

## Tasks

- [x] Task 1: Extend `FrontmatterIconRef` with color fields + fix `_icon` key reading
- [x] Task 2: Add `_title_color` to Rust `SYSTEM_KEYS`
- [ ] Task 3: Create frontmatter icon write service (`setFrontmatterIcon`/`removeFrontmatterIcon`)
- [ ] Task 4: Route `setIconForPath`/`removeIconForPath` to frontmatter for .md files
- [ ] Task 5: Update UI resolution to use frontmatter colors (FileTreeItem, EditorTabs, TypeSidebar)
- [ ] Task 6: Verify auto-move works with new routing (Task 4 may cover it)
- [ ] Task 7: Folder metadata via folder notes (auto-create + icon write/read)
- [ ] Task 8: Skip `updateFileIconPathsAfterMove` for .md files
- [ ] Task 9: Migration helper — move existing JSON icons to frontmatter
- [ ] Task 10: Cleanup dead code paths + update docs

## Task Details

### Task 1: Extend FrontmatterIconRef + fix `_icon` key reading

**Problem:** `extractIconFromParsedFrontmatter` reads `frontmatter['icon']` but Rust may alias to `_icon`. `FrontmatterIconRef` has no color fields.

**Changes:**
- `file-icons.logic.ts` — `extractIconFromParsedFrontmatter`: read `_icon` first, fallback to `icon`. Add `parseIconValueWithFallback` that handles bare names (assume `lucide:`). Add `extractIconColorsFromParsedFrontmatter(fm)` returning `{ color?, titleColor? }` from `_color`/`_title_color`. Update `extractIconFromFrontmatter` regex to match both `_icon:` and `icon:`.
- `file-icons.store.svelte.ts` — Expand `FrontmatterIconRef`: add `color?: string`, `titleColor?: string`.
- `file-icons.service.ts` — `buildFrontmatterIconIndex`/`updateFrontmatterIconForFile`: extract + store color fields.
- Tests: `file-icons.logic.test.ts` — `_icon` key, bare name fallback, color extraction.

### Task 2: Add `_title_color` to Rust SYSTEM_KEYS

**Changes:**
- `src-tauri/src/vault/entry.rs:367-374` — Add `"_title_color"` to `SYSTEM_KEYS`.
- Check if alias needed in `aliases.rs` / `frontmatter-aliases.ts`. Add if so.
- Rust tests.

### Task 3: Create frontmatter icon write service

**New file:** `src/lib/features/file-icons/frontmatter-icon.service.ts`

**Exports:**
- `setFrontmatterIcon(filePath, iconPack, iconName, color?, titleColor?)` — reads file, upserts `_icon` as `pack:name`, upserts/removes `_color`, `_title_color`, writes file.
- `removeFrontmatterIcon(filePath)` — removes `_icon`, `_color`, `_title_color` from frontmatter.

**Also:**
- Extract `upsertProperty` from `type-definitions.service.ts` to `properties.logic.ts` (or shared).
- Update `updateTypeDefinitionIcon` to use `pack:name` format for `_icon`.
- Tests for new service.

### Task 4: Route setIconForPath to frontmatter for .md

**Changes:**
- `file-icons.service.ts` — `setIconForPath`: if path ends `.md`/`.markdown`, call `setFrontmatterIcon` + update `frontmatterIcons` store. Else, JSON path.
- `removeIconForPath`: same routing.
- Tests verifying routing.

**No consumer changes needed** — FileExplorer, TypeSidebar, auto-move all call the same API.

### Task 5: UI resolution with frontmatter colors

**Changes:**
- `FileTreeItem.svelte:73-79` — Read `frontmatterRef?.color` and `frontmatterRef?.titleColor`. Rule: frontmatter color wins, JSON color fallback.
- `EditorTabs.svelte:22-27` — Switch from `extractIconFromFrontmatter(tab.content)` to `fileIconsStore.getFrontmatterIcon(tab.path)`. Read colors from ref.
- `TypeSidebar.svelte` — Update all icon resolution blocks to use frontmatter colors.

**Resolution rule (all components):**
```
icon = frontmatterIcon ?? customIcon
color = frontmatterRef?.color ?? customEntry?.color
titleColor = frontmatterRef?.titleColor ?? customEntry?.textColor
```

### Task 6: Verify auto-move

Task 4 routes `.md` to frontmatter inside `setIconForPath`. Auto-move calls `setIconForPath`. Should work automatically. Verify + add test.

### Task 7: Folder metadata via folder notes

**Changes:**
- `folder-notes.logic.ts` — Add `getFolderNotePath(folderPath)`, `folderNoteExists(folderPath, children)`.
- `file-icons.service.ts` — In `setIconForPath`, when path is directory: resolve folder note path, auto-create if missing, call `setFrontmatterIcon` on it.
- `buildFrontmatterIconIndex` — When note at `X/X.md` has `_icon`, index under directory path `X/` too.
- Tests.

### Task 8: Skip path updates for .md

**Changes:**
- `file-icons.service.ts` — `updateFileIconPathsAfterMove`: filter to only update non-.md entries. Or becomes natural no-op as .md entries leave JSON.
- `fs.service.ts` — Optionally skip call entirely for .md paths.

### Task 9: Migration helper

**New file:** `file-icons-migration.service.ts`

- `migrateJsonIconsToFrontmatter(vaultPath)` — reads JSON, writes frontmatter for .md entries, removes them from JSON.
- Run once at boot (version flag).
- Tests.

### Task 10: Cleanup + docs

- Remove dead regex path if EditorTabs moved to store.
- Clean up unused branches.
- Update CLAUDE.md performance/indexing sections.

## Dependency Graph

```
Task 1 ──┬── Task 3 ── Task 4 ──┬── Task 5
Task 2 ──┘                      ├── Task 6
                                 ├── Task 7 ── Task 8
                                 └── Task 9 ── Task 10
```

Tasks 1+2 parallel. Tasks 5/6/7 parallel after 4. Task 8 after 7. Tasks 9/10 sequential at end.

## Verification

After each task:
1. `pnpm check` (type checking)
2. `pnpm vitest run` (unit tests)
3. For Rust changes: `cargo test --manifest-path src-tauri/Cargo.toml`

End-to-end:
1. Set icon on a .md note via file explorer → verify `_icon`/`_color` in frontmatter
2. Set icon on a Type definition → verify `_icon: pack:name` format
3. Set icon on a folder → verify folder note created with `_icon`
4. Open note with old `icon: pack:name` → verify icon displays
5. Open note with old `_icon: name` (bare) → verify lucide fallback
6. Tab icons show colors from frontmatter
7. Non-.md file icons still work via JSON
