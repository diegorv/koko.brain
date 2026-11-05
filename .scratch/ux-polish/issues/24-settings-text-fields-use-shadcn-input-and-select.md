# 24: Settings fields use the shadcn Input and Select, and setting rows size the control column by its content

**What to build:** Two changes to the Settings panel, built in this order in one branch (Issue 25 was merged into this one: its layout rule matches `[data-slot=input]`, which the Todoist and Sentry fields only carry after part 1, and both parts edit the same rows).

### Part 1: shadcn Input and Select

Every free-text field in Settings uses the shadcn `Input`, and the one native `<select>` becomes the shadcn `Select`, so every field gets the same fill, border and focus ring. Today four raw `<input>`s render darker than the other settings inputs (`bg-background` instead of `bg-input-bg`) and have no focus ring, and the heading font-weight picker is the only native select in the panel.

- `src/lib/core/settings/sections/TodoistSection.svelte` about line 22 (API token, `type="password"`) and about line 45 (Default label, `type="text"`): replace each raw `<input class="h-8 ...">` with `<Input type=... value=... oninput=... placeholder=...>` and no height or colour classes, so they match the other settings inputs (shadcn default). Keep both placeholders.
- `src/lib/core/settings/sections/SentrySection.svelte` about line 62 (DSN): `<Input type="url" ... autocomplete="off" aria-invalid=...>`. `type="url"` and `aria-invalid` must stay (`e2e/specs/settings.spec.ts:38-42` selects `input[type="url"]`).
- `src/lib/core/settings/sections/ThemeEditor.svelte` about line 140 (theme name): `<Input type="text" class="h-8 font-medium" bind:value={draftName} ...>` so the header row keeps its height. `ThemeEditor.test.ts:44` selects `input[type="text"]` and `.text-destructive` for the error; both stay.
- `src/lib/core/settings/sections/ThemeColorRow.svelte` about line 62 (hex): `<Input type="text" class="h-7 w-[5.5rem] px-2 font-mono text-xs md:text-xs" ...>` keeping `value`, `maxlength`, `oninput`, `onblur` and `onkeydown`. `md:text-xs` is needed because the Input base class carries `md:text-sm`, which `text-xs` alone does not override. It stays h-7 to match the 28px swatch.
- `src/lib/core/settings/sections/HeadingTypographyEditor.svelte` about line 77: the native `<select>` becomes `Select.Root type="single"` with `Select.Trigger size="sm" class="w-24"` and three `Select.Item`s (Bold, Semibold, Normal). Follow the `data-slot="select-value"` label pattern of `QueryjsSection.svelte:55-66`. `onValueChange` calls `updateLevel(level, 'fontWeight', value as HeadingFontWeight)`.
- Keep the native controls that have no shadcn equivalent: ThemeColorRow `type="color"` (about line 54) and ThemeEditor's hidden `type="file"` (about line 167).

### Part 2: content-sized control column, stacked layout for wide values

