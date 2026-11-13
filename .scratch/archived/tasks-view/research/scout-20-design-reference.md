# Scout 20: the owner's design prototype as a Tasks UI reference

Scope: the owner's separate design prototype repo, a sibling of this checkout (read-only). A Next.js 16 + Tailwind v4 + shadcn/Radix app prototype, not Kokobrain. Line numbers verified by reading unless marked "approx."

## Facts

- No task, to-do, or Todoist UI exists in this repo. `grep -i "task|todo|todoist"` over `src/` hits only time-tracking entries (`src/components/pages/time-tracking/time-tracking-page.tsx:200-291`, `src/components/pages/time-tracking/entry-dialog.tsx:54-111`). No Todoist anywhere.
- Closest analogue is Time tracking (`/time-tracking`, `src/lib/nav.ts:20`): a week switcher, a timer card, a per-day chart, and an entries list. Its entries are project + task + minutes + billable (`src/lib/types.ts:94-99`).
- Time tracking page structure (`time-tracking-page.tsx`):
  - Sticky 68px header with title, "N hours logged" subline, prev/this/next week buttons, and a brand "Add entry" button (lines ~50-95).
  - Stats in a `grid md:grid-cols-[1fr_260px]` card: chart left, Total/Billable/Non-billable right, plus a billable-ratio bar (lines ~117-160).
  - Entries card grouped by day. Phones get a `ul` with day anchor rows (`tt-mday-*`). md+ gets a `table-fixed` with columns Task / Project / Billable / Duration / actions (lines ~180-300).
  - Empty state: icon tile, "No time logged this week", a hint line, and an action button (lines ~166-175).
- Filter pattern, reusable: `src/components/filter-menu.tsx`. Desktop is a 32px icon button opening a 288px popover; phones get a bottom Drawer with a "Show results" footer (lines 62-130). Groups are `multi` (checkbox-like chips) or `single` (radio chips), with an active-count badge and a Reset action. Chips are `h-8 rounded-lg border`, selected = `border-brand/40 bg-brand-tint`.
- Search pattern: `src/components/time-off/requests-table.tsx:164-180`. Icon + `type="search"` input (`placeholder="Search"`, `aria-label="Search requests"`) with a clear button, followed by the FilterMenu. Sort is a dropdown of named options (`requests-table.tsx:54-59`: "Recently submitted", "Newest dates", "Longest first", "Status"), and `sort` is treated as a filter in the active count.
- Filter state is a typed object with `DEFAULT_FILTERS` and an `activeCount` derived from "differs from default" (`requests-table.tsx:33-35`, `:83-112`). Reset restores defaults.
- Status badge: `src/components/time-off/status-badge.tsx:6-30`. A 22px pill, tinted background and border from `--status-{tone}-tint` and `--status-{tone}-border`, text in `--status-{tone}`, with an icon per state (approved check, declined x, pending clock, cancelled ban). Tones: success/danger/warning/neutral.
- Category tints: `globals.css:57-62` define `--category-{green,orange,blue,cyan,pink,purple}-tint` alongside paired `--event-{color}-bg/fg` (light in `:root` from line 19, dark in the block starting at line 108; exact event lines not checked). Used by `KindTile` in `src/components/pages/withdrawal-methods/shared.tsx` (approx. lines 17-30): a 36px rounded square with tint background and fg-coloured icon.
- Project colour: `time-tracking/shared.ts:10-14` hashes the project name into `PROJECT_COLORS` (djb-like `h*31`). Stable colour per project without storage. Shown as a 8px dot next to the name (`time-tracking-page.tsx` ~line 205-212).
- Billable/non-billable colour is fixed: brand purple for billable, `#1f9cb8` for non-billable (`time-tracking/shared.ts:4-5`).
- Design tokens: `src/app/globals.css:19-101` (light `:root`), `:108` dark (`[data-theme="dark"]`). Brand `#8965de` (`:40`), hairline `#e5e7e1`, app bg `#f8f8f8`, surface `#ffffff`. Text scale is `t-12` / `t-14` / `t-16` utilities at line-height 1 (`globals.css:262-275`). `salt` font-feature (`:277`) is applied to labels and nav. Font is Geist (`:204`).
- Motion/input: `press` active-scale utility (`globals.css:282`), `hover-fine` custom variant (`globals.css` near line 10, approx.) so hover applies only with a fine pointer.
- Layout primitives: `src/components/pages/shared/page-chrome.tsx` exports `PageRoot`, `PageHeader` (sticky 68px md+, wraps on phones, `:30-70`), `Card`, `CardHeader` (min-h 52px, `:72-100`), `EmptyState` (`:103-128`), `StatTile`/`StatGrid` (`:130-205`). A single reusable set for every secondary page.
- Dialog field: `src/components/dialogs/field.tsx` `Field({label,...})` wraps a label with the input (used by entry-dialog).
- Phone/desktop split is systematic: `max-md:` overrides on heights (44-56px touch rows, `h-10` buttons) and `md:hidden` / `max-md:hidden` duplicates for list vs table.
- Stack and theming: dark mode via `data-theme` attribute + `next-themes` (`README.md`, `globals.css:8`), with `color-scheme` set per theme.
- Keyboard shortcuts documented in README (`N`, `R`, `T`, `D/W/M`, `?`, `⌘K` command palette). Not task-specific.
- Brain-side context not verified here: this is a design prototype, not the Kokobrain app. It has no persistence beyond localStorage (`README.md`).

