# 36 discovery: Periodic Notes and 1:1 live path examples and missing-template marks

## Files that change

- `src/lib/core/settings/sections/PeriodicNotesSection.svelte:36-48, 70-82, 84-96, 98-110, 112-124`: the Format and Template path rows of daily, weekly, monthly, quarterly, yearly get `layout="stacked"`; a muted "Today: ..." line under each Format input; a muted "File not found" under each Template path input.
- `src/lib/core/settings/sections/OneOnOneSection.svelte:76-86`: Template path row stacked, muted "File not found" under it.
- `src/lib/core/settings/settings.logic.ts`: one pure `isTemplateMissing(tree, vaultPath, templatePath)` shared by both sections (empty path, no vault, empty tree, a dot-prefixed segment all return false; else `findFileNode(tree, vault, `${vault}/${path}`) === null`). Imports `findFileNode` from `core/filesystem/fs.logic.ts` (core to core, no layer entry).
- Tests: `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`, `OneOnOneSection.test.ts`, `settings.logic.test.ts`.

## Plan

1. Failing component tests (fake `Date` only, system time 2026-11-18): "Today: Daily/2026-11-18.md"; editing the format updates it; equals `buildPeriodicNotePath('', folder, format, dayjs())` minus the leading slash; empty format gives an ISO timestamp name; missing-template cases with real `fsStore.setFileTree` and `vaultStore.open`; settings snapshot identical before/after render. Same template cases for 1:1.
2. Implement: `todayPath(format)` in the Section = `formatNow(format)` + `.md`, prefixed `folder/` when the folder is non-empty, the same join as `buildPeriodicNotePath` (`periodic-notes.logic.ts:9-21`). The Section imports `formatNow` from `#lib/utils/date.js`, never dayjs (`settings-copy.test.ts` bans the word outside comments).
3. Targeted checks: `pnpm check`, the three test files above, `settings-copy.test.ts`, `settings-headings.test.ts`, `layer-rules.test.ts`.

## Prior art

- `PeriodicNotesSection.test.ts` mount/render helper (ticket 22, `work/22`).
- `vi.setSystemTime` in `settings.service.test.ts:411`.
- `SettingItem` `layout="stacked"` (see `SettingItem.svelte`).

## Risks and defaults

- Default: the muted lines use `text-meta text-muted-foreground`, the SettingItem description style, with `data-` hooks for tests (`data-periodic-example`, `data-template-missing`).
- Default: "Today:" for every period (the Issue's wording), even weekly or yearly where it reads as "this period".
- A template path with a leading slash reads "File not found" (`${vault}//x` has an empty segment); not in the criteria, left as is.
- Formats with unescaped words (open-itens 226) show the wrong path, as the Issue intends.
- Display only: no store write in any render path; the before/after snapshot test guards it.
