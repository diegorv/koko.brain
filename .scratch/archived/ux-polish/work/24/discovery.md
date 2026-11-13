# Issue 24 discovery

No `spec.md` for ux-polish; the Issue, `work/settings.md` (P1, P4) and `work/typespacing.md` are the source.

## Files that change

Part 1 (sections under `src/lib/core/settings/sections/`):
- `TodoistSection.svelte:22, 45` raw `<input>` -> `Input` (no h/colour classes, placeholders kept).
- `SentrySection.svelte:62` -> `Input type="url" autocomplete="off" aria-invalid=...`.
- `ThemeEditor.svelte:140` -> `Input type="text" class="h-8 font-medium" bind:value={draftName}`; `:167` file input stays.
- `ThemeColorRow.svelte:62` -> `Input type="text" class="h-7 w-[5.5rem] px-2 font-mono text-xs md:text-xs"`; `:54` color input stays.
- `HeadingTypographyEditor.svelte:77` native select -> `Select.Root type="single"` + `Select.Trigger size="sm" class="w-24" aria-label="Font weight"` + 3 items, label span as in `QueryjsSection.svelte:55-66`.

Part 2:
- `SettingItem.svelte:4-24` `layout` prop; inline column `flex max-w-[50%] shrink-0 justify-end has-[[data-slot=input]:not([type=number])]:w-1/2`; stacked `flex-col items-stretch gap-2`; label `text-row`, description `text-meta text-pretty`.
- `layout="stacked"` at `EditorSection.svelte:39`, `SentrySection.svelte:58`, `TodoistSection.svelte:18`, `UpdateSection.svelte:273`, `TroubleshootingSection.svelte:24`.

## Tests

- New `src/tests/lib/core/settings/settings-files.ts`: the recursive file discovery (BFS over local PascalCase `.svelte` imports); `settings-headings.test.ts` uses it. Recursion adds `ThemeColorRow`, `AutoMoveRuleRow`, `EventColorSwatches`, `BuildInfo`, none with an `<h2-6>`, so the heading assertions keep passing.
- New `settings-controls.test.ts` (source scan, fails first on 6 sites).
- New `TodoistSection.test.ts` (pattern: `settings-copy.test.ts` / `EditorSection.test.ts`, real store, only `@tauri-apps/plugin-opener` mocked).
- New `HeadingTypographyEditor.test.ts` (render, trigger label).
- New `SettingItem.test.ts` + harness `src/tests/fixtures/SettingItemHarness.svelte` (pattern: `KanbanViewHarness.svelte`).
- `e2e/specs/settings.spec.ts`: weight Select case (pattern `event-calendar.spec.ts:813-830`) and the "setting rows" measurement case (failing first).

## Defaults taken

- The Issue says the H1 trigger shows "Semibold for the defaults", but the store default for h1 is `bold` (`settings.store.svelte.ts:84`; only h6 is semibold). The render test asserts Bold for the default H1 and Semibold after the store's h1 weight is set to semibold, so it checks the stored-weight label both ways.
- E2E "pick Bold" on H1: since H1 is already Bold, the case picks Normal first, asserts it, then picks Bold and asserts Bold, so the pick is observable.
- The trigger gets `aria-label="Font weight"` so the E2E can find it as a combobox (the pattern uses the accessible name); the E2E scopes it to the open H1 `<details>`.
- Stacked rows: control column `flex w-full justify-start` (no max-width, no has-variant), so the 50% rule applies to inline only.

## Risks

- Tailwind may not emit the `has-[...]` arbitrary variant; the E2E row case would show it (fallback: scoped `<style>` rule from the Issue).
- `Input` base sets `text-foreground/80` and `font-medium`-less text; ThemeColorRow loses `text-settings-text`/`rounded-xs` (Issue asks for shadcn default look).