## Problems and gaps

- Nothing to copy for tasks: no task model, no rules engine, no source selection, no categories/tags, no integration settings UI. Any Tasks design must be invented, using only the visual language.
- Time tracking is a flat list with one level of grouping (by day). The same gap the owner complains about in the Tasks view: no multi-facet grouping, no saved filters, no rule builder.
- FilterMenu supports only flat option lists per group. No nested or conditional rules, no "is/is not/contains" operators, no OR-of-ANDs. It cannot express "source = note folder X AND tag Y".
- Search is a single free-text field on the page with no field scoping (`requests-table.tsx:169-170`).
- Sort is a single choice (`requests-table.tsx:54-59`). No multi-key sort.
- Integration UI (Todoist-like sync) has no precedent here. Settings (`src/components/pages/settings/settings-page.tsx`, 539 lines) has no connected-account or sync-status pattern (grep for "connect/integration" found none).
- No empty-state variants beyond "nothing this week".
- Design is a prototype. Some values are hand-set (e.g. `NON_BILLABLE_COLOR = "#1f9cb8"` hardcoded in TS, not a token). Do not copy this mix as a rule.

## Ideas worth keeping

- Visual language to align with: hairline cards (`rounded-xl border-hairline bg-surface`), 68px sticky page header, t-14 body and t-12 meta text, brand `#8965de` for active/selected, tinted-chip selection (`bg-brand-tint border-brand/40`).
- Filter chips for simple facets, plus the FilterMenu desktop popover / phone drawer split. Keep the same component family for the Tasks filters so the app feels consistent.
- Status badge pattern (tinted pill, icon + label, tone tokens) for task status (open, done, overdue, synced/unsynced to Todoist).
- Project colour from a stable hash (`time-tracking/shared.ts:10-14`) as a cheap way to colour task sources without storing colours.
- Grouped list with a sticky per-group header and a per-group total (`time-tracking-page.tsx` day rows). Maps well to grouping tasks by source or by project.
- `activeCount` = count of groups differing from default, plus Reset. Good affordance for "filters active" on the Tasks toolbar.
- Summary strip with totals and a ratio bar (billable ratio). Analogue: open vs done vs synced ratio.
- Empty state: icon tile + one line + one hint + one action (`page-chrome.tsx:103-128`).
- Design tokens for categories (`--category-*-tint`, `--event-*-bg/fg`) give six colours with light and dark pairs. Use for task categories so they match calendar events.

## Open questions

- Does the owner want Tasks to reuse this prototype's visual language exactly, or only as a reference? The Kokobrain app has its own tokens; compare before adopting.
- Is "source" (which notes/tasks are picked up) better shown as a rule list (row per rule with a live match count) or as chips? The prototype has no precedent; this needs a design decision, not a copy.
- Is the Todoist integration a settings panel, an inline status per task, or both? No pattern exists here.
- Should the Kokobrain filter UI support nested AND/OR rules, or only flat facets? Affects whether FilterMenu's flat model is enough.
- Mobile: the prototype's phone drawer works for flat filters. Is a rule builder usable in a bottom sheet at phone width? Untested here.
