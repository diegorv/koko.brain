# Scout 18: theming and tokens for the Tasks view redesign

Read-only research. Facts are verified in code with path:line; opinions are marked as such.

## Summary

TasksView has exactly one hardcoded palette color (`text-purple-400` on the file header, `src/lib/features/tasks/TasksView.svelte:154`), and it is the worst token choice in the file: Tailwind's raw purple is not a theme token, does not follow any of the installed catalog themes (ADR-0035), and on a light card it sits near 2.6:1 contrast. Everything else already uses semantic tokens (`bg-card`, `text-muted-foreground`, `text-primary`, `bg-accent/50`, `pane-toolbar`). The app already has what a redesigned row, group header and chip need: a semantic scale (`primary`, `destructive`, `warning`, `success`, `muted`, `accent`), a nine-hue "type" palette (`type-red` ... `type-gray`), a chrome type scale (`text-label/meta/rail/row/title`, `section-label`), a radius ladder and elevation tokens. The main design hazard is not the missing token, it is contrast: the theme builder guarantees readability only for specific token/surface pairs, and TasksView sits on `bg-card`, a surface that most accent tokens are not verified against.

## Facts

### Where tokens live and how a theme reaches the DOM

- Tailwind v4, CSS-first config, no `tailwind.config.*`: `src/app.css:1` (`@import "tailwindcss"`), semantic color aliases in `@theme inline` at `src/app.css:8-74`. `components.json` is the shadcn config at the repo root.
- Dark is class-driven, not OS-driven: `@custom-variant dark (&:where(.dark, .dark *))` at `src/app.css:6`. `html.dark` is toggled from the applied theme at `src/lib/core/settings/theme.service.ts:33` (`el.classList.toggle('dark', dark)`). So `dark:` variants follow the theme's declared appearance, and a light catalog theme removes the class.
- Light defaults at `src/app.css:152-210` (`:root`), dark defaults at `src/app.css:212-358` (`.dark`). These are only fallbacks: `applyTheme` writes every token inline on the root with `style.setProperty` (`theme.service.ts:19`, vars from `themeColorsToCssVars`, `theme.logic.ts:60-75`). Variable name = group prefix + kebab key, so `ui.typePurple` becomes `--type-purple`.
- Token groups (`src/lib/core/settings/theme.types.ts`): `ui` (line 4, includes `typeRed..typeGray` at 102-118, `warning` 120, `success` 122), `syntax`, `preview` (line 149, includes `taskBorder/taskHover/taskChecked/taskCheckmark` at 159-162), `wikilink`, `callout`.
- ADR-0035 (`docs/adr/0035-remote-theme-catalog.md`): only `KokoBrain Default` and `Lavender Haze` ship in code; every other theme is a catalog package `{ palette, overrides? }` rebuilt with `buildTheme` on every load. A package can only set colors that match `isThemeColorValue`; it cannot add new token names. Consequence: any new token the redesign wants must be derived by `buildTheme` (or declared in `app.css` as a derived `color-mix`), otherwise installed themes will not have it and `mergeThemeWithDefaults` would fill it from the dark default (the exact failure the ADR calls out under "Source, not tokens").
- The app already uses derived-in-CSS tokens for this reason: `--rail-bg/--list-bg` (`app.css:377-390`), `--event-*-bg/fg` mixed with `--editor-bg/--editor-fg` "so they follow every preset" (`app.css:392-412`), `--lp-meta-bind-*` (`app.css:421-463`). This is the established pattern for "new color that must work in any theme without a new token".

### What the builder guarantees (contrast)

