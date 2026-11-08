# 23: Break the properties / type-definitions / file-icons cycle

**What to build:**
1. **Precondition.** Check that sidebar 25 deleted TypeSidebar.svelte and TypeNoteList.svelte, which removes the component-level edges type-definitions -> file-icons / note-list / quick-switcher. If it did not, stop and report.
2. **Favorite toggle.** Move `toggleFavoriteForPath` from type-definitions.service.ts:289-296 to `properties/lifecycle.service.ts`, and drop that file's imports at lines 13-18.
3. **Frontmatter engine.** Move properties.logic, properties.types, yaml-quoting.logic and frontmatter-write.service to `core/frontmatter/`, rewriting every importer (about 38 files: 26 source, 4 of them in core, plus 12 tests). Two reasons: it cuts the last cycle edge (file-icons -> properties via `frontmatter-icon.service.ts`; moving that service up into properties fails because `file-icons.service.ts` imports it dynamically at :124, :134, :151, :161), and it removes the core -> properties edges in `meta-bind-input-plugin.ts`, `table-field.ts`, `widgets.ts` and `meta-bind-button-widget.ts`, which issue 31 needs gone.
4. **Other moved-path users.** Update issue 17's write-ratchet exemption path for `frontmatter-write.service.ts`, and count sidebar-redesign 26's `frontmatter-parity.test.ts` among the importers.
5. **Icon lookup.** Replace icon-resolver.ts:3 with a type-icon-lookup slot in file-icons, filled by `registerAppPorts()`.

**Blocked by:** 05, 21, 22

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** src/lib/features/{properties,type-definitions,file-icons,note-list,quick-switcher}, docs/adr/0003, 0026, 0029

- [x] Tests come BEFORE the change:
  - NoteRowMenu's favorite toggle writes `_favorite`, and a FrontmatterWriteError produces a toast
  - `resolveIconForPath` returns the type icon, and updates when the `typeDefinitionsStore` entries change (real store)
- [x] After the change, the same tests pass. With the lookup unset, `resolveIconForPath` returns the frontmatter icon or `undefined`, without throwing
- [x] The issue-05 cycle check reports no SCC containing properties, type-definitions or file-icons
- [ ] `grep -rn "#lib/features/properties/" src/lib/core` is empty, and the properties, icon and sidebar E2E specs pass

- [x] `layer-baseline.json` and `featureCycleEdges` (issues 04-05) shrink by exactly the edges this issue removes, in the same commit
## Notes

- **Resulting layer order:** core < file-icons < type-definitions < properties < {quick-switcher, note-list} < rail-shell < app.
- **search <-> tags:** issue 20 cuts it.
- **Size:** M-L.

## Comments

- 2026-11-01, branch `issue/23-break-properties-type-definitions-cycle`: moved `toggleFavoriteForPath` into `properties/lifecycle.service.ts`, moved the frontmatter engine (properties.logic, properties.types, yaml-quoting.logic, frontmatter-write.service) to `core/frontmatter/` with every importer rewritten, and replaced the icon-resolver's type-definitions import with a type-icon-lookup slot filled by `registerAppPorts()`. Review round 1: CHANGES_REQUESTED (E2E mock import, stale doc references, import order); fix round ran. Review round 2: APPROVED with one nit (ADR 0009 comma), fixed in deliver. Deliver: `pnpm check` 0 errors, vitest 406 files / 9616 passed / 1 skipped / 1 todo, `pnpm build` ok (exit 0, test-logs/architecture-stability/23-deliver.log); `bash scripts/e2e.sh` 290 passed (23-deliver-e2e.log). Criterion 4 stays unticked because round 2 marked it not met (E2E unrun at review time); deliver's E2E run covers it.
