# 06: Rename Auto Move to Auto Organize in the app and the help

**What to build:** the feature now moves notes and sets their properties, icons and colors (Issues 01-03), so "Auto Move" no longer describes it. Every name the user sees becomes **Auto Organize**. Internal names stay as they are.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Renamed**, user-visible only:
   - the Settings navigation label, `{ id: 'auto-move', label: 'Auto Move' }` (`src/lib/core/settings/settings.logic.ts:279`);
   - the section heading and the "Enable Auto Move" switch label (`src/lib/features/auto-move/AutoMoveSection.svelte:108,111`);
   - every other user-facing string in `src/lib/features/auto-move/*.svelte` and in Settings (hints, placeholders, empty states). Find them with a grep for `Auto Move` and `auto-move` in strings.
2. **Kept as they are.** They are internal, and renaming them would need a config migration for no user benefit:
   - the folder `src/lib/features/auto-move/` and the file and symbol names inside it;
   - the settings section id `'auto-move'` (`settings.types.ts:359`, `SettingsPanel.svelte:54,81`);
   - the settings key `autoMove`;
   - the vault file `.kokobrain/auto-move-rules.json`;
   - the `AUTO-MOVE` log tag.
3. **Help pages:**
   - `help/documentation/22-auto-move.md`: title, intro and every prose mention become Auto Organize. Add one line near the top: "Formerly called Auto Move." Keep the filename, so links, the wiki sync and search keep working.
   - `help/documentation/README.md:43`: the row reads Auto Organize, described as "Move notes and set their properties, icons and colors with rules". Today it says "Automatically move notes to folders based on expression rules".
   - `help/documentation/19-settings.md:9,236-245`: the group list and the section use the new name. The section also says that a rule can set properties, not only move notes.
   - Prose mentions in `01-getting-started.md`, `03-editor.md`, `12-collection.md`, `25-types-and-relationships.md`, `28-mods.md` and `help/documentation/mods/*.md`. Code identifiers and file paths in those pages stay.
4. The Settings icon (`FolderOutputIcon`, `SettingsPanel.svelte:54`) stays. Changing it is the owner's call and not part of this Issue.

### Acceptance

- [ ] Failing test first: a Settings test asserts that the navigation shows "Auto Organize" and no longer shows "Auto Move". Use the existing settings logic or panel test.
- [ ] The section heading and the switch read "Auto Organize" (`AutoMoveSection` test).
- [ ] A grep for the visible string `Auto Move` under `src/lib/` finds no user-facing string. Code identifiers are fine.
- [ ] The help pages listed in Behavior 3 use the new name, and `22-auto-move.md` says it was formerly called Auto Move.
- [ ] `src/tests/help/` and `src/tests/scripts/sync-wiki-docs.test.ts` pass unchanged or with updated expectations.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Origin:** the owner chose the name "Auto Organize" on 2026-11-10, from Automations, Note Rules, Rules and Auto Organize.
- Blocked by 03, because 03 rewrites `AutoMoveRuleRow.svelte` in the same section.

## Comments
