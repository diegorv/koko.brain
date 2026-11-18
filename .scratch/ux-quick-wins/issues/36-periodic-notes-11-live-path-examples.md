# 36: Periodic Notes and 1:1: live path examples and missing-template marks

**Origin:** design review 2026-11-17, proposal P124 (part), prototype `.scratch/design-review/prototypes/settings-auto-organize.html`, research `.scratch/ux-quick-wins/research/verdict-settings-b.md` (Q7) and `breakdown.md` (old ticket 35).

**What to build:**

1. **Stacked rows.** The Format and Template rows of each period in `src/lib/core/settings/sections/PeriodicNotesSection.svelte` (`:36-48` and the other periods) and the Template path row in `OneOnOneSection.svelte` (`:76-86`) use `SettingItem` `layout="stacked"` so long paths are not truncated in a half-width column.
2. **Live example under each Format.** A muted "Today: <folder>/<formatNow(format)>.md" using the existing `formatNow` (`src/lib/utils/date.ts:15-17`, the same dayjs plugins `buildPeriodicNotePath` relies on, `:8-12`), joined as `buildPeriodicNotePath` joins (`periodic-notes.logic.ts`, called from `periodic-notes.service.ts:65-67` with a plain `dayjs()`), so "today formatted" is exactly the file that opens. An empty format shows the timestamp a create really makes (`dayjs().format('')` returns the default ISO string), not an "invalid" marker. The Section never imports dayjs (`settings-copy.test.ts:56`); no new date helper.
3. **Missing-template mark.** Under each periodic Template path and the 1:1 Template path, a muted "File not found" when all hold: the path is non-empty, a vault is open, `fsStore.fileTree` is loaded, no segment is dot-prefixed (`scan_vault` skips dot folders, `src-tauri/src/commands/vault.rs:111,151`, so a dot-folder template would read "not found" while existing), and `findFileNode(fsStore.fileTree, vault, `${vault}/${path}`)` is null. The services resolve the template as `${vaultPath}/${templatePath}` (`periodic-notes.service.ts:55`, `one-on-one.service.ts:87-88`) and a `readTextFile` failure silently falls back to the inline template (`note-creator.service.ts:52-56`), so a typo is invisible today.
4. **Display only.** No setting, service or file is written or changed; `settingsStore.periodicNotes` and `oneOnOne` are identical before and after rendering.

Not in this ticket: the one-table layout of the section (P125, M, revisit after this), the 1:1 Folder and Filename format examples (they need the `{person}` substitution path verified), Calendar "Day starts at" (kept as it is), and the Auto-pin disabled state (ticket 22).

**Size:** S.

**Blocked by:** 22

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run (no E2E selector changes).

- [ ] Failing test first, `src/tests/lib/core/settings/PeriodicNotesSection.test.ts` (created by ticket 22; extend it): with system time 2026-11-18, folder `Daily`, format `YYYY-MM-DD` the section shows "Today: Daily/2026-11-18.md"; editing the format updates it; the line equals `buildPeriodicNotePath('', folder, format, dayjs())` without the leading slash; an empty format shows a timestamp name.
- [ ] A template path absent from a loaded tree shows "File not found"; present, empty, dot-prefixed, no vault or an empty tree shows nothing. Real `fsStore` and `vaultStore`, no mock.
- [ ] Same checks for the 1:1 Template path in `src/tests/lib/core/settings/OneOnOneSection.test.ts`.
- [ ] `settingsStore.periodicNotes` and `oneOnOne` are identical before and after rendering; `settings-copy.test.ts` and `layer-rules.test.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P124 (part).** Path and format fields have no validation or preview. A live example under each format ("Today: Daily/2026-11-17.md"), a muted "File not found" under template paths, and the stacked layout. Validation: revise, "Day starts at" kept; the 1:1 format examples and Calendar "Day starts at" are not shipped.

## Problem

Folder and format fields are truncated free text with no example of the file they produce, and a template path with a typo is invisible: the app silently falls back to an inline template.

## Evidence

Checked at 085b23c5d.

- `PeriodicNotesSection.svelte:36-48` plain inline inputs; `OneOnOneSection.svelte:76-86` template path.
- `periodic-notes.service.ts:55,65-67`, `one-on-one.service.ts:87-88`, `note-creator.service.ts:52-56`.
- `utils/date.ts:8-17` `formatNow` and the plugins; imported by `periodic-notes.logic.ts:2`.
- `src-tauri/src/commands/vault.rs:111,151` dot folders skipped, as P150 (ticket 31) also guards.
- Open-itens 226 (help 08 unescaped formats) is not covered; the live example will show the wrong path for such formats, which helps the owner see it.

## Why blocked

- 22: it edits `PeriodicNotesSection.svelte` (Auto-pin `disabled`) and creates `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`, the file this ticket extends.

## Sequence with

Ticket 22 (see above). Tension recorded, not a blocker: stacking ten rows makes the section longer, which P125 (deferred) revisits. Ticket 21 edits `EditorSection.svelte` and other Settings sections, not these two files.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
