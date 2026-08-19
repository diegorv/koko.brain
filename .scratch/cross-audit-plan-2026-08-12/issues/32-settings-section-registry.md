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

### 2026-08-19 — done

**What landed.** `SettingsPanel.svelte` only. The 17 section-component imports, the 17 lucide icon
imports, the `SettingsSection` / `Component` type imports and `sectionIcons` moved into a
`<script module lang="ts">` block in the SAME file (no new module, ADR-0004 honoured).
`sectionComponents: Record<SettingsSection, Component>` was added and exported beside `sectionIcons`.
The 35-line if/else at :129-165 became `{@const SectionContent = sectionComponents[settingsPanelStore.activeSection]}`
+ `<SectionContent />`. Net -4 lines in the component; the instance script now holds only `fly`,
`ScrollArea`, `settingsPanelStore`, `SETTINGS_SECTION_GROUPS`, `XIcon` and `handleKeydown`.

**Red-green.** New `src/tests/lib/core/settings/SettingsPanel.test.ts` (jsdom, no mocks needed —
importing the panel pulls all 17 sections without any module-level Tauri side effect). Three
assertions derived from `SETTINGS_SECTION_GROUPS`, never from a hardcoded 17: every nav id resolves
to a defined component; `Object.keys(sectionComponents)` equals the nav id set exactly (no orphan
entry); the 17 mapped values are distinct (a copy-paste in the map literal the if/else could not
express). RED against unfixed code — `sectionComponents` did not exist, so the named import was
`undefined`: `TypeError: Cannot read properties of undefined (reading 'appearance')` and
`TypeError: Cannot convert undefined or null to object`, 3/3 failed. GREEN after the change, 3/3.
Full gate: `pnpm check` 191 files 0 errors, `pnpm vitest run` 286 files / 6370 passed, `pnpm build` ok.

**Discovery findings that changed the shape of the fix.**

1. The issue asked for the map "beside `sectionIcons`" AND an exhaustiveness test over it. Those are
   in tension as written: `sectionIcons` was an INSTANCE-script const, and instance-script bindings
   are not importable from a test. Resolved by moving both maps into `<script module lang="ts">` in
   the same file. Same file, so "No new module" holds literally; Svelte 5 lets the markup read
   module-script bindings, so the `{@const Icon = sectionIcons[section.id]}` in the nav still works
   untouched. This is the repo's first `<script module>` block.
2. `{@const}` could NOT go where the issue's sketch implies. Svelte 5.56.8 still enforces
   `const_tag_invalid_placement`: `{@const}` must be the immediate child of a block, `<svelte:fragment>`,
   `<svelte:boundary>` or a `<Component>`. The old if/else sat inside a plain `<div>`, which is none
   of those. The const was placed one level up as an immediate child of `<ScrollArea>` (a component,
   therefore legal) and the `<div class="max-w-3xl px-10 py-8">` wrapper is unchanged inside it.
   The alternative — an instance-script `$derived` — was rejected as a larger, less local change.
3. Behaviour-identity was verified, not assumed: the 17 `SettingsSection` union members
   (settings.types.ts:288), the 17 `sectionIcons` keys, the 17 `SETTINGS_SECTION_GROUPS` ids
   (settings.logic.ts) and the 17 if/else branches all agreed before the collapse.
4. The playbook's claim that the repo has no component-rendering tooling is STALE: `vitest.config.ts`
   sets `conditions: ['browser']` and several suites already `mount()` real components. A
   mount-and-click-all-17 test was still rejected — it would need Tauri mocks for `EditorSection`'s
   `list_system_fonts`, `UpdateSection`'s channel invokes and `TroubleshootingSection`, for strictly
   less signal than the map assertions.

**Plan discrepancies.** None beyond (1) and (2) above. "No derived union type" is unaffected: the
test enumerates at runtime from `SETTINGS_SECTION_GROUPS` (a plain `.ts`) and never derives a type
from the map. Ordering held — this was only safe after 31B made every section prop-less; before that,
`TrashSection` was the one branch taking no `onchange` prop and a uniform `<SectionContent />` would
have pushed an unexpected prop into it.

**Minor findings, not acted on (follow-up material).**
- `settings.logic.test.ts` still hardcodes the 17-id ordered list. That is deliberate (it pins nav
  ORDER, which the new test does not) but it means adding a section fails in two places, not one.
- `sectionIcons` is now exported-adjacent but not exported; nothing needs it, so it stayed private.
  If a future test wants icon exhaustiveness, export it then, not now.
