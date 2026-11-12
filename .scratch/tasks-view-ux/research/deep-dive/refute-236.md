# Refute: Issue 236, a Tasks group header reads like a note

Ticket: `.scratch/open-itens/issues/236-tasks-group-header-reads-like-a-note.md`. Dossier: `dossier-236.md` (same folder). HEAD: `d2304ac9e`. None of 108, 242, 110, 234 has landed, so every statement about their output is read from their ticket text, not from code. "Verified" below means read in code or in `node_modules` at HEAD; "Inference" is marked.

## Verdict

**Confidence: medium.** The ticket's facts about today's header are right (verified): the only palette class in `src/lib/features/tasks/` is `text-purple-400` at `src/lib/features/tasks/TasksView.svelte:154`; the date and count render at `:159-164`; the circle button is `shrink-0 mt-0.5 cursor-pointer` with a 16 px icon (`:178`, `:183`, `:185`); the local `formatDate` and its zero guard sit at `:80-87`; `features/file-icons` imports no other feature (grep for `from '#lib/features` in that folder is empty), so `tasks -> file-icons` forms no cycle; Issue 198's `palette-classes.test.ts` does not exist (`ls src/tests/lib/architecture/`); the 26 palette names match `node_modules/tailwindcss/theme.css` for the installed Tailwind 4.3.4.

What keeps it from high:

