# 40: Default theme: a darker tab strip with a visible tab hover, bold and italic off the link blue

**Origin:** design review 2026-11-17, proposals P109 and P20 (the Default `inlineFg` part), prototype `.scratch/design-review/prototypes/color-contrast-theming.html`, research `.scratch/ux-quick-wins/research/verdict-color.md` (Q2) and `breakdown.md` (old ticket 39).

**What to build:**

1. **Darker strip.** Delete `tabBar: '#5a5c79'` from the Default overrides (`src/lib/core/settings/theme.logic.ts:155`); the builder then derives `tabBar` from `sidebarBg` (`theme-builder.logic.ts:238`). Set the static `.dark` fallback `--tab-bar` (`src/app.css:236`) to the value the builder derives for Default (the verdict measured `#21222e`; read it from the snapshot after the override is gone).
2. **Visible tab hover.** Inactive tabs (`src/lib/core/markdown-editor/EditorTabs.svelte:213`) get a hover that shows on the darker strip in place of `hover:bg-muted/30`, which drops from 1.29:1 to 1.02:1 against it. For example `hover:bg-editor-bg/60`; any token that clears 1.1:1 against `tabBar` on both built-in themes is fine. Lavender Haze is unaffected (`muted #D5D0E2` over `#edeaf2`).
3. **Bold and italic off the link blue.** Delete `inlineFg: '#93c5fd'` from Default (`theme.logic.ts:141`), so `emphasis` and `strong` derive to `fg` (`theme-builder.logic.ts:220,262`). Set the static `--syntax-emphasis` and `--syntax-strong` (`app.css:292-293`) to match. Both tokens are read only by `highlight-styles.ts` and `canvas-markdown.css`, so this changes a value and reworks no decoration. Lavender Haze is unchanged (distance 15.8).
4. **`colorDistance`.** Add `colorDistance(a, b)` (OKLab, scaled by 100) to `src/lib/utils/color.ts` for the test below.
5. **Blast radius, stated.** Built-in themes are served from code (`theme.logic.ts:363-399`), so this restyles every vault on Default and writes nothing to it; user themes keep the colours they were saved with. `--tab-bar` is not only the editor tab strip: it is the background of ten pane header bands (`EditorTabs.svelte:186`, `AppShell.svelte:258,278`, `EditorView.svelte:154`, `CalendarNavigator.svelte:88`, `SearchPanel.svelte:233`, `RailNoteList.svelte:774`, `FilesNavigator.svelte:357`, `TypesNavigator.svelte:217`, `Rail.svelte:283`), of the resize handle gradient (`resizable-handle.svelte:42`) and of the tab fades (`EditorTabs.svelte:268,271`). Every one gets darker on Default. The by-eye check covers all of them, not the tab strip alone.

Not in this ticket: the mini-month weekend styling (ticket 28 owns it); a lighter-than-editor strip for user themes; the open-itens 194 Default block (same lines and snapshot, see Sequence).

**Size:** S.

