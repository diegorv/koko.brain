# 06: Rename Auto Move to Auto Organize everywhere

**What to build:** the feature now moves notes and sets their properties, icons and colors (Issues 01-03), so "Auto Move" no longer describes it. Rename it to **Auto Organize** everywhere: user-visible strings, code, config and help. **No migration:** the owner decided on 2026-11-10 that old configs are not carried over.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Nothing under `src-tauri/` uses the name.

### Behavior

1. **User-visible:**
   - the Settings navigation label (`src/lib/core/settings/settings.logic.ts:279`);
   - the section heading and the "Enable Auto Move" switch (`AutoMoveSection.svelte:108,111`);
   - every hint, placeholder and empty state in the feature.
   
   All of them say Auto Organize.
2. **Code:**

   | Today | After |
   |---|---|
   | `src/lib/features/auto-move/` | `src/lib/features/auto-organize/` |
   | `src/tests/lib/features/auto-move/` | `src/tests/lib/features/auto-organize/` |
   | `AutoMove*` components, types and functions; `autoMoveStore`; `auto-move.*.ts` files | `AutoOrganize*`; `autoOrganizeStore`; `auto-organize.*.ts` |
   | settings section id `'auto-move'` (`settings.types.ts:359`, `SettingsPanel.svelte:54,81`, `settings.logic.ts:279`) | `'auto-organize'` |
   | settings key `autoMove`, `updateAutoMove` (settings store, types, persistence) | `autoOrganize`, `updateAutoOrganize` |
   | vault file `.kokobrain/auto-move-rules.json` | `.kokobrain/auto-organize-rules.json` |
   | log tag `AUTO-MOVE` | `AUTO-ORGANIZE` |
   
   Keep file contents and behavior identical: this is a rename only. Use `git mv`, so history follows the files.
3. **No migration.** The app never reads `auto-move-rules.json` or the `autoMove` settings key again. An existing vault starts with Auto Organize disabled, the default, and with no rules. Do not add a fallback read, a copy step or a legacy alias.
4. **Architecture baseline:** rename the three `auto-move -> ...` entries in `src/tests/lib/architecture/feature-cycle-baseline.json:4-6` to `auto-organize -> ...` in place. The count does not change. The owner signed this off on 2026-11-10 as part of this rename. It is not a new entry. Check `layer-baseline.json` and the composition-root list for the old path too.
5. **Help and examples:**
   - `git mv help/documentation/22-auto-move.md help/documentation/22-auto-organize.md`. Update every link to it across `help/`, `README`s and the in-app help. Add one line near the top: "Formerly called Auto Move."
   - `help/examples/auto-move-features/` becomes `help/examples/auto-organize-features/`, including its `.kokobrain/auto-move-rules.json`. Update `help/examples/SCOPING.md` and `src/tests/help/examples-scoping.test.ts`.
   - `help/documentation/README.md:43`: the row reads Auto Organize, described as "Move notes and set their properties, icons and colors with rules".
   - `help/documentation/19-settings.md:9,236-245`: the new name, the new key and file names, and a line saying a rule can set properties, not only move notes.
   - Prose and identifiers in `01-getting-started.md`, `03-editor.md`, `12-collection.md`, `25-types-and-relationships.md`, `28-mods.md` and `help/documentation/mods/*.md`. That includes `autoMove`/`updateAutoMove` in `mods/09-raw-app.md:927,945`. The raw mod API is unstable, and no owner mod uses those names (checked in `~/kokobrain-vaults/kokobrain-mods-src` on 2026-11-10).
   - Check `scripts/sync-wiki-docs` and its test for a hard-coded page name.
6. **Not renamed:** `.scratch/` history, ADRs, and past commit messages. The Settings icon (`FolderOutputIcon`) stays; changing it is the owner's call.

### Acceptance

- [ ] Failing test first: a Settings test asserts that the navigation shows "Auto Organize" under the section id `auto-organize`.
- [ ] A service test asserts that the rules load from `.kokobrain/auto-organize-rules.json`, and that a vault holding only `auto-move-rules.json` loads no rules.
- [ ] A case-insensitive grep for `auto-move`, `automove`, `auto_move` and `Auto Move` over `src/`, `help/`, `e2e/` and `scripts/` finds only the "Formerly called Auto Move" line and the `.scratch` history.
- [ ] `feature-cycle-baseline.json` has the same number of entries, with `auto-organize` in place of `auto-move`, and `layer-rules.test.ts` passes.
- [ ] `src/tests/help/` and `src/tests/scripts/sync-wiki-docs.test.ts` pass with the renamed page and examples.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Origin:** the owner chose the name "Auto Organize" on 2026-11-10, from Automations, Note Rules, Rules and Auto Organize. The owner then asked for a full rename with no migration: no vault uses Auto Move today, so nothing is lost.
- Blocked by 03, because 03 rewrites `AutoMoveRuleRow.svelte`. Doing the rename after 03 avoids a conflict on every file of the feature.
- Large but mechanical: about 62 files mention the name.

## Comments
