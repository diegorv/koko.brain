# 24: Settings text fields use the shadcn Input, and heading weight uses the shadcn Select

**What to build:** Every free-text field in Settings uses the shadcn `Input`, and the one native `<select>` becomes the shadcn `Select`, so every field gets the same fill, border and focus ring. Today four raw `<input>`s render darker than the other settings inputs (`bg-background` instead of `bg-input-bg`) and have no focus ring, and the heading font-weight picker is the only native select in the panel.

- `src/lib/core/settings/sections/TodoistSection.svelte` about line 22 (API token, `type="password"`) and about line 45 (Default label, `type="text"`): replace each raw `<input class="h-8 ...">` with `<Input type=... value=... oninput=... placeholder=...>` and no height or colour classes, so they match the other settings inputs (shadcn default). Keep both placeholders.
- `src/lib/core/settings/sections/SentrySection.svelte` about line 62 (DSN): `<Input type="url" ... autocomplete="off" aria-invalid=...>`. `type="url"` and `aria-invalid` must stay (`e2e/specs/settings.spec.ts:38-42` selects `input[type="url"]`).
- `src/lib/core/settings/sections/ThemeEditor.svelte` about line 140 (theme name): `<Input type="text" class="h-8 font-medium" bind:value={draftName} ...>` so the header row keeps its height. `ThemeEditor.test.ts:44` selects `input[type="text"]` and `.text-destructive` for the error; both stay.
- `src/lib/core/settings/sections/ThemeColorRow.svelte` about line 62 (hex): `<Input type="text" class="h-7 w-[5.5rem] px-2 font-mono text-xs md:text-xs" ...>` keeping `value`, `maxlength`, `oninput`, `onblur` and `onkeydown`. `md:text-xs` is needed because the Input base class carries `md:text-sm`, which `text-xs` alone does not override. It stays h-7 to match the 28px swatch.
- `src/lib/core/settings/sections/HeadingTypographyEditor.svelte` about line 77: the native `<select>` becomes `Select.Root type="single"` with `Select.Trigger size="sm" class="w-24"` and three `Select.Item`s (Bold, Semibold, Normal). Follow the `data-slot="select-value"` label pattern of `QueryjsSection.svelte:55-66`. `onValueChange` calls `updateLevel(level, 'fontWeight', value as HeadingFontWeight)`.
- Keep the native controls that have no shadcn equivalent: ThemeColorRow `type="color"` (about line 54) and ThemeEditor's hidden `type="file"` (about line 167).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] Failing first: a new source scan `src/tests/lib/core/settings/settings-controls.test.ts` fails on any native `<select` and on any raw `<input` whose `type` is not `color` or `file`, across the Settings files. It fails today on Todoist (2), Sentry (1), ThemeEditor name (1), ThemeColorRow hex (1) and HeadingTypographyEditor (1)
- [ ] The file discovery that `settings-headings.test.ts:18-31` does inline moves to a shared helper `src/tests/lib/core/settings/settings-files.ts`, which follows local PascalCase `.svelte` imports recursively, so `ThemeColorRow.svelte` (imported by `ThemeEditor.svelte`, not by a section) is scanned. `settings-headings.test.ts` uses the helper and stays green with its assertions unchanged
- [ ] A new `src/tests/lib/core/settings/TodoistSection.test.ts` mounts the section with the real `settingsStore` (reset per test, the pattern in `settings-copy.test.ts`), finds both fields as `[data-slot="input"]`, types into each and asserts `settingsStore.todoist.apiToken` and `settingsStore.todoist.defaultLabel` changed; `@tauri-apps/plugin-opener` is the only mock
- [ ] A HeadingTypographyEditor render test asserts the H1 weight trigger (`[data-slot="select-trigger"]`) shows the label of the stored weight (Semibold for the defaults)
- [ ] `e2e/specs/settings.spec.ts` gains one case: Settings > Editor, open the H1 heading row, pick Bold in the weight Select (reuse the combobox pattern of `e2e/specs/event-calendar.spec.ts:813-830`) and assert the trigger reads Bold
- [ ] The existing Sentry E2E case, `ThemeEditor.test.ts` and `EditorSection.test.ts` stay green
- [ ] No file outside the five listed sections and their tests changes

## Notes

- Source: review section 3 Settings, row "Four input styles, three button styles, two select styles"; `.scratch/ux-polish/work/settings.md` P4. The review's line numbers for Todoist (27, 50), Sentry (69) and ThemeEditor (16) are stale; the lines above are current.
- ADR-0002 (shadcn-svelte + bits-ui is the primitive layer) and CLAUDE.md "shadcn-svelte for UI primitives, custom only when needed".
- Out of scope: the h-8 versus h-9 control height question, raw buttons (a separate ticket in this cluster), any SettingItem layout change.
- Type scale: no copy changes.
- Size: S.
