# 37: Leaving the theme editor any way other than Save puts the active theme back on the app

**What to build:** The theme editor paints its unsaved draft on :root on every color change or import (ThemeEditor.svelte:67-78 and :121 call applyTheme, theme.service.ts:42-46, which also flips html.dark, color-scheme and appliedThemeStore). Only handleEditorCancel (AppearanceSection.svelte:140-144) and handleEditorSave (:126-138) call applyActiveTheme. When the Settings panel closes (SettingsPanel.svelte:101-105 Esc, :147 X, the {#if settingsPanelStore.isOpen} at :110) or the section changes (SectionContent at :99/:153), AppearanceSection and ThemeEditor are destroyed with no teardown, so the draft colors and the draft's dark/light mode stay on the whole app, out of step with appearance.activeTheme, until another theme action or a relaunch. Fix direction: when the editor goes away without a save, re-apply the stored theme, for example a teardown in ThemeEditor (or in AppearanceSection while editorOpen) that calls applyActiveTheme(). applyActiveTheme is idempotent, so running it after a save does no harm.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/settings/AppearanceSection.test.ts: with the default theme active, mount AppearanceSection, click Create new theme, change one UI color through its ThemeColorRow input so document.documentElement.style --primary (or the edited token) shows the draft value, then unmount the component without clicking Save or the back arrow; the token on :root is back to the active theme's value and appliedThemeStore's dark flag matches the active theme. It fails today.
- [ ] The same holds when the draft came from Import (handleFileImport) and when the editor was opened with Edit on a user theme.
- [ ] Save still applies the saved theme and makes it active; the back arrow (Cancel) still restores the active theme (existing tests stay green).
- [ ] Closing Settings with the editor open but no color changed leaves the active theme as it was.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. Esc, X or Cmd+, leaves the unsaved preview theme painted on the app.
- **Trigger:** Settings > Appearance > Edit theme, Create new theme or Duplicate, change a color (live preview paints the app), then press Esc, click the X, press Cmd+, or click another settings section instead of Save or the back arrow.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/settings/sections/ThemeEditor.svelte:67-69 applyDraft -> applyTheme({name: draftName, colors: draftColors}); :72-78 updateColor calls applyDraft on every change; :121 import also calls applyDraft; grep finds no onDestroy or teardown in ThemeEditor.svelte or AppearanceSection.svelte (only $effect.pre at :50 for init). src/lib/core/settings/theme.service.ts:42-46 applyTheme sets the root vars and applyMode (:29-35: html.dark, colorScheme, appliedThemeStore.setDark). src/lib/core/settings/sections/AppearanceSection.svelte:140-144 handleEditorCancel is the only restore path besides :126-138 handleEditorSave; editorOpen is component-local $state (:31). src/lib/app/SettingsPanel.svelte:101-105 Escape closes the panel, :110 {#if settingsPanelStore.isOpen} unmounts the content, :99 and :153 SectionContent swaps the section component. rg applyActiveTheme: the only other caller is settings.service.ts:242 (applyLoadedSettings on vault load).
- **Source:** audit 2026-11-05, domain `shell`, finding `N-shell-01` (from shell-ux-1). Size S.

## Comments
