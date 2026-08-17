# Issue 32: Settings section component map

Status: ready-for-agent
Phase: P3 Track D step 3 (cluster C09)
Source: ARCH 4.2 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings)
Blocked by: 31-settings-persistence-owner

## What

Replace the 35-line section if/else with a `Record<SettingsSection, Component>` lookup map, placed
beside the existing `sectionIcons` map. Pure mechanical collapse, no user-visible change.

## How

- Add `sectionComponents: Record<SettingsSection, Component>` **beside `sectionIcons`** in the same
  file. Delete the 35-line if/else.
- **No new module.** ADR-0004: do not create a preemptive store+service pair for this.
- **No derived union type** — the `.svelte`-import constraint still holds, even though issue 14's #63
  deletion freed the `SETTINGS_SECTIONS` name that arch 4.2 cited.
- Test collateral in the same commit: assert every `SettingsSection` key resolves to a component
  (exhaustiveness over the map), so a future section can't silently render nothing.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit using the repo's full commit
format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
