# 27: Settings actions use the shadcn Button, and theme card actions show on keyboard focus

**What to build:** Every action button in Settings gets the shadcn `Button` focus ring, hover and disabled states, and the theme card's Edit and Duplicate actions become reachable by keyboard. Today they are hand-rolled `<button class=...>` copies with no focus ring, and the theme actions sit in an `opacity-0 group-hover:opacity-100` container that never shows on focus.

- `src/lib/core/settings/sections/AppearanceSection.svelte` (no shadcn Button today):
  - Edit and Duplicate (about lines 191, 199): `<Button variant="ghost" size="icon-sm" title=... aria-label=...>`; aria-label equals the existing title.
  - Uninstall and Delete (about lines 212, 220): `<Button variant="ghost" size="icon-sm" class="hover:bg-destructive/10 hover:text-destructive" title=... aria-label=...>`.
  - The actions container (about line 188) adds `group-focus-within:opacity-100`.
  - Create New Theme (about line 233): `<Button variant="outline" class="mt-2 w-full border-dashed">` keeping icon and text.
  - Catalog Retry (about line 255): `<Button variant="outline" size="sm">`; Install and Update (about lines 280, 287): `<Button size="sm">`.
  - Every `onclick` that receives the event (`handleEdit(theme, e)` and the others) keeps receiving it, so the `stopPropagation` inside those handlers still prevents the row's `selectTheme`.
- `src/lib/core/settings/sections/ThemeEditor.svelte` about line 132, back arrow: `<Button variant="ghost" size="icon-sm" title="Back to themes" aria-label="Back to themes">`.
- `src/lib/plugins/queryjs/QueryjsSection.svelte` about line 75, Clear: `<Button variant="outline" size="sm">`.
- `src/lib/features/search/SearchSection.svelte` about line 139, reranker Download: `<Button variant="outline" size="sm" disabled={isDownloadingReranker}>`.
- `src/lib/core/settings/sections/EditorSection.svelte` about line 50, the Browse `Popover.Trigger`: replace its hand-written class string with `class={buttonVariants({ variant: 'outline' })}` (default size, h-9, to match the Input beside it). `buttonVariants` is exported from `#lib/components/ui/button/index.js`.

**Blocked by:** 24

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] Failing first: `src/tests/lib/core/settings/settings-controls.test.ts` (added by the text-fields ticket) gains a rule that counts raw `<button` tags per Settings file against an explicit allowlist with a reason per entry: `SettingsPanel.svelte` 1 (nav item, one tag in an `{#each}`), `ThemeEditor.svelte` 1 (colour group tabs), `AutoMoveSection.svelte` 1 (folder chip remove), `TodoistSection.svelte` 1 (inline link in a hint), `UpdateSection.svelte` 1 (changelog commit link). It fails today on AppearanceSection (8), ThemeEditor (2), QueryjsSection (1) and SearchSection (1)
- [ ] Failing first: an E2E case in `settings.spec.ts` opens Appearance, creates a user theme (Duplicate on a built-in theme, then Cancel back to the list), focuses that theme's row with Tab, and asserts the Edit button's computed opacity is 1 while the row has focus
- [ ] `AppearanceSection.test.ts` still finds `[title="Edit theme"]`, `[title="Duplicate theme"]`, `[title="Uninstall theme"]` and the Install `button`; its "Create New Theme" lookup (about line 338) still matches; a new assertion checks each icon action has an `aria-label` equal to its title
- [ ] Clicking Duplicate or Delete on a row does not also select that theme (assert `settingsStore.appearance.activeTheme` is unchanged)
- [ ] `EditorSection.test.ts` still finds the Browse trigger by its text (about line 178)
- [ ] No file changes outside the six listed and their tests

## Notes

- Source: review section 3 Settings row "Four input styles, three button styles, two select styles"; `.scratch/ux-polish/work/settings.md` P4 and P11; dossier inventory (Appearance has 8 raw buttons and 0 shadcn Button).
- The interaction-state cluster (review section 4 Issue 10, "reveal-on-focus for the 12 hover-only controls") should leave the AppearanceSection theme card actions to this ticket.
- Out of scope: the theme row itself is a `div role="button"` holding buttons (nested interactive controls); ThemeEditor group tabs (a segmented-control recipe belongs to the interaction-state cluster); the Auto Move chip remove (needs an `icon-xs` Button size from the primitives cluster); `MyPeopleSection` (a list, not a settings page).
- Size: M.

## Partial work outside relay (2026-11-05)

Commit `ecd4cadc2` did most of this ticket from the main session, without knowing it existed. Do not redo it; finish what is listed under "Missing".

**Done:**
- `AppearanceSection.svelte`: Edit, Duplicate, Uninstall, Delete, Create New Theme, Retry, Install and Update use `Button`. Handlers still receive the event.
- `ThemeEditor.svelte`: the back arrow uses `Button` with `size="icon-sm"`.
- `QueryjsSection.svelte` Clear, `SearchSection.svelte` reranker Download and the `EditorSection.svelte` Browse trigger (`buttonVariants`).
- The actions container already had `group-focus-within:opacity-100`.
- `settings-controls.test.ts` fails on a raw `<button` outside an allowlist of files, each with its reason. It was checked by putting a raw button back in `QueryjsSection.svelte`.

**Missing:**
- `aria-label` equal to the title on the four theme icon actions and the back arrow, with the assertion in `AppearanceSection.test.ts`.
- The theme icon actions use `size="icon"` with `class="size-7"` (the Trash and Rail pattern), not the `size="icon-sm"` this ticket asks for. Choose one.
- The allowlist holds files, not counts per file, and also lists `EventColorSwatches.svelte`, which the criterion does not name.
- The test that Duplicate or Delete on a row leaves `activeTheme` unchanged.
- The E2E case for the Edit button's opacity on keyboard focus.
- The gate: only the Settings, Auto Move and `text-roles` tests and `pnpm check` ran. The full vitest suite, `pnpm build` and `settings.spec.ts` did not.
