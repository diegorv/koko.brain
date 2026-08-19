# Issue 33: Clamp on commit + normalizeSettings

Status: ready-for-agent
Phase: P3 Track D step 4 (conflict C04, cluster C09)
Source: ARCH 4.1, C04 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings) + §Conflicts resolved (C04)
Blocked by: 31-settings-persistence-owner, 32-settings-section-registry

## What

Clamp settings values where they are committed, and normalize the whole settings object at load and
before serialization. Two steps, two commits; step 1 is a user-visible bug fix.

## How

Two commits, in this order:

1. **Clamp-on-commit** via the **DOM `onchange` attribute** — safe **only after issue 31 (arch 4.0)
   removed the shadowing `onchange` prop**, per the "4.0 before 4.1 step 1" sequencing constraint.
   Ship as a **standalone bug-fix commit with a regression test** written first.
2. **`normalizeSettings`** wired at **load** and **before the stringify**. This is the **second,
   non-markup caller** that justified keeping the seven clamp wrappers in conflict C04 — the wrappers
   stay, with the one-line bodies issue 14 already gave them.

Hard constraints:

- **NEVER clamp inside `settingsStore.updateEditor`.**
- **The 110-line generic merge collapse is NOT in this issue** — it is deferred to P5 (see issue 45).
- `settings.logic.test.ts:15-152` must stay green unchanged — the behaviour-neutrality proof.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit. Stage only the
files for the current step, verify with `git diff --cached --stat`, and commit each step separately
using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
### 2026-08-19 - both steps landed

**Step 1 (commit 0b687d4e) - clamp on commit.** Red first: a jsdom suite mounting the real
EditorSection against the real settings store set the font size input to `999`, dispatched `input`
then `change`, and read the store. It failed `expected 999 to be 32` with the store still at 999
after BOTH events, because no change listener existed. Fix: the seven clamp wrappers moved from
`onblur` to the DOM `onchange` attribute (EditorSection 4 inputs, HeadingTypographyEditor 3, all
three routed through the existing `updateLevel` funnel). It is a REPLACEMENT, not an addition -
keeping `onblur` too would have left a side channel that lets the regression test pass even if the
`onchange` wiring were reverted. The test never fires `blur` for the same reason.

**Step 2 - normalizeSettings.** `normalizeSettings(settings: AppSettings): AppSettings` composed
from the seven existing clamp wrappers plus a private `normalizeHeadingLevel` for the six levels.
Wired at two places. Red evidence:
- `settings.service.test.ts`: `settings.json` containing `editor.fontSize 999 / contentWidth 50 /
  headingTypography.h1.fontSize 99` - failed `expected 999 to be 32` after `loadSettings`; the merge
  spread the parsed values over the defaults with no bounds check. Green after wrapping `merged` at
  `settings.service.ts:166`. The write-back that follows the merge now repairs the file on disk too,
  asserted in the same test.
- `settings-persistence.test.ts`: `updateEditor({ fontSize: 999 })` (what an uncommitted keystroke
  leaves in the store) - failed `expected 999 to be 32` on the JSON handed to `writeTextFile`. Green
  after normalizing inside the persistence `serialize()`.
- `settings.logic.test.ts`: seven cases, red with `normalizeSettings is not a function`.

`settings.logic.test.ts:15-152` stayed byte-identical: the only edits to that file are two added
import lines and an appended describe. Nothing was clamped inside `settingsStore.updateEditor`, and
the seven wrappers kept their one-line bodies.

**Plan discrepancy - the "single stringify site".** The step brief said to normalize "inside
writeSettingsFile's stringify (the single site 31A created)". `writeSettingsFile(vaultPath, content)`
takes an ALREADY serialized string and writes it verbatim - there is a test in
`settings.service.test.ts` pinning exactly that. The two real stringify sites after 31A are
`settings-persistence.svelte.ts:33 serialize()` and `settings.service.ts:210 saveSettings()`.
Both got the wrapper. `serialize()` is the path the running app writes through and the only one that
can carry an uncommitted out-of-range value today; `saveSettings` is a no-op by construction right
now (its four callers all sit inside `loadSettings`, three on a `DEFAULT_SETTINGS` clone and one
immediately after the normalized `setSettings`), but leaving it bare would rest disk sanity on an
unenforced caller invariant, so a future `saveSettings` call after a raw store mutation would
silently reopen this bug. Guarding both means every store-to-disk path is safe by construction.

**Plan discrepancy - line numbers.** The plan cites the load-side wiring as
`settings.service.ts:120`; it is `:165` on this branch (`:120` is inside the appearance merge).

**Scope note.** The seven wrappers are used only by EditorSection and HeadingTypographyEditor.
`FileHistorySection.svelte:10-12` (`clampRetentionDays`) and `AutoMoveSection.svelte:32-34`
(`clampDebounce`) are separate local helpers that already clamp on `oninput` - different surface, no
bug, left untouched.

**Follow-up worth an issue.** Store and disk deliberately diverge while an out-of-range value sits
uncommitted in the store: the editor renders 999px text live while `settings.json` holds 32. That is
the stated C04 design (disk always sane, live preview while typing untouched), but the store can
stay out of range indefinitely if the panel is closed mid-edit, and nothing re-reads the normalized
value back. Normalizing the store on panel close, or on `startSettingsPersistence`, would close it.
