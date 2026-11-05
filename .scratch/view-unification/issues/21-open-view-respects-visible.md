# 21: Palette Open view respects `_visible: false`

**What to build:** `commands.ts:69-84` adds an "Open view" command for every `.view` in the tree, including hidden ones, and its doc comment pins that. Once tables are hidden `.view` files (Issue 22), they would fill the palette.

Skip a view when `!getViewVisible(entry)`. A view with no entry yet counts as visible (`type-sidebar.logic.ts:376`); keep that rule.

A hidden view stays reachable through the Files navigator, the Quick Switcher (by file name), a pin and a meta-bind button.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: `commands.test.ts:570` changes to the new behavior. A hidden view has no command, and a visible one does. This test pins the old rule, and the owner discussed changing it.
- [ ] Docs corrected: `help/documentation/06-search-and-navigation.md:61`, `01-getting-started.md:101`, and the `_visible` row in `25-types-and-relationships.md:411`.
- [ ] The `commands.ts` doc comment states the new rule.

## Notes

- **Size:** S.