- `READABILITY_PAIRS` at `src/lib/core/settings/theme-builder.logic.ts:104-155` is the contract. Relevant entries:
  - `mutedForeground` on `editorBg`, `background`, `card`, `popover` at 4.5:1 (lines 108-111). So `text-muted-foreground` on `bg-card` is safe.
  - `foreground` is paired only with `background` at 4.5 (line 107) and `editorFg` with `editorBg` at 7 (line 106). `fg` is also lifted to 4.5 on editor, sidebar, panel and popover surfaces in `readableCore` (`theme-builder.logic.ts:190`), so `text-foreground` on card is effectively safe for builder-made themes.
  - `typeRed..typeGray` are held only to 3:1 on `fileExplorerBg` (line 123, `TYPE_PALETTE_TOKENS` at line 11). That is a non-text bar. Small text in a type color is not guaranteed.
  - `warning` 4.5 on `fileExplorerBg`, 3 on `fileExplorerAccent` (124-125); `success` 4.5 on `fileExplorerBg` and `editorBg` (126-127). Neither is checked on `card`.
  - `primary` is lifted to 4.5 on `editorBg` only (`theme-builder.logic.ts:186`, `lift` default `on = [p.editorBg]`). `primaryForeground` on `primary` is 4.5 (line 121). `destructiveForeground` on `destructive` 4.5 (line 122); `destructive` itself (`error`) is lifted to 3:1 only (line 187).
  - `taskChecked` on `editorBg` at 3:1 (line 143). `taskBorder` has no pair; it is derived from `faintFg` (line 273).
- Derivations at `theme-builder.logic.ts:230,252-257`: `card = panelBg`; `type* = p.error / mix / p.yellow / p.green / ... / mutedFg`; `warning = p.yellow`; `success = p.green`. So `type-yellow == warning`, `type-green == success`, `type-red == destructive`-source in builder themes (note: in `app.css` the light defaults differ slightly, `app.css:191-201`).
- Tests that enforce the pairs: `src/tests/lib/core/settings/theme-builder.logic.test.ts`. A new text-on-surface use that is not in `READABILITY_PAIRS` is not guarded by any test.

### TasksView today

- Surface: root is `bg-card` (`TasksView.svelte:90`), but its host is `bg-editor-bg` (`src/lib/app/EditorView.svelte:70`). TagsView, the closest sibling, sets no background and inherits editor-bg (`src/lib/features/tags/TagsView.svelte:49`). In most themes `card = panelBg` differs from `editorBg`, and in a theme where `panelBg == editorBg` they coincide; the choice of `bg-card` makes TasksView a different tone from its sibling views.
- Toolbar uses the shared `pane-toolbar` utility (`app.css:148-150`, `TasksView.svelte:92`). Good, keep.
- Hardcoded or non-token styling in the file:
  - `text-purple-400` file header, `TasksView.svelte:154`. Only raw palette color in the folder (grep of `src/lib/features/tasks` for raw palette classes returns that single hit).
  - Arbitrary alpha on semantic tokens: `bg-primary/20 text-primary` for active filters (lines 98, 111); `hover:bg-accent/50` (174); `text-primary/80` hover circle (183); `text-primary/60` completed circle (185); `border-border/50`, `bg-background/50`, `placeholder:text-muted-foreground/50`, `focus:border-primary/50` on the tag input (131). These stay theme-aware; the issue is that `/60`, `/50` opacity can drop under the contrast the builder guarantees (opacity over the card is not in any readability pair).
  - Inline `style="padding-left: {task.indent * 1.25 + 0.25}rem"` (line 173). A layout value, not a color.
  - Type sizes: `text-xs`/`text-sm` on every text node (9 occurrences). The app's chrome type scale (`--text-label` 11px, `--text-meta` 12px, `--text-rail` 13px, `--text-row` 14px, `--text-title` 15px/600, `app.css:76-99`, mirrored by `src/lib/utils/text-roles.ts:6`) is not used. `text-xs` is still 12px and `text-sm` 14px in Tailwind, so they coincide numerically with `text-meta`/`text-row`, but `cn()` and the comment in `app.css:77-79` say "Use these instead of `text-[Npx]`", and sibling views use the roles: `text-meta`/`text-label`/`section-label` appear in 47 `.svelte` files; `text-xs` in 145 sites. Not a rule violation for `text-xs`, only an inconsistency to settle.
