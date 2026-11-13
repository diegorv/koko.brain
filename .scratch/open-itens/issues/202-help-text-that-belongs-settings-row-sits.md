# 202: Help text that belongs to a settings row sits inside that row through a SettingItem hint prop

**Origin:** `audit-2026-11-05` Issue 90, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/26-setting-item-hint-prop.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Partially fixed layout tidiness. The UpdateSection item is obsolete, and the Sentry paragraph keeps its current visibility.

**Audit check at `5f8003d67`:** partially_fixed (polish, low). Done: nightly paragraph gone from UpdateSection (c41976f92) and the three remaining paragraphs share px-4 text-meta text-muted-foreground (ecd4cadc2). Missing: src/lib/core/settings/sections/SettingItem.svelte:4-17 has no hint prop (description rendered at :28 only). Paragraphs still float outside rows: TodoistSection.svelte:31-39 (with openUrl link button), SentrySection.svelte:90-92 (inside {#if settingsStore.sentry.enabled}, after the test-event rows), TypesSection.svelte:54-57. settings-text.test.ts:73-82 pins px-4 on those three pages. No SentrySection.test.ts or TypesSection.test.ts exists.

**Stale in the text below:** UpdateSection item and its render criterion are obsolete. The Sentry privacy paragraph is only rendered when Sentry is enabled today, so the Issue's 'visible before turning monitoring on' would be a behavior change, not just a move. Text is readable as is, so this is layout tidiness, not a defect.

**Note (2026-11-06):** the UpdateSection nightly paragraph is gone (c41976f92), so it is not moved, and the Sentry privacy hint keeps its current visibility (shown when monitoring is on). Any wording below that says otherwise is superseded.

**What to build:** Help paragraphs that explain one setting render inside that setting's row, as a second muted line, instead of floating between cards with their own padding and margins (today four different treatments: `px-4 text-xs`, `-mt-1 mb-2 text-xs`, bare `text-sm`, plus a link line). Add an optional `hint?: Snippet` prop to `src/lib/core/settings/sections/SettingItem.svelte`, rendered under the description in the text column with `text-meta text-muted-foreground text-pretty`, and move these paragraphs into it:

- `TodoistSection.svelte` about lines 31-39: "Get your token at todoist.com/prefs/integrations" (the inline link button stays a button, same `openUrl` call) becomes the hint of the API token row.
- `SentrySection.svelte` about lines 90-92: the privacy paragraph ("This sends error events and stack traces only...") becomes the hint of the Error monitoring row. It is then visible before the user turns monitoring on, which is the point: say this in the commit's Behavior section.
- `UpdateSection.svelte` about lines 249-255: the nightly versioning paragraph becomes the hint of the Release channel row (about line 229); the `-mt-1 mb-2` negative margin goes away. Keep its text as is (the copy ticket in this cluster rewrites it).
- `TypesSection.svelte` about lines 54-57: the "Each type also chooses its own subfolder..." paragraph becomes the hint of the Base folder row (about line 39).

Leave in place: the Sentry `role="alert"` and `role="status"` lines (dynamic state, E2E selects them), Search's download and index status lines, and Auto Move's two group paragraphs (they describe a group, not a row).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] Failing first: render tests that find each moved text inside the right row (`closest('.bg-setting-item-bg')` whose label is the row's label): Todoist link text in the API token row (extend `TodoistSection.test.ts`), the Sentry privacy text in the Error monitoring row with monitoring on, keeping its current visibility (new `SentrySection.test.ts`, real `settingsStore`, mock only the Sentry service module), the subfolder paragraph in the Base folder row (new `TypesSection.test.ts`). All fail before the change because the text sits outside any row
- [ ] `SettingItem.test.ts` asserts a row without `hint` renders no hint element, and a row with one renders it after the description
- [ ] Clicking the Todoist link still calls `openUrl('https://todoist.com/prefs/integrations')`
- [ ] The Sentry E2E case stays green
- [ ] No other paragraph in Settings moves

## Notes

- Source: review section 2 "Settings row anatomy" (`hint` prop instead of floating paragraphs); `.scratch/archived/ux-polish/work/settings.md` P5; `.scratch/archived/ux-polish/work/typespacing.md` R2.
- Out of scope: a page-level description line and group descriptions (no `SettingsPage` wrapper in this cluster), copy changes.
- Size: S.

## Partial work outside relay (2026-11-05)

**Done:**
- Commit `c41976f92` removed the nightly versioning paragraph from `UpdateSection.svelte` by owner decision. The `UpdateSection.svelte` item and its render criterion no longer apply.
- Commit `ecd4cadc2` gave the Todoist, Sentry and Types paragraphs one treatment (`px-4 text-meta text-muted-foreground`), but they still float between cards.

**Missing:**
- The `hint` prop on `SettingItem.svelte` and its test.
- Moving the Todoist, Sentry and Types paragraphs into their rows, with their render criteria.
- `settings-text.test.ts` lists these pages in "aligns a note after a row". Once the paragraphs move, update that list on purpose so it does not pass with nothing left to check.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/26-setting-item-hint-prop.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: criteria matched to the audit header after the order review.
