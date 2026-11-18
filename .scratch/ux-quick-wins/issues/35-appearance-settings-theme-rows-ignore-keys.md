# 35: Appearance settings: theme rows ignore keys from their buttons, one catalog error with its reason, Install and apply, a theme editor that confirms discards and restores the theme on close

**Origin:** design review 2026-11-17, proposals P108, P107 (part), P87 (theme row), prototype `.scratch/design-review/prototypes/color-contrast-theming.html` (P107, P108) and `feedback-components.html` (P87), research `.scratch/ux-quick-wins/research/verdict-color.md` (Q4), `verdict-feedback-b.md` (QB3) and `breakdown.md` (old ticket 28). Absorbed open-itens Issue: 155 (leaving the theme editor restores the theme), `.scratch/open-itens/issues/155-leaving-theme-editor-any-way-other-than.md`.

**What to build:** Split point if the run is too large: items 1 to 3 (theme row keys, catalog error, Install and apply; `AppearanceSection.svelte` only) first, then items 4 and 5 (theme editor; `ThemeEditor.svelte`, `ThemeColorRow.svelte`).

1. **Theme row keys (P87).** The row keydown (`src/lib/core/settings/sections/AppearanceSection.svelte:172-178`) selects only when the row itself is the target (`e.target === e.currentTarget`), and Space calls `preventDefault`. Today Edit, Duplicate and Delete stop only `click` (`handleEdit :111-112`, `handleDuplicate :118-119`, `deleteTheme :92-93`), so Enter on Delete of a non-active theme first makes it active, then `deleteTheme` sees it as active and resets to the default (`:97-99`): the real active theme is lost. The guard fixes that too. Keep the diff to the keydown handler.
2. **One catalog error (P108).** The catalog failure no longer toasts (`:44-54`); the inline error (`:261-268`) keeps Retry and shows `err.message`, because today only the toast carries the reason (for example "not valid JSON"). No caching (ADR-0035).
3. **Install and apply (P108).** An install entry gets a primary "Install and apply" and an outline "Install" with today's behaviour (`:57-65`). "Apply" is one `settingsStore.updateAppearance({ ...result.appearance, activeTheme: pkg.name })` then `applyActiveTheme()`; `installThemePackage` names the theme `pkg.name` (`theme-package.logic.ts:212-219`). Existing settings key, no schema change; install failures and a name collision keep their toast.
4. **Discard confirm (P107 part).** In the theme editor Back (`src/lib/core/settings/ThemeEditor.svelte:133`) and Cancel (`:149`) on a dirty draft show an inline "Discard changes?" row with Keep editing and Discard; a clean draft cancels at once.
5. **Restore on close (155).** `ThemeEditor` re-applies the active theme in `onDestroy` (`applyActiveTheme()`, idempotent after Save), so Esc, X and switching sections no longer leave the draft painted on `:root`. `SettingsPanel.svelte` (on the mvp-claude diff) is not touched. The colour picker (`ThemeColorRow.svelte:55-60`) and hex field (`:62-70`) get accessible names from the row label, the hex one with a "hex" suffix.

Not in this ticket: Simple mode through `buildTheme`, per-token reset and grouping (P107 rest, L), the theme row as a real radio group (P87 rest), the `NoteRow` pills and snapshot reveal (P87 other parts), InlineAlert for the catalog box (open-itens 205 comes after this ticket), and any Undo for deleted themes (deferred).

**Size:** M (three independent fixes in one section).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run (no selector used by an E2E spec changes; the settings E2E specs do not select these rows).

- [ ] Failing test first, `src/tests/lib/core/settings/AppearanceSection.test.ts` (real `settingsStore`): bubbling Enter and Space on Duplicate (and Edit for a user theme) of a non-active row leave `appearance.activeTheme` unchanged; Enter on Delete of a non-active user theme keeps the previous theme active; Enter on the row itself still selects it (twin of the click tests at `:418-440`).
- [ ] Failing test first: with the catalog fetch rejected (only the `theme-catalog.service` network call mocked), `toast.error` is not called and `theme-catalog-error` shows Retry and the message. This replaces the assertions at `:316` and `:327`, changed on purpose.
- [ ] "Install and apply" adds the theme, sets `activeTheme`, and `:root --background` equals the built theme's computed value (compared to the built theme, not a literal, so a later Default-theme change does not break it); "Install" leaves `activeTheme`; a name collision still toasts and changes nothing.
- [ ] Failing test first (155), `src/tests/lib/core/settings/ThemeEditor.test.ts`: with Default active, open Create new theme, change a colour, unmount without Save: `:root` holds the active theme's value and `appliedThemeStore.isDark` matches.
- [ ] Back on a clean draft calls `onCancel` once; after a colour change Back shows "Discard changes?" and `onCancel` fires only on Discard; Keep editing leaves the draft.
- [ ] `getByRole` finds both inputs of a row by its label (hex with a "hex" suffix); the first-button queries in `AppearanceSection.test.ts` (`:90,:92,:105,:139,:157,:182,:210,:232,:267`) now target buttons by their text.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P108.** The theme catalog reports the same failure twice and does not finish the install. Remove the toast, keep the inline error and Retry, add "Install and apply". Validation: revise, no caching.
- **P107 (part).** The theme editor exposes 128 raw tokens with no simple mode or reset. Only "confirm Cancel on a dirty draft" and "label the swatches" ship; Simple mode and per-token reset do not.
- **P87 (theme row).** Interactive controls are nested inside other interactive controls; theme-row Edit also selects the theme. Stop the row selecting on keydowns from its children.
- **Open-itens 155.** Leaving the theme editor restores the theme (folded in so a confirm on Back is not undermined by Esc).

## Problem

Pressing Enter on a theme row's Edit, Duplicate or Delete also selects and saves that theme, and Delete can then wipe the real active theme. A catalog failure is announced twice and Install does not apply the theme. The theme editor discards a draft on Back or Cancel without asking, and leaving by Esc, the X or another section keeps the draft painted on the app. Swatches and hex fields have no names.

## Evidence

Checked at 085b23c5d.

- `AppearanceSection.svelte:172-178` (`div role="button"`, keydown with no target check), `:192-239` button handlers stop only `click`, `:87-89` `selectTheme` writes `activeTheme`, `:44-54` toast plus `catalogStatus = 'error'`, `:261-268` generic inline error and Retry.
- `ThemeEditor.svelte:133,149` call `onCancel` directly; `ThemeColorRow.svelte:55-70` inputs have no accessible name. No teardown in `ThemeEditor.svelte` or `AppearanceSection.svelte`.
- `SettingsPanel.svelte:101-110` closes on Esc without telling the editor (mvp-claude file; not edited).
- `theme.service.test.ts:224-230` pins `applyStoredTheme()` at layout start, so `applyActiveTheme()` is the right restore.
- `help/documentation/26-theming.md:57` (Install bullet) names the new button.

## Sequence with

`AppearanceSection.svelte` is also edited by the feedback-a and feedback-b work that is already in this ticket (the theme row keydown), and no other ticket in this folder edits it. Ticket 40 (Default theme tab strip) changes Default token values in the theme logic, which is why the acceptance compares against the built theme. Open-itens 205 (InlineAlert) runs after this ticket. Mvp-claude changes `SettingsPanel.svelte` and `settings.*.ts`, not these files.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