- Sibling hardcoded colors (context, not in scope to change): Kanban date chips use raw Tailwind `bg-red-500/15 text-red-500`, `bg-yellow-500/15 text-yellow-500` (`src/lib/plugins/kanban/KanbanListView.svelte:48`, `KanbanTableView.svelte:69`), and `bg-red-500/15 text-red-400`, `bg-yellow-500/15 text-yellow-400`, `bg-blue-400/15 text-blue-400` (`KanbanDatePicker.svelte:21-24`); done state `text-green-500` (`KanbanTableView.svelte:74`, `KanbanLane.svelte:309`). A grep for `(text|bg|border)-(red|green|...)-NNN` in `src/lib/**/*.svelte` finds 8 files. These are the closest precedent for a due-date chip and they are NOT theme-aware: copying them into Tasks would reintroduce exactly the problem the redesign should avoid.
- Token-based chip precedents worth copying instead:
  - NoteRow chips: `inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px]` (`src/lib/features/note-list/NoteRow.svelte:104,114,127`). Hover variant `hover:bg-primary/20 hover:underline`.
  - Overdue as a semantic token: `row.overdue ? 'text-warning' : 'text-file-explorer-muted-fg'` (`src/lib/plugins/one-on-one/MyPeopleSection.svelte:58`).
  - Status as a type color: `text-type-yellow`, `text-type-green` (`src/lib/features/note-action-bar/NoteActionBar.svelte:147,156`). Only two uses of `text-type-*` exist in `.svelte` files today.
  - `text-success` / `text-warning` in `ModDialogHost.svelte:20-21`.
- Radius: `rounded-xs` (=`--radius-xs`, `--radius` minus 6px) is the chip radius in NoteRow and Graph controls; `rounded-md` is used on TasksView buttons. Ladder defined at `app.css:107-113` as `@theme static`, so it can also be used in scoped CSS.
- Section/group label primitive: `section-label` utility (11px, semibold, uppercase, muted; `app.css:137-139`). Its comment says it is "the one uppercase section label inside a panel"; a file-group header in sentence case should not use it. `text-title` (15px/600) is for panel titles.
- Editor-parity tokens for the checkbox: the live-preview task checkbox draws with `--lp-task-border`, `--lp-task-hover`, `--lp-task-checked`, `--lp-task-checkmark` and `--radius-xs` (`src/lib/core/markdown-editor/extensions/live-preview/styles.ts:231-250`). They exist in `preview` tokens (`theme.types.ts:159-162`), so a Tasks checkbox can look identical to the one in notes. Caveat: in `app.css` they are declared only under `.dark` (`app.css:313-316`), so in a light context the value comes only from the applied theme (always set by `applyTheme`), not from a CSS fallback.
- Existing test pins on markup: `src/tests/lib/features/tasks/TasksView.test.ts` selects `[data-task-row]`, `[data-task-row] span`, `[data-task-row] button[aria-label="Mark task as done"]`, `svg circle` presence for the todo icon (lines 90-157). It does not assert any color class, so recoloring is free; changing the icon element from `circle` to a custom checkbox would need a test update.
- Guard tests on class strings: `src/tests/lib/chrome-state-styles.test.ts` scans every `.svelte`/`.ts` under `src/lib` and fails on `transition-all`, `hover:scale-*`, and a `group-hover:opacity-100` reveal without a matching focus reveal. A redesigned row that shows hover actions must pair `group-hover:opacity-100` with `group-focus-within:opacity-100` (or `focus-within:opacity-100`). There is no test forbidding raw palette colors, so nothing mechanical stops the next `text-purple-400`.

## Problems and opportunities

