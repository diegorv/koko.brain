# 25: Setting rows size the control column by its content, with a stacked layout for wide values

**What to build:** A settings row gives the label and description all the width the control does not need. Today `src/lib/core/settings/sections/SettingItem.svelte:21` reserves `w-2/5` of every row for the control, so a 36px switch still takes 40% of the row and descriptions wrap early with orphan words ("0.5)", "views", "directory"), while wide values are squeezed: the Editor font family truncates to "MonoLisa, ui-m" beside Browse, and the build string wraps to four monospace lines on Update and Troubleshooting.

Change `src/lib/core/settings/sections/SettingItem.svelte`:
- New optional prop `layout?: 'inline' | 'stacked'` (default `'inline'`), with JSDoc.
- Inline: row `flex min-h-14 items-center justify-between gap-4 rounded-lg px-4 py-3 bg-setting-item-bg`; the control column loses `w-2/5` and becomes `flex max-w-[50%] shrink-0 justify-end`, sized by its content. A free-text field must not shrink to its intrinsic width: when the column holds a shadcn Input that is not a number field it takes the full half. Implement it in SettingItem only, with the arbitrary variant `has-[[data-slot=input]:not([type=number])]:w-1/2` on the column; if the E2E below shows Tailwind does not generate it, use a `<style>` rule `.setting-control:has(:global([data-slot='input']:not([type='number']))) { width: 50%; }` instead. Do not edit call sites for this. Number inputs (`w-24`), selects (`w-44`), switches, buttons and the rail move buttons keep their own widths.
- Stacked: the row becomes `flex-col items-stretch gap-2` (same padding, background and `min-h-14`), the text block on top, the control below it at full width, left aligned.
- Label `text-row font-medium text-settings-text`, description `text-meta text-muted-foreground text-pretty` (pixel-identical sizes to today's `text-sm` / `text-xs`, now on the chrome scale).
- The root keeps the `bg-setting-item-bg` class: `e2e/specs/note-action-bar.spec.ts:104` locates rows by it.

Use `layout="stacked"` on the wide rows:
- `EditorSection.svelte` about line 39, Font family (Input plus Browse)
- `SentrySection.svelte` about line 58, Sentry DSN
- `TodoistSection.svelte` about line 18, API token
- `UpdateSection.svelte` about line 273, Current version (`BuildInfo`)
- `TroubleshootingSection.svelte` about line 24, Build (`BuildInfo`)

**Blocked by:** 24

**Status:** wontfix

**Merged into Issue 24** (2026-11-05): the whole scope and every criterion below now live in `24-settings-text-fields-use-shadcn-input-and-select.md` as part 2, built in the same branch.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts e2e/specs/note-action-bar.spec.ts`.

- [ ] Failing first (E2E, real layout; jsdom computes none): `e2e/specs/settings.spec.ts` gains a "setting rows" case that opens the panel and measures with `boundingBox()`: (1) Troubleshooting > Debug mode: the description element is wider than 70% of its row (today at most about 57%); (2) Editor > Font family: the font Input is wider than 70% of its row (today about 35%); (3) Templates > Templates folder: the Input is at least 45% of its row (today about 37%). Run it and see all three fail before the change
- [ ] A new `src/tests/lib/core/settings/SettingItem.test.ts` mounts SettingItem through a small test harness component with a snippet child and asserts: inline renders the control after the text with no `w-2/5` class anywhere; `layout="stacked"` puts the text block before the control inside a `flex-col` row; an empty `description` renders no description element (existing behavior, `{#if description}`)
- [ ] The five rows listed above pass `layout="stacked"`; no other call site changes
- [ ] `note-action-bar.spec.ts` (fills the Content width input through `div.bg-setting-item-bg`) stays green
- [ ] `EditorSection.test.ts`, `RailSection.test.ts`, `EventCalendarSection.test.ts`, `GeneralSection.test.ts`, `OneOnOneSection.test.ts` and the UpdateSection tests stay green
- [ ] The commit's Behavior section carries the before and after numbers from the E2E case

## Notes

- Source: review section 2 "Settings row anatomy" and section 3 row "Fixed 40% control column"; `.scratch/ux-polish/work/settings.md` P1; `.scratch/ux-polish/work/typespacing.md` H3 and R2. The four-line build wrap is in `20-settings-17-troubleshooting.png` and `18-update.png`, not in `01-editor.png` as review section 1 says.
- The `hint` prop from the same recommendation is a separate ticket in this cluster, so this change stays layout-only.
- Out of scope: grouped cards with dividers (the review calls it a separate, later visual change), a `SettingsPage` wrapper, control heights, copy.
- Layer: `SettingItem` lives in `core/settings/sections/`; feature sections already import it, no new edge.
- Size: M.
