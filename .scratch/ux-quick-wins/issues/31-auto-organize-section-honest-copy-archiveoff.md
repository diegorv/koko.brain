# 31: Auto Organize section: honest copy, archive-off hint, save-failure toast, excluded folders with feedback, named controls

**Origin:** design review 2026-11-17, proposals P68, P66 (hint), P08 (toast), P28 (section names), P150, prototype `.scratch/design-review/prototypes/settings-auto-organize.html`, research `.scratch/ux-quick-wins/research/verdict-settings-a.md` (ticket A) and `verdict-settings-b.md` (Q5) and `breakdown.md` (old ticket 30).

**What to build:** Split point if the run is too large: copy, hint, toast and names (items 1 to 4, `AutoOrganizeSection.svelte` and its test only) first, then excluded folders (item 5, adds `auto-organize.logic.ts`).

1. **Copy (P68).** Enable row description (`src/lib/features/auto-organize/AutoOrganizeSection.svelte:112`): "After a save, applies the rules below and the archive rules of your types: notes are moved, renamed or updated automatically." Rules help (`:151-154`): "Rules run top to bottom after a save. The first matching rule wins for rename, move to folder and run mod action. Set properties and create note apply from every matching rule. Your types' archive rules run last. Conditions use the same syntax as Collection filters (e.g. `file.hasTag('archive')`)." Excluded folders (`:179-181`): "Rules never run on notes inside these folders." because the hook skips every effect there (`auto-organize.service.ts:220-223`). No em dash (`settings-copy.test.ts:60`).
2. **Archive-off hint (P66, text only).** When Auto Organize is off and at least one `typeDefinitionsStore.typeMetadataMap` entry has `archiveTo`: `<p class="px-4 text-meta text-muted-foreground">` "N of your types set an archive folder. While Auto Organize is off, Archive marks a note as archived but does not move it." No Enable button: it would also start every enabled user rule (`auto-organize.service.ts:213-215`).
3. **Failed save (P08, toast only).** `saveConfig`'s `.catch` (`:33-39`) also calls `toast.error('Could not save auto-organize rules', { id: 'auto-organize-save' })`; the fixed id stops a burst stacking. The service and file format are unchanged.
4. **Names (P28, section only).** Enable switch "Enable Auto Organize", Debounce input "Debounce delay", Excluded folder input "Folder to exclude", each chip remove "Remove <folder> from excluded folders".
5. **Excluded folders (P150).** A pure `isDuplicateExcluded(list, folder)` (trimmed, case-insensitive) in `auto-organize.logic.ts`; a duplicate is not added and "Already excluded" shows in an `aria-live` line. The input gets a `<datalist>` of vault-relative folders (`collectAllDirPaths` + `getRelativePath`). A chip whose folder is not in the tree shows a muted "missing", compared case-insensitively like `isInExcludedFolder` (`auto-organize.logic.ts:874-896`), skipped when the tree is empty or the folder is dot-prefixed. Placeholder "e.g. _templates" (`:186`); "No excluded folders" when empty (`:202`). Stored shape unchanged.

Not in this ticket: the read-only "From your types" rule list, the loader guard and banner for an unreadable rules file (open-itens 031, deferred), `SettingItem` auto-naming and row click-through, any edit to `auto-organize.service.ts`. The debounce number-field commit is ticket 21.

**Size:** M (five concerns in one section).

**Blocked by:** 21

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh auto-organize-flows.spec.ts (the section markup changes).

- [ ] Failing test first, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`: the text contains "The first matching rule wins for rename, move to folder and run mod action", "apply from every matching rule", "archive rules run last" and "Rules never run on notes inside these folders", and no longer "determines the destination folder" or "never be automatically moved".
- [ ] With Auto Organize off and `typeDefinitionsStore.setTypeMetadataMap` holding two types with `archiveTo` and one without, the hint reads "2 of your types set an archive folder"; on, or no `archiveTo`, shows no hint; the section renders no new button.
- [ ] With `writeTextFile` (`@tauri-apps/plugin-fs`) rejecting, "Add rule" toasts "Could not save auto-organize rules" once and `autoOrganizeStore.rules` still holds the new rule. Mock `svelte-sonner` and the Tauri boundary, never the service.
- [ ] Adding "Archive", then "Archive" and "archive", leaves `['Archive']` and shows "Already excluded"; with `/vault/Archive` in the tree the datalist offers it; chip "Old Notes" shows "missing", "archive" and ".kokobrain" do not; an empty tree shows no marks; an empty list shows "No excluded folders". `isDuplicateExcluded` and the case-insensitive match are covered in `auto-organize.logic.test.ts`.
- [ ] The four controls are found by role and name; removing `_templates` by name empties `autoOrganizeStore.excludedFolders`.
- [ ] `settings-copy`, `settings-text` and `settings-controls` tests pass unchanged (still one raw button); `isInExcludedFolder` unchanged; `auto-organize.service.ts` is not in the diff.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes.

## Original proposal

- **P68.** The copy describes "move" and "first match", not how rules work. Rewrite the toggle description and help text (first match wins for rename, move and mod actions; every match applies for set-properties and create-note; type lifecycle rules run after user rules).
- **P66 (hint).** Type archive rules are invisible and gated by a master switch that is off by default. Add a line under the toggle when `archiveTo` is set and Auto Organize is off. The read-only group and the Enable button are not shipped.
- **P08 (toast).** A failed save shows `toast.error('Could not save auto-organize rules')`. The loader guard and banner stay deferred.
- **P28 (section names).** Controls are labelled by a neighbouring span; only the explicit `aria-label`s of this section ship.
- **P150.** Excluded folders accept anything: datalist suggestions, "Already excluded", a mark for missing folders, an "e.g. _templates" placeholder and "No excluded folders".

## Problem

The section says "move" and "first match" for a hook that also renames, sets properties, creates notes and runs mods, with different precedence per effect. A type that sets an archive folder silently does nothing while the master switch is off. A failed rules save only reaches the log. The excluded-folder list swallows duplicates, accepts typos and has unnamed controls.

## Evidence

Checked at 085b23c5d.

- `AutoOrganizeSection.svelte:112,151-154,179-181` (old copy), `:33-39` (`.catch` only calls `error()`), `:90-97` (case-sensitive `includes`), `:114,127,184,207` (unnamed controls), `:186` (placeholder).
- `auto-organize.service.ts:283-330` real precedence, `:220-223` excluded-folder early return, `:211,231` return when off, `:132-135,186-200` load and save.
- `settings.store.svelte.ts:110-112` default off; `lifecycle.service.ts:87-93` Archive only flips `_archived`; `type-lifecycle-rules.ts:27-28` rules come from `archiveTo`.
- `help/documentation/22-auto-organize.md:43` is already right. No test asserts the old strings.
- `settings-controls.test.ts:24` RAW_BUTTONS stays 1; a `<datalist>` is not flagged (`:30-38`). `auto-organize-flows.spec.ts:27` uses the placeholder and `:44` `getByRole('switch').nth(1)`, neither depends on the new names.

## Why blocked

- 21: it edits the Debounce block of `AutoOrganizeSection.svelte` and `AutoOrganizeSection.test.ts`, the same file and test this ticket edits on other lines.

## Sequence with

Ticket 32 adds a focus prop to `AutoOrganizeSection.svelte` (two or three lines). Ticket 22 touches other Settings sections only. Open-itens 031 (rules loader) stays deferred. Frontmatter-rules 05 evaluates rules in the service; this ticket does not touch the service.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
