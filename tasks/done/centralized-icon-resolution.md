# Centralized Icon Resolution

Standardize icon resolution across the entire app. Currently duplicated in 5+ components with inconsistent priority chains and a non-reactive pack cache bug.

## Tasks

- [x] Task 1: Add `packVersion` reactive signal to `fileIconsStore`
- [x] Task 2: Bump `packVersion` after packs load (callback in icon-data, wire in service)
- [x] Task 3: Await `preloadPacks` in `buildFrontmatterIconIndex`
- [x] Task 4: Create centralized resolver (`icon-resolver.ts`)
- [x] Task 5: Tests for resolver
- [x] Task 6: Replace FileTreeItem icon resolution
- [x] Task 7: Replace EditorTabs icon resolution
- [x] Task 8: Replace TypeSidebar icon resolution (3 blocks)
- [x] Task 9: Replace PropertiesView icon resolution
- [x] Task 10: Replace RelationshipSearch icon resolution
- [x] Task 11: AutoMoveRuleRow packVersion fix

## Notes

Priority chain (user-specified): frontmatter _icon > type definition icon > file-icons.json custom > fallback.
See plan file: `.claude/plans/peppy-yawning-petal.md`