1. File header `text-purple-400` (TasksView.svelte:154) ignores the theme. Facts: raw Tailwind v4 purple is `oklch(71.4% 0.203 305.504)` (`node_modules/tailwindcss/theme.css:170`); against white its contrast is about 2.6:1 by my estimate using the v3 hex equivalent `#c084fc` (computed, not measured in-app), about 5.1:1 on the dark default card `#2a2e3d`. Opinion: a light catalog theme makes the headers the least readable text on the screen, and they cannot follow a theme whose accent is not purple.
2. Nothing in the file signals state with color: overdue, high priority, in-progress, cancelled and forwarded are all indistinguishable. Statuses have 7 values (`TaskStatus`, `src/lib/contracts/generated/TaskStatus.ts`) and priority 6 (`TaskPriority.ts`), but the view only reads `checked` and `status === done/cancelled` for the icon (`TasksView.svelte:171-186`). Chips for due/scheduled/start dates, priority, recurrence and tags are available in `task.metadata` (`TaskMetadata.ts`) but are not shown. Opinion: these are where tokens will actually be spent.
3. Active-filter pill `bg-primary/20 text-primary` (lines 98, 111) is `primary` on a 20% primary tint over the card. `primary` is only verified at 4.5 against `editorBg`, and the tinted background lowers contrast further. Not guaranteed by any test; likely fine on the default but unverified for catalog themes.
4. Completed circle `text-primary/60` (line 185) and hover `text-primary/80` (183) are 60-80% opacity primary on card, a non-text graphic. Opinion: acceptable as a decoration only if the "done" state is also conveyed by the strike-through text, which it is (line 191).
5. `bg-card` background (line 90) departs from TagsView and from the editor host (`bg-editor-bg`, EditorView.svelte:70). Opinion: pick one on purpose; if the redesign adds elevated group cards, `bg-card` is the right color for the group container, and the view root should use the editor surface, which is the one `editorFg`/`mutedForeground`/`primary`/`success` are all verified on.
6. Type sizes bypass the chrome scale (`text-xs`, `text-sm`). Cosmetic, but a redesign that introduces chips should use `text-label` (11px) for chips and `text-meta` (12px) for counts and dates to match NoteRow and the panels.
7. No tokenised semantic color for "overdue" exists. Options already in the codebase: `destructive` (lifted to 3:1 only, so fine for an icon or border, risky for small text), `warning` (4.5 on fileExplorerBg/editorBg), `type-red` (3:1 on fileExplorerBg). Opinion: `text-warning` for due-today and a tinted chip (`bg-destructive/10 text-destructive`) for overdue, with the text kept at `text-foreground` when contrast is in doubt, is the safest combination.

## Recommendations for the redesign (opinions, based on the facts above)

Token map for the three elements:

Task row
- Surface: transparent on the view surface; hover `hover:bg-accent/50` (or `bg-muted/50`) as today; keyboard focus ring `focus-visible:ring-ring` (the base layer already applies `outline-ring/50`, `app.css:482-484`).
- Text: `text-foreground` (open), `text-muted-foreground line-through` (done and cancelled), as today.
- Checkbox: reuse the editor's `--lp-task-border` for the idle ring, `--lp-task-hover` on hover and `--lp-task-checked` fill with `--lp-task-checkmark` for the check, `--radius-xs` or a full circle. This gives visual parity with notes in every theme at no new token cost.
- In-progress / question / forwarded / important / cancelled markers: color the icon only (non-text, 3:1 bar is enough): `text-type-blue` (in progress), `text-type-purple` (question), `text-type-teal` (forwarded), `text-warning` (important), `text-muted-foreground` (cancelled). Keep the text color neutral so the 4.5:1 text guarantee is not at stake.
- Indent: keep the inline `padding-left` (layout, not color), or a CSS variable; optionally a 1px left rule in `border-divider` per level.

Group (file) header
- File name: `text-foreground font-medium` or `text-primary` (primary is the one accent verified on `editorBg` at 4.5). Replace `text-purple-400`. Use `text-row`/`text-rail` size and `hover:underline`.
- Count and date: `text-meta text-muted-foreground tabular-nums` (verified 4.5 on card, editor, background).
- Container: `border-b border-divider` for a flat list, or `rounded-lg border border-border bg-card shadow-xs` for cards (`--shadow-xs` is a token and adapts via `--elev-*`, `app.css:123`). If cards are used, root surface = editor-bg and cards = `bg-card`.
- A sticky header would need an opaque background (`bg-editor-bg` or `bg-card`), not `/90` alpha plus `backdrop-blur`, which is what Graph uses; with long lists alpha reveals scrolling text.

