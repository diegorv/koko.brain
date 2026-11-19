# 40: Default theme: a darker tab strip with a visible tab hover

**Origin:** design review 2026-11-17, proposal P109 (the P20 Default `inlineFg` part moved to Issue 53), prototype `.scratch/design-review/prototypes/color-contrast-theming.html`, research `.scratch/ux-quick-wins/research/verdict-color.md` (Q2) and `breakdown.md` (old ticket 39).

**What to build:**

1. **Darker strip.** Delete `tabBar: '#5a5c79'` from the Default overrides (`src/lib/core/settings/theme.logic.ts:155`); the builder then derives `tabBar` from `sidebarBg` (`theme-builder.logic.ts:238`). Set the static `.dark` fallback `--tab-bar` (`src/app.css:236`) to the value the builder derives for Default (the verdict measured `#21222e`; read it from the snapshot after the override is gone).
2. **Visible tab hover.** Inactive tabs (`src/lib/core/markdown-editor/EditorTabs.svelte:213`) get a hover that shows on the darker strip in place of `hover:bg-muted/30`, which drops from 1.29:1 to 1.02:1 against it. For example `hover:bg-editor-bg/60`; any token that clears 1.1:1 against `tabBar` on both built-in themes is fine. Lavender Haze is unaffected (`muted #D5D0E2` over `#edeaf2`).
3. **Blast radius, stated.** Built-in themes are served from code (`theme.logic.ts:363-399`), so this restyles every vault on Default and writes nothing to it; user themes keep the colours they were saved with. `--tab-bar` is not only the editor tab strip: it is the background of ten pane header bands (`EditorTabs.svelte:186`, `AppShell.svelte:258,278`, `EditorView.svelte:154`, `CalendarNavigator.svelte:88`, `SearchPanel.svelte:233`, `RailNoteList.svelte:774`, `FilesNavigator.svelte:357`, `TypesNavigator.svelte:217`, `Rail.svelte:283`), of the resize handle gradient (`resizable-handle.svelte:42`) and of the tab fades (`EditorTabs.svelte:268,271`). Every one gets darker on Default. The by-eye check covers all of them, not the tab strip alone.

Not in this ticket: bold and italic off the link blue and `colorDistance` (Issue 53, which needs an owner decision); the mini-month weekend styling (ticket 28 owns it); a lighter-than-editor strip for user themes; the open-itens 194 Default block (same lines and snapshot, see Sequence).

**Size:** S.

**Blocked by:** 20, 39

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, `src/tests/lib/core/settings/theme-builder.logic.test.ts` over `BUILTIN_THEMES`: (a) the `tabBar` luminance ratio to `editorBg` is at most 1.5 (2.08 on Default today); (b) the inactive-tab hover composite (`flatten` of the chosen token at its alpha over `tabBar`) is at least 1.1:1 against `tabBar`. (a) fails on Default today; (b) fails on Default once (a) passes with the old hover class (1.02).
- [x] `EditorTabs.test.ts`: an inactive tab carries the new hover class and not `hover:bg-muted/30`.
- [x] The snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`), `theme.logic.test.ts:40` and `theme.service.test.ts:25,32` move on purpose to the new `--tab-bar`. `READABILITY_PAIRS` (`tabTextActive` and `tabTextInactive` on `tabBar`, `theme-builder.logic.ts:118-119`) still pass on both themes, and gain contrast on Default.
- [x] By eye on Default dark and Lavender Haze: the tab strip, the five navigator and panel headers, the rail strip, the empty-state bands and the resize handle top. If it was not checked by eye, the commit says so.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P109.** In the dark default theme the tab strip is the brightest surface: the `tabBar` override (`#5a5c79`) is about 2.1:1 lighter than the editor. Drop the override so `tabBar` derives from `sidebarBg`, then check the dark screenshots. Validation: revise, the active tab already uses the editor background; the verdict adds the inactive-tab hover as a required part.

## Problem

On Default the tab strip is 2.08:1 lighter than the editor, brighter than the surface it labels. Darkening the strip alone would make the tab hover vanish, because Default `muted` is `#242835`, nearly the new strip.

## Evidence

Checked at `085b23c5d`.

- `theme.logic.ts:155` (`tabBar`); `app.css:236` (`--tab-bar: #5a5c79`).
- `theme-builder.logic.ts:238` (`tabBar: p.sidebarBg`).
- `EditorTabs.svelte:213`: `bg-tab-bar text-tab-text-inactive border-b-transparent hover:bg-muted/30`.
- Readers of `tabBar` / `--tab-bar` outside the strip: the nine other band sites and `resizable-handle.svelte:42`, listed in item 5; `ThemePreview.svelte` and `theme-editor.logic.ts` read the field too. `AppShell.svelte` is on the mvp-claude branch, and this ticket only changes the token it reads, not that file.

## Why blocked

- 20: it changes the base `outline-ring` rule in `src/app.css:495`, the file this ticket edits at `:236` (another line), and it moves the focus ring pins in `focus-ring.spec.ts`; run the two one after the other.
- 39: ordering from the owner's map plus two shared surfaces: both add cases over `BUILTIN_THEMES` to `src/tests/lib/core/settings/theme-builder.logic.test.ts`, and both touch `Rail.svelte` on other lines (39 the Inbox badge at `:396`, this ticket the strip at `:283` by token only).

## Sequence with

Shell-sidebars-ux 34 (`issues/34-pane-band-utility.md`, "land last") adds `@utility pane-band` near `src/app.css:151` and rewrites the ten band sites above; it edits `EditorTabs.svelte` and `Rail.svelte` on other lines, and the by-eye list here is the same ten sites. Shell-sidebars-ux 23 edits the tab menu in `EditorTabs.svelte`. Open-itens 194, if it is ever run, edits the same Default block and snapshot: run it before this ticket. Ticket 28 edits `CalendarNavigator.svelte` and `CalendarGrid.svelte` (the band at `:88` is the only shared line neighbourhood).

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 40.1 (raised by the coverage check): the title says "tab strip" but the change darkens every pane header band on Default in every vault. Default: accept, as validated in P109, and the by-eye check covers all ten sites.
- 2026-11-18, split while the owner was away, after the first run blocked: deleting the Default `inlineFg` (old item 3) makes bold equal body text, which fails the Issue 05 test "draws bold text in its own color, apart from body text" (`theme-builder.logic.test.ts:161-168`). Choosing between that rule and the item is the owner's call, so old items 3 and 4 and criterion (c) moved to Issue 53 (needs-info). This Issue keeps the tab strip, the hover and the blast radius, which the conflict does not touch.
- 2026-11-18, delivered from branch `issue/40-default-theme-darker-tab-strip-visible`: Default `--tab-bar` darkened to `#21222e` (strip to editor 1.17:1), and the inactive tab hover moved from `hover:bg-muted/30` to `hover:bg-tab-text-inactive/10` (1.20:1 on Default, 1.17:1 on Lavender Haze), with contrast tests over `BUILTIN_THEMES` and an EditorTabs class pin. Not checked by eye; the owner should look at the ten band sites and whether a hovered tab on Default reads like the active one (review finding 1). Tests: `pnpm vitest run` exit 0, 663 files, 17843 passed, 56 skipped, 1 todo. Review round 1: APPROVED (one minor and two nits, none changed; see `work/40/review.md` Resolution).