1. The toggle-circle recipe the ticket gives (`p-1 -m-1`) does not keep the row height or the icon position next to the existing `mt-0.5`, because Tailwind 4 emits `margin-top` after `margin` (verified). An agent following the example ships a 2 to 4 px shift that no jsdom test can see.
2. "The resolver's icon color through `iconColorStyle(resolved?.color)` in both cases" is wrong for the `IconRenderer` branch: that component has no `style` prop and applies the color itself.
3. The "resolved icon" acceptance test stays red with a correct implementation unless the test preloads the icon pack; the ticket does not say so, and the obvious way out (mocking `getIconSync`, as `EditorView.test.ts` does) is outside the mock rules in CLAUDE.md.
4. Several "What to build" points have no acceptance row (the circle's hit area and focus ring, the title never tinted, the other-year date and the zero guard), and two acceptance rows cannot fail (`feature-cycle.test.ts`; a palette scan with no self-check).

Nothing requires an owner decision: the "Answered" line is a plan choice the owner can override at review, so a relay agent will not block on it.

## Must-fix edits

### M1. The toggle-circle classes

- **Change:** "The toggle circle gets a 24 px hit area through padding and a matching negative margin (for example `p-1 -m-1`), so the icon size and the row height stay the same, plus `outline-none` and the shared focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50`, as the `components/ui` buttons use)."
- **To:** "The toggle circle gets a 24 px hit area: replace its `mt-0.5` with `p-1 -mx-1 -mb-1 -mt-0.5 rounded-full`, keeping `shrink-0 cursor-pointer` and the `size-4` icon, plus `outline-none` and the shared focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50`, as the `components/ui` buttons use). Do not write `-m-1` next to `mt-0.5`: Tailwind 4 emits `margin-top` after `margin`, so `mt-0.5` overrides the negative top margin, the icon moves 4 px down and the row grows 2 px. Dropping `mt-0.5` and using `-m-1` alone moves the icon 2 px up. With the classes above the icon stays where it is (top margin -2 px + padding 4 px = 2 px, as today) and the button's margin box stays 16 x 18 px. jsdom computes no Tailwind, so check it once by eye in the app or say in the delivery that it was not checked visually."
- **And add an acceptance row:** "- [ ] `TasksView.test.ts`: the `[data-task-toggle]` button's class list holds `p-1`, `-mx-1`, `-mb-1`, `-mt-0.5`, `outline-none`, `focus-visible:ring-[3px]` and `focus-visible:ring-ring/50`, not `mt-0.5`, and its icon still has `size-4`. A class-token check is the most jsdom can do."
- **Evidence:** button classes `src/lib/features/tasks/TasksView.svelte:178`; icon `size-4` at `:183`, `:185`; row `flex items-start` at `:174`; Tailwind property order `"margin","margin-inline","margin-block",...,"margin-top","margin-right","margin-bottom","margin-left"` in `node_modules/tailwindcss/dist/lib.js` (same list in the `.mjs` chunks), version 4.3.4 (`node_modules/tailwindcss/package.json`); `data-task-toggle` comes from Issue 110 (`.scratch/open-itens/issues/110-open-closed-rule.md:31`). Arithmetic is inference from that order.

### M2. Icon color in the two branches

- **Change:** "`IconRenderer` when it returns an icon, else the `FileText` fallback; the resolver's icon color through `iconColorStyle(resolved?.color)` in both cases."
- **To:** "`<IconRenderer icon={resolved.icon} class=\"size-4 shrink-0\" color={resolved.color} />` when it returns an icon (`IconRenderer` applies the color itself and takes no `style` prop), else `<FileText class=\"size-4 shrink-0 text-muted-foreground\" style={iconColorStyle(resolved?.color)} />`, exactly as the `fileTabIcon` snippet in `EditorView.svelte` does. The icon sits next to the title button, outside it, so an emoji never joins the button's accessible name."
- **Evidence:** `src/lib/app/EditorView.svelte:56-63`; `IconRenderer` props are `icon`, `class`, `color` only (`src/lib/features/file-icons/IconRenderer.svelte:10-19`) and it styles both branches from `iconColorCss(color)` (`:20`, `:24`, `:34`); `iconColorStyle` at `src/lib/features/file-icons/file-icons.logic.ts:231-234`. Placement outside the button is a choice I recommend (inference): an emoji `<span>` inside the button has no `aria-hidden` (`IconRenderer.svelte:24`) and would change the name every `getByRole('button', { name })` locator reads.

### M3. The resolved-icon test needs the pack in the cache

- **Change:** "- [ ] The header renders the `FileText` fallback icon for a plain note, and the resolved icon when the file icons store holds a frontmatter icon for it."
- **To:** "- [ ] The header renders the `FileText` fallback (`svg.lucide-file-text`) for a plain note, and the resolved icon when the file icons store holds a frontmatter icon for it. The resolver only returns an icon whose pack is already in the module cache, so the test runs `await preloadPacks(['emoji'])` (`file-icons.icon-data.ts`) and then `fileIconsStore.updateFrontmatterIcon(<path>, { iconPack: 'emoji', iconName: '🚀', color: 'red', titleColor: 'red' })`, and asserts a `<span>` with text `🚀` and an inline color, no `svg.lucide-file-text`, and a title button with no inline style (the resolver's colors never tint the title). `fileIconsStore.reset()` runs in `beforeEach`. Do not mock `getIconSync`."
- **Evidence:** `getIconSync` returns `undefined` for an unloaded pack (`src/lib/features/file-icons/file-icons.icon-data.ts:306-309`); `resolveRef` then drops the icon (`src/lib/features/file-icons/icon-resolver.ts:50-52`); `preloadPacks` at `file-icons.icon-data.ts:316-320`, emoji built synchronously at `:259-267`, `:291`; `'🚀'` in `EMOJI_LIST` at `:256`; `updateFrontmatterIcon` and `reset` at `src/lib/features/file-icons/file-icons.store.svelte.ts:43-58`; lucide class `lucide-<name>` built at `node_modules/@lucide/svelte/dist/utils/buildLucideIconNode.js:26-31`. The mock rule: CLAUDE.md "Mock only Tauri APIs, side-effect services, and DOM services"; `getIconSync` is none of those.

### M4. The date acceptance row: units, other year, zero guard

- **Change:** "- [ ] The header's title has the modification date as its `title`, with no year for a date in the current year (clock faked)."
- **To:** "- [ ] The header's title has the modification date as its `title`: `Jun 15` for a note modified in the current year and `Jun 15, 2025` for one modified in 2025, with the clock faked to 2026-11-12 (`vi.useFakeTimers({ toFake: ['Date'] })` plus `vi.setSystemTime`, restored in `afterEach`); a note with `modifiedAt: 0` has no `title` attribute. The IPC mock's `modifiedAt` is in seconds (`FileTaskGroupV2`); `buildTaskIndex` stores milliseconds, which is what `formatDate` gets. Use mid-month noon UTC timestamps: the test environment sets no time zone."
- **Evidence:** seconds-to-ms conversion `src/lib/features/tasks/tasks.service.ts:20-24`; unit note `src/lib/types/vault-v2.types.ts:11-12`; the view refetches through the IPC on mount (`TasksView.svelte:73-78`), so setting the store directly from a test is overwritten; `formatDate(date, format)` is dayjs (`src/lib/utils/date.ts:42-44`); no `TZ` in `vitest.config.ts` (only `src/tests/help/queryjs-contract.test.ts:33-34` sets one locally).

### M5. Two acceptance rows that cannot fail

- **Change:** "- [ ] `feature-cycle.test.ts` passes with the rewritten `featurePairs` committed."
- **To:** "- [ ] After running `feature-cycle.test.ts`, `git diff src/tests/lib/architecture/feature-cycle-baseline.json` adds `\"tasks -> file-icons\"` (and nothing else this Issue did not cause), and that file is in the commit. The test rewrites the file and never fails on a new pair, so the diff is the check."
- **Evidence:** `src/tests/lib/architecture/feature-cycle.test.ts:38-44` (rewrites at module load), `:88-89` ("featurePairs drift never fails").
- **Change:** "- [ ] A source-text check over `src/lib/features/tasks/**/*.{svelte,ts}` finds no Tailwind palette class: ..."
- **To (append to the row):** "The check lives in `src/tests/lib/features/tasks/tasks-palette.test.ts` and stays until Issue 198's architecture test covers the folder. It asserts that it scanned at least `TasksView.svelte` and `tasks.logic.ts`, and runs its matcher over fixed strings so it cannot pass vacuously: it flags `text-purple-400`, `hover:bg-red-500/15`, `dark:border-l-slate-200` and `to-sky-950`, and passes `text-primary`, `bg-primary/20`, `border-border/50` and `text-muted-foreground`. A hit prints `file:line`. Fails today on `TasksView.svelte:154`."
- **Evidence:** the only hit today `src/lib/features/tasks/TasksView.svelte:154` (regex run over the folder); Issue 109 relies on "Issue 236's check" for its chip colors (`.scratch/open-itens/issues/109-row-chips.md:24`), so the check must be a committed test with a known name, not a one-off grep.

## Should-fix edits

### S1. Subtitle: no vault open, and which helper

- **Change:** "A muted subtitle with the note's folder: the parent of `relativePath(vaultStore.path, filePath)` (`#lib/utils/path.js`), for example `Projects/Clients` for `Projects/Clients/ACME.md`. A note at the vault root has no subtitle, and neither does a path that stays absolute (outside the vault)."
- **To:** "A muted, truncated subtitle with the note's folder, from a pure exported `noteFolder(vaultPath: string | null, filePath: string): string` in `tasks.logic.ts`: the part of `vaultRelativeKey(vaultPath, filePath)` (`#lib/utils/path.js`) before its last `/`, for example `Projects/Clients` for `Projects/Clients/ACME.md`. It returns `''` (no subtitle) for a note at the vault root, for a path outside the vault (`vaultRelativeKey` returns null) and when no vault is open (`vaultStore.path` is null, as in the first describe of `TasksView.test.ts`). Issue 111 reuses it for `folder`. `tasks.logic.test.ts` covers nested, root, outside, null vault and a lookalike prefix (`/vault2/x.md` under `/vault`)."
- **Evidence:** `vaultStore.path` is `string | null` (`src/lib/core/vault/vault.store.svelte.ts:8`, `:60`), so passing it to `relativePath(vaultPath: string, ...)` fails `pnpm check`; `relativePath` returns the absolute path when outside (`src/lib/utils/path.ts:98-103`); `vaultRelativeKey` returns null instead (`:120-123`); first describe mounts with no vault (`src/tests/lib/features/tasks/TasksView.test.ts:59-67`). Cross-ticket conflict: Issue 111 derives `folder` from `relativePath` (`.scratch/open-itens/issues/111-quick-filters.md:15`), which yields an absolute parent for an outside path, against 236's "no subtitle". Point 111 at `noteFolder`.

### S2. "Before any filter"

- **Change:** "M counts all of the note's tasks before any filter, from the unfiltered `tasksStore.fileTaskGroups`, so with hide-closed on ..."
- **To:** "M counts the note's tasks before the view's own filters (date and hide-closed), from `tasksStore.fileTaskGroups` looked up by `filePath`; with a section tag set, Rust has already limited that list to the tasks under matching headings, so M counts those. `group.tasks.length` in the render loop is already filtered: `filterCompleted` returns copies with fewer tasks. Put the count in a pure `noteTaskCounts(tasks): { open, total }` in `tasks.logic.ts` with tests for all seven statuses."
- **Evidence:** store holds what the IPC returned (`src/lib/features/tasks/tasks.service.ts:70-76`); `filterCompleted` copies (`src/lib/features/tasks/tasks.logic.ts:59-70`); `filteredGroups` (`TasksView.svelte:46-52`).

### S3. Name the header test hooks

- **Add after the header anatomy list:** "The header carries `data-task-group` on its wrapper, `data-task-group-title` on the title button, `data-task-group-subtitle` and `data-task-group-count`. Tests find the parts through them, not by position (the rule Issue 110 sets for rows). The count renders as one text node so its `textContent` is exactly `2 of 3 open`."
- **Evidence:** no group hooks exist anywhere (`grep data-task-group` in `src/`, `e2e/` and the tickets is empty); Issue 110's rule for rows (`110-open-closed-rule.md:32`, `:52`); Issues 112 and 240 later assert on headers (`112-group-and-sort.md:14`, `:33`; `240-tasks-collapse-groups-and-row-cap.md:7`) and gain stable selectors.

### S4. First acceptance row: note how it fails today

- **Append to the first row:** "The title and root-note assertions alone pass today (the title is already `fileName`, and no subtitle exists); the subtitle and `2 of 3 open` assertions are what fail, and the hide-closed-on case is what rejects `group.tasks.length` as M."
- **Evidence:** `TasksView.svelte:157`, `:159-164`.

### S5. Help page

- **Add:** "`help/documentation/10-tasks-and-todoist.md`: the line about clicking a file name says a note's header shows its icon, title, folder and `N of M open`, and that the title opens the note and shows its modification date on hover. The screenshot near the top is not regenerated; say so in the delivery."
- **Evidence:** `help/documentation/10-tasks-and-todoist.md:113`. Optional: no CLAUDE.md rule requires it, but every predecessor in the chain edits this page for visible changes (108, 242, 110, 234).

### S6. Trivial wording

- "the modified date in brackets and the task count in brackets": they are parentheses (`TasksView.svelte:160`, `:163`). Harmless.

## Dossier errors

Substance: the dossier is right on the points that matter (verified): the Tailwind margin order and the `p-1 -mx-1 -mb-1 -mt-0.5` arithmetic, the copy semantics of `filterCompleted`, the single palette hit, the sort position of the new pair, `feature-cycle.test.ts` never going red, the emoji preload route, and `IconRenderer` applying its own color. Errors found are line numbers and one emoji line:

1. `TasksView.test.ts` `mountView` is at `:76-92` (doc comment at `:76`), not `:73-90`.
2. The second describe opens the vault at `:202-203` and closes it at `:211`, not `:199-200` / `:197-200` and `:210`.
3. `resolveIconForPath` spans `icon-resolver.ts:64-77`, not `:64-75`; `ResolvedIcon` is at `:38-45`, not `:41-48`; the lookup slot and `registerTypeIconLookup` are at `:19-31`, not `:21-26`.
4. `'🚀'` in `EMOJI_LIST` is at `file-icons.icon-data.ts:256`, not `:253`.
5. `pure-logic.test.ts`: the forbidden-package rule is at `:40-45` and the forbidden-file rule at `:48-54`; the dossier's `:60-65` is `isPureStart`, and its `:44-50` (risk 7) straddles both.
6. E2E `getByRole('button', { name: 'Welcome', exact: true })` is at `e2e/specs/tasks-view.spec.ts:106`, not `:105`.
7. Section 1.3 gives Issue 110's count line as `{stats.pending} open in {stats.fileCount} notes`; Issue 110 also asks for the singular ("1 open in 1 note", `110-open-closed-rule.md:11`). Inferred either way; 236 does not touch that line.