A settings row gives the label and description all the width the control does not need. Today `src/lib/core/settings/sections/SettingItem.svelte:21` reserves `w-2/5` of every row for the control, so a 36px switch still takes 40% of the row and descriptions wrap early with orphan words ("0.5)", "views", "directory"), while wide values are squeezed: the Editor font family truncates to "MonoLisa, ui-m" beside Browse, and the build string wraps to four monospace lines on Update and Troubleshooting.

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

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts e2e/specs/note-action-bar.spec.ts`.

Part 1:
- [x] Failing first: a new source scan `src/tests/lib/core/settings/settings-controls.test.ts` fails on any native `<select` and on any raw `<input` whose `type` is not `color` or `file`, across the Settings files. It fails today on Todoist (2), Sentry (1), ThemeEditor name (1), ThemeColorRow hex (1) and HeadingTypographyEditor (1)
- [x] The file discovery that `settings-headings.test.ts:18-31` does inline moves to a shared helper `src/tests/lib/core/settings/settings-files.ts`, which follows local PascalCase `.svelte` imports recursively, so `ThemeColorRow.svelte` (imported by `ThemeEditor.svelte`, not by a section) is scanned. `settings-headings.test.ts` uses the helper and stays green with its assertions unchanged
- [x] A new `src/tests/lib/core/settings/TodoistSection.test.ts` mounts the section with the real `settingsStore` (reset per test, the pattern in `settings-copy.test.ts`), finds both fields as `[data-slot="input"]`, types into each and asserts `settingsStore.todoist.apiToken` and `settingsStore.todoist.defaultLabel` changed; `@tauri-apps/plugin-opener` is the only mock
- [x] A HeadingTypographyEditor render test asserts the H1 weight trigger (`[data-slot="select-trigger"]`) shows the label of the stored weight (Bold for the default H1: the default H1 weight is `bold`, only H6 defaults to `semibold`)
- [x] `e2e/specs/settings.spec.ts` gains one case: Settings > Editor, open the H1 heading row, pick Bold in the weight Select (reuse the combobox pattern of `e2e/specs/event-calendar.spec.ts:813-830`) and assert the trigger reads Bold
- [x] The existing Sentry E2E case, `ThemeEditor.test.ts` and `EditorSection.test.ts` stay green

Part 2:
- [x] Failing first (E2E, real layout; jsdom computes none): `e2e/specs/settings.spec.ts` gains a "setting rows" case that opens the panel and measures with `boundingBox()`: (1) Troubleshooting > Debug mode: the description element is wider than 70% of its row (today at most about 57%); (2) Editor > Font family: the font Input is wider than 70% of its row (today about 35%); (3) Templates > Templates folder: the Input is at least 45% of its row (today about 37%). Run it and see all three fail before the part 2 change
- [x] A new `src/tests/lib/core/settings/SettingItem.test.ts` mounts SettingItem through a small test harness component with a snippet child and asserts: inline renders the control after the text with no `w-2/5` class anywhere; `layout="stacked"` puts the text block before the control inside a `flex-col` row; an empty `description` renders no description element (existing behavior, `{#if description}`)
- [x] The five rows listed above pass `layout="stacked"`; no other call site changes
- [x] `note-action-bar.spec.ts` (fills the Content width input through `div.bg-setting-item-bg`) stays green
- [x] `EditorSection.test.ts`, `RailSection.test.ts`, `EventCalendarSection.test.ts`, `GeneralSection.test.ts`, `OneOnOneSection.test.ts` and the UpdateSection tests stay green
- [x] The commit's Behavior section carries the before and after numbers from the E2E case

Both:
- [x] No source file changes outside the five part 1 sections, `SettingItem.svelte`, the five part 2 call sites (`EditorSection`, `SentrySection`, `TodoistSection`, `UpdateSection`, `TroubleshootingSection`) and their tests

## Notes

- Source (part 1): review section 3 Settings, row "Four input styles, three button styles, two select styles"; `.scratch/ux-polish/work/settings.md` P4. The review's line numbers for Todoist (27, 50), Sentry (69) and ThemeEditor (16) are stale; the lines above are current.
- Source (part 2, from Issue 25): review section 2 "Settings row anatomy" and section 3 row "Fixed 40% control column"; `.scratch/ux-polish/work/settings.md` P1; `.scratch/ux-polish/work/typespacing.md` H3 and R2. The four-line build wrap is in `20-settings-17-troubleshooting.png` and `18-update.png`, not in `01-editor.png` as review section 1 says.
- ADR-0002 (shadcn-svelte + bits-ui is the primitive layer) and CLAUDE.md "shadcn-svelte for UI primitives, custom only when needed".
- The `hint` prop from the same recommendation is a separate ticket in this cluster, so part 2 stays layout-only.
- Out of scope: the h-8 versus h-9 control height question, raw buttons (a separate ticket in this cluster), grouped cards with dividers (Issue 70), a `SettingsPage` wrapper, copy.
- Layer: `SettingItem` lives in `core/settings/sections/`; feature sections already import it, no new edge.
- Size: M (S + M merged).

## Comments

- 2026-11-05, branch `issue/24-settings-text-fields-use-shadcn-input-and-select`: the Todoist, Sentry, ThemeEditor name and ThemeColorRow hex fields use the shadcn `Input`, and the heading font weight uses the shadcn `Select`. `SettingItem` sizes the control column by its content (capped at half the row, with a free-text Input taking the full half) and has a `layout="stacked"` option, used on the five wide rows. New tests: a source scan for raw controls, a shared Settings file helper, Todoist, HeadingTypographyEditor and SettingItem unit tests, and two E2E cases. Review round 1: APPROVED, with 3 nits. Nit 1 is fixed here: the H1 criterion's wording said "Semibold for the defaults", but the default is Bold. Nits 2 and 3 were optional and are declined in `work/24/review.md` § Resolution. Full suite: the first run had 1 unrelated failure out of 11920 tests (`MarkdownEditor.test.ts` "Building index...", which passes 30/30 when run alone). The second run passed 510 files (11918 passed, 1 skipped, 1 todo), and the build passed.