**Blocked by:** 20, 39

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `src/tests/lib/core/settings/theme-builder.logic.test.ts` over `BUILTIN_THEMES`: (a) the `tabBar` luminance ratio to `editorBg` is at most 1.5 (2.08 on Default today); (b) the inactive-tab hover composite (`flatten` of the chosen token at its alpha over `tabBar`) is at least 1.1:1 against `tabBar`; (c) `colorDistance(strong, link)`, `colorDistance(emphasis, link)` and `colorDistance(strong, wikilink.target)` are each at least 12 (10.7 today). (a) and (c) fail on Default today; (b) fails on Default once (a) passes with the old hover class (1.02).
- [ ] `colorDistance` unit test in `src/tests/lib/utils/color.test.ts`: equal colours give 0; `#93c5fd` against `#60a5fa` gives about 10.7.
- [ ] `EditorTabs.test.ts`: an inactive tab carries the new hover class and not `hover:bg-muted/30`.
- [ ] The snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`), `theme.logic.test.ts:40` and `theme.service.test.ts:25,32` move on purpose to the new `--tab-bar`, `--syntax-strong` and `--syntax-emphasis`. `READABILITY_PAIRS` (`tabTextActive` and `tabTextInactive` on `tabBar`, `theme-builder.logic.ts:118-119`) still pass on both themes, and gain contrast on Default.
- [ ] By eye on Default dark and Lavender Haze: the tab strip, the five navigator and panel headers, the rail strip, the empty-state bands and the resize handle top. If it was not checked by eye, the commit says so.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P109.** In the dark default theme the tab strip is the brightest surface: the `tabBar` override (`#5a5c79`) is about 2.1:1 lighter than the editor. Drop the override so `tabBar` derives from `sidebarBg`, then check the dark screenshots. Validation: revise, the active tab already uses the editor background; the verdict adds the inactive-tab hover as a required part.
- **P20 (Default `inlineFg` part).** In Default, bold (`#93c5fd`) sits next to the link colour (`#60a5fa`), so bold text looks like a link. Move bold and italic off the link hue and add a builder check on the distance from link and wikilink. The section-title and calendar-weekend parts are not built here (shell-sidebars-ux 05 and ticket 28).

## Problem

On Default the tab strip is 2.08:1 lighter than the editor, brighter than the surface it labels. Bold, italic and wikilink targets all draw `#93c5fd`, so emphasis looks clickable. Darkening the strip alone would make the tab hover vanish, because Default `muted` is `#242835`, nearly the new strip.

## Evidence

Checked at `085b23c5d`.

- `theme.logic.ts:141` (`inlineFg`), `:155` (`tabBar`); `app.css:236` (`--tab-bar: #5a5c79`), `:292-293` (`--syntax-emphasis`, `--syntax-strong`).
- `theme-builder.logic.ts:220` (`const inlineFg = p.inlineFg ?? p.fg`), `:238` (`tabBar: p.sidebarBg`), `:262` (`emphasis: inlineFg, strong: inlineFg`).
- `EditorTabs.svelte:213`: `bg-tab-bar text-tab-text-inactive border-b-transparent hover:bg-muted/30`.
- `src/lib/utils/color.ts` exports `flatten`, `contrastRatio`, `mixColors`, `ensureContrast`, `isDarkColor`; no `colorDistance` yet.
- Readers of `tabBar` / `--tab-bar` outside the strip: the nine other band sites and `resizable-handle.svelte:42`, listed in item 5; `ThemePreview.svelte` and `theme-editor.logic.ts` read the field too. `AppShell.svelte` is on the mvp-claude branch, and this ticket only changes the token it reads, not that file.

## Why blocked

- 20: it changes the base `outline-ring` rule in `src/app.css:495`, the file this ticket edits at `:236` and `:292-293` (other lines), and it moves the focus ring pins in `focus-ring.spec.ts`; run the two one after the other.
- 39: ordering from the owner's map plus two shared surfaces: both add cases over `BUILTIN_THEMES` to `src/tests/lib/core/settings/theme-builder.logic.test.ts`, and both touch `Rail.svelte` on other lines (39 the Inbox badge at `:396`, this ticket the strip at `:283` by token only).

## Sequence with

Shell-sidebars-ux 34 (`issues/34-pane-band-utility.md`, "land last") adds `@utility pane-band` near `src/app.css:151` and rewrites the ten band sites above; it edits `EditorTabs.svelte` and `Rail.svelte` on other lines, and the by-eye list here is the same ten sites. Shell-sidebars-ux 23 edits the tab menu in `EditorTabs.svelte`. Open-itens 194, if it is ever run, edits the same Default block and snapshot: run it before this ticket. Ticket 28 edits `CalendarNavigator.svelte` and `CalendarGrid.svelte` (the band at `:88` is the only shared line neighbourhood).

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 40.1 (raised by the coverage check): the title says "tab strip" but the change darkens every pane header band on Default in every vault. Default: accept, as validated in P109, and the by-eye check covers all ten sites.