Chip (due date, priority, tag, recurrence)
- Base: `inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-label` (matches NoteRow, `NoteRow.svelte:104`).
- Neutral (tags, recurrence, start/scheduled): `bg-muted text-muted-foreground` (`muted` is the hover fill so `mutedForeground` on `muted` is not a listed pair; verify, see open questions) or `bg-primary/10 text-primary/80` as NoteRow does.
- Due today: `bg-warning/15 text-warning`. Overdue: `bg-destructive/15 text-destructive`. Done: `text-success`. Tailwind v4 supports `/NN` alpha on theme colors defined in `@theme inline`, which `warning`, `success`, `destructive` are (`app.css:22,72,73`).
- Priority: a small flag icon with `text-destructive` (highest/high), `text-warning` (medium), `text-primary` (low), `text-muted-foreground` (lowest), plus an accessible name; do not rely on hue alone.
- Never reintroduce raw palette classes like Kanban's `bg-red-500/15 text-red-500`; they do not follow any catalog theme and are the only reason this ticket's family of problems exists.

Process
- If the redesign needs a color that none of the tokens cover, add a derived CSS variable in `app.css` using `color-mix(in oklab, <token> N%, var(--editor-bg))`, as the event and meta-bind blocks do (`app.css:399-463`). Do not add a new key to `ThemeColors`: it would have to flow through `buildTheme`, `theme-editor.logic.ts`, the catalog schema in the themes repo and `isThemeColorValue` (ADR-0035 "The validator is the contract with the themes repo").
- Any new text-on-surface pairing that must be guaranteed (for example `warning` on `card`) needs a row in `READABILITY_PAIRS` and the builder test, or it stays unverified. Prefer pairings that already exist.
- Add a guard test against raw palette color classes in `src/lib/features/tasks/` (a scoped version of the `chrome-state-styles` scan). Scoped to the folder it passes today after the one purple fix, and would not trip the 8 files that violate it elsewhere.
- Test the redesign in at least one light and one dark theme. The only built-ins in code are `KokoBrain Default` and `Lavender Haze`; catalog themes need the network, so a visual check of light means choosing `Lavender Haze` or a locally installed one.

## Open questions for the owner

1. Is `bg-card` on the Tasks view intentional (a different tone than Tags, Graph and the editor), or an accident? It decides whether group containers get their own card surface.
2. Should the file header be the theme accent (`text-primary`), neutral foreground, or a per-note color from the note's type (the `type-*` palette is used for type colors in the note list, see `NoteRow.svelte:89` `icon.titleColor`)? The last would tie Tasks to the type system but adds a lookup.
3. Is a new `READABILITY_PAIRS` entry acceptable if the redesign puts `warning`/`success`/`destructive` text on `card`, or should the redesign stay on pairings that are already verified?
4. Do you want the Kanban date chips (raw red/yellow/blue) fixed in the same effort, so Tasks and Kanban share one due-date chip? That is out of this view's scope but is the natural place to extract a shared chip and a shared due-proximity token mapping.
5. Is `text-xs`/`text-sm` acceptable in the redesigned view, or should it adopt the `text-label/meta/row` roles (my recommendation, since new chips will be authored in that vocabulary)?

## Not checked

- No in-app screenshots or measured contrast in installed catalog themes (no network, app not run). The 2.6:1 / 5.1:1 figures come from a hex approximation of Tailwind's oklch value and are estimates.
- Did not verify `mutedForeground` on `muted` or `primary` on `bg-primary/10` against any theme; neither is in `READABILITY_PAIRS`.
- Did not inspect the external themes repo (`diegorv/koko.brain-themes`) schema.
