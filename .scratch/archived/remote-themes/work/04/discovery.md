# Issue 04 discovery

No `spec.md` exists for remote-themes; `plan-2026-11-03.md` Notes and ADR-0035 hold the decisions. Builds on `work/03` (package logic, catalog UI); only the differences are listed.

## Files that change

- `src/lib/core/settings/theme-package.logic.ts`
  - new `compareThemeVersions(a, b): number | null` (numeric per part, null when either is not `MAJOR.MINOR.PATCH`).
  - `CatalogEntryState` (:59) gains `'update'`; `catalogEntryState` (:216): installed id + newer valid version -> `'update'` (package) or `'too-new'` (too-new entry); equal, older or invalid -> `'installed'`.
  - new `updateThemePackage(appearance, pkg)`: matched by `id`; replaces the package and the built theme in place (same list position); a rename moves `activeTheme` along; refused (with message) when the new name belongs to another theme, or the id is not installed, or the version is not newer.
- `src/lib/core/settings/sections/AppearanceSection.svelte`: catalog row shows an "Update to x.y.z" button for `'update'`; click calls `updateThemePackage`, `updateAppearance`, `applyActiveTheme()`, toast. Catalog fetch failure already shows no per-entry state (error block only), so offline needs no change.
- `help/documentation/26-theming.md` Theme Catalog section: Update bullet. ADR-0035: one line on update by id.

## Plan (test-first)

1. `theme-package.logic.test.ts`: `compareThemeVersions` (1.0.10 > 1.0.9, equal, older, invalid input); `catalogEntryState` update / equal / older / too-new newer / too-new not newer; `updateThemePackage` active, inactive (position kept, colors rebuilt), rename (activeTheme follows), rename collision refused, not installed refused. The existing "installed with version 9.9.9" case becomes an equal-version case (behavior changed by this Issue).
2. `AppearanceSection.test.ts`: installed 1.2.0 + catalog 1.2.10 renders "Update to 1.2.10"; click -> store holds new package, active theme CSS var applied, label gone and row shows Installed; collision refused shows toast; failed fetch with installed theme shows no Update.

## Risks

- `activeTheme` is a name; the rename path must change list entry, package and `activeTheme` in one `updateAppearance` call, or `applyActiveTheme` finds no theme.
- `loadAppearance` keys built themes by package name: after a rename the list entry carries the new name too, so a reload is consistent.

## Defaults taken

- A too-new entry for an installed id shows "Requires a newer KokoBrain" only when its version is valid and newer; otherwise "Installed".
- The Update button lives on the catalog row (the plan: "catalog lists Install, Installed, or Update to x.y.z"), not on the theme list row.
- Duplicates are user themes (not in `installed`), so they never match an id: no extra code.
