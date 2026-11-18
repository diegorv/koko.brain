# Inventory: Settings area

Scope: `src/lib/core/settings/` (18 .svelte: `BuildInfo.svelte` + 17 in `sections/`), `src/lib/app/SettingsPanel.svelte`, `src/lib/app/LabsSection.svelte`. Facts only, no proposals. Line numbers are `path:line`.

Feature sections rendered inside the panel but owned elsewhere (out of scope, listed for completeness): `features/search/SearchSection.svelte`, `features/rail-shell/LayoutSection.svelte`, `features/auto-organize/AutoOrganizeSection.svelte`, `features/event-calendar/EventCalendarSection.svelte`, `features/todoist-sync/TodoistSection.svelte`, `plugins/queryjs/QueryjsSection.svelte`, `plugins/mods/ModsStatusList.svelte` (rendered by LabsSection.svelte:50).

---

## 1. Components

Line counts from `wc -l`. "shadcn" = `#lib/components/ui/*`. "custom" = hand-written markup.

| File | Lines | Renders | shadcn used | Custom markup |
|---|---|---|---|---|
| `src/lib/app/SettingsPanel.svelte` | 162 | Right-side fixed panel (820px), section nav, content column | Button (close, :151), ScrollArea (:155) | Fixed `div role="dialog"` (:115-120, no shadcn Dialog), nav `<button>` list (:136-143) |
| `src/lib/app/LabsSection.svelte` | 52 | "Vault mods" toggle, mod status list | Switch (:43) via SettingItem | none |
| `src/lib/core/settings/BuildInfo.svelte` | 52 | Channel pill + build string | none | `span` pill (:49-52) |
| `sections/SettingItem.svelte` | 41 | Row wrapper: label span, description span, control slot | none | `div` rows (:20-40) |
| `sections/AppearanceSection.svelte` | 306 | Theme list, theme cards, "Create new theme", online catalog | Button (:192,203,246,265,287,291) | Theme card `div role="button"` (:172-178), catalog rows, ThemePreview miniatures |
| `sections/ThemeEditor.svelte` | 202 | Name input, Export/Import, color-group tabs, color rows | Button (:133,149,150,156,160), Input (:137) | Group tabs `<button>` (:176-184), hidden `<input type=file>` (:164-170) |
| `sections/ThemeColorRow.svelte` | 73 | Label, color swatch, hex text field | Input (:63) | Swatch `<label>` wrapping native `<input type=color>` (:51-61) |
| `sections/ThemePreview.svelte` | 53 | Miniature app preview of a theme | none | All markup custom, inline `style=` on every node (:21-50) |
| `sections/HeadingTypographyEditor.svelte` | 118 | Six `<details>` blocks (H1-H6) with 4 settings each | Input (:61,74,105), Select (:87-100), SettingItem | native `<details>/<summary>` (:52-58) |
| `sections/EditorSection.svelte` | 174 | Font family (+ Browse popover), font size, line height, paragraph spacing, content width | Input, Popover (:55-83), Command (:60-81), buttonVariants on Browse trigger (:56) | inline `style="font-family: ..."` on font items (:74) |
| `sections/PeriodicNotesSection.svelte` | 132 | Folder, then per period (daily/weekly/monthly/quarterly/yearly) format + template, daily auto-open/auto-pin | Input, Switch | none |
| `sections/QuickCaptureSection.svelte` | 79 | Folder/filename formats, 5 templates | Input | none |
| `sections/OneOnOneSection.svelte` | 101 | People folders, new-note formats, template path, due-after-days | Input | none |
| `sections/FilesSection.svelte` | 46 | Templates folder, system folder, folder notes switch | Input, Switch | none |
| `sections/FileHistorySection.svelte` | 56 | Auto snapshots switch, retention days, backup switch | Input, Switch | none |
| `sections/TrashSection.svelte` | 138 | Trash list with restore / delete-permanently, Empty Trash | Button (:74,114,123), ScrollArea (:88) | Row `div`s (:91) |
| `sections/TroubleshootingSection.svelte` | 158 | Debug/log switches, live preview decorator switches, Tauri switches | Button (:86), Switch (many) | none |
| `sections/SentrySection.svelte` | 95 | Error monitoring switch, DSN input, test-event button, status text | Button (:82), Input (:64), Switch (:52) | `<p role="alert">` (:75), `<p role="status">` (:88) |
| `sections/TypesSection.svelte` | 58 | Explicit organization, show untyped, typed notes folder | Input, Switch | none |
| `sections/UpdateSection.svelte` | 376 | Current version, check/download/restart state, channel select, downgrade block, auto-check switch, changelog list | Button (:276,284,292,329,332), Select (:305-318), Switch (:343) | Status row spans (:280-295), changelog `ul` + `button` (:359-372) |

Count: 18 components (BuildInfo + 17 sections) plus 2 panel files.

Icon sources: lucide icons imported per component (SettingsPanel.svelte:21-39 for section nav icons; ThemeEditor.svelte:24-26; AppearanceSection.svelte:25-29; TrashSection.svelte:10-13).

---

## 2. States: empty / loading / error / disabled

**Visible states present**
- Trash loading: `TrashSection.svelte:80-81` "Loading...". Trash empty: `:82-86` icon + "Trash is empty". Trash count badge hidden at 0 (`:67`). "Empty Trash" button hidden when empty (`:73`).
- Trash load with no vault: `onMount` only calls `loadTrash` when `vaultStore.path` is set (`:17-21`); no else branch.
- Theme catalog loading: `AppearanceSection.svelte:258-259` "Loading the theme catalog...". Error: `:260-268` (`data-testid="theme-catalog-error"`, text "Could not load the theme catalog. Your installed and built-in themes still work.", Retry button). Empty catalog: `:300-301` "The theme catalog is empty." Per-entry "Requires a newer KokoBrain" (`:297`).
- Catalog error also fires `toast.error` (`:52`) in addition to inline state.
- Update status machine: `UpdateSection.svelte:275-297` renders `idle` (Check button), `checking` ("Checking..."), `downloading` (percent text), `ready` (Restart button), `up-to-date` ("You're up to date", :288), `error` (message + Retry, :289-295). No state for "last check failed silently" beyond these.
- Update "Last checked" text: "never" when null (`:100-101`).
- Changelog empty: `UpdateSection.svelte:356-357` "No app changes since ...".
- Sentry: configuration error `<p role="alert">` (`SentrySection.svelte:74-76`); test-event result `role="status"` (`:87-89`); test button disabled and relabelled "Sending…" while in flight (`:82-83`).
- Font picker empty: `EditorSection.svelte:66` "No fonts found.".
- Theme name validation error inline (`ThemeEditor.svelte:144-146`), cleared on input (`:141`).
- Font list fetch failure: silently sets `[]` (`EditorSection.svelte:18-24`); the "Browse" button is then not rendered (`:54`). No message.

**Visibly absent**
- Sections that never render loading/empty/error: PeriodicNotes, QuickCapture, OneOnOne, Files, FileHistory, Types, Editor (except font picker), Labs (`LabsSection.svelte` has no loading state; save failures are toast-only, `:21-22`), BuildInfo.
- Labs: `setModsEnabled` start failure is only logged (`LabsSection.svelte:27-29`), the switch stays on, no UI error.
- Trash: `handleRestore` / `handleDeletePermanently` / `handleEmptyTrash` errors are toast-only (`TrashSection.svelte:28,42,57`).
- Troubleshooting: `initLogSession().then(...)` has no catch (`TroubleshootingSection.svelte:44-46`, `:149-151`); no error shown.
- Update: download progress is text only (`UpdateSection.svelte:282`), no progress bar; "Downloading v{version} (?)" when size unknown (`formatBytes` returns "?", :123).

**Disabled / conditional states**
- Sentry fields hidden (not disabled) until enabled: `SentrySection.svelte:58` `{#if settingsStore.sentry.enabled}`.
- Update downgrade block hidden unless `downgradeTarget` (`UpdateSection.svelte:321`).
- Changelog hidden when `changelog` is falsy (`:349`).
- Browse font popover hidden when no system fonts (`EditorSection.svelte:54`).
- Theme card actions: Edit hidden for builtin/installed (`AppearanceSection.svelte:191`); Delete hidden for builtin (`:229`), Uninstall replaces Delete for installed (`:218`).
- Dependency notes that are text only, controls not disabled:
  - Auto-pin "requires auto-open" (`PeriodicNotesSection.svelte:58`), no disabled state.
  - "Save mod run messages to file" "Also requires Save debug log to file" (`TroubleshootingSection.svelte:56`), no disabled state.
  - "Profile decoration plugins" "requires log to file enabled" (`:95`), no disabled state.
  - Heartbeat "Needs a log file" (`:67`), no disabled state; the switch still toggles and only starts when a session is active (`:73`).
- Only `disabled` attribute in the area: `SentrySection.svelte:82` (while sending).
- `Switch` primitive disabled styling exists in `components/ui/switch/switch.svelte` (not in area) but no area control passes `disabled`.

---

## 3. Interaction

**Keyboard**
- Global Escape closes the panel: `SettingsPanel.svelte:105-109` via `<svelte:window onkeydown>` (:112). No check for `defaultPrevented` or an open popover (relevant to the font popover in EditorSection, :55).
- Panel is `role="dialog"` (`:118`) but no `aria-modal`, no focus move on open, no focus trap, no focus restore. `settings-panel.store.svelte.ts` has no focus code (checked by grep: none in SettingsPanel.svelte or the store).
- Nav items are real `<button>` elements (`SettingsPanel.svelte:136-143`), so Tab/Enter work; `aria-current="page"` on active (`:138`).
- Theme cards: `div role="button" tabindex="0"`, Enter and Space select (`AppearanceSection.svelte:172-178`). No focus-visible class on the card (`:173`).
- Theme card actions are revealed on hover or `group-focus-within` (`AppearanceSection.svelte:190`); keyboard reveal works only through focus-within.
- Theme editor group tabs: plain `<button>`s (`ThemeEditor.svelte:176-184`), no `role="tab"`, no `aria-selected`.
- Hex field: Enter blurs and commits (`ThemeColorRow.svelte:40-44`); invalid text reverts on blur (`:35-37`). Escape does nothing.
- Heading sections use native `<details>/<summary>` (`HeadingTypographyEditor.svelte:52-53`).
- Number inputs commit on `oninput` and clamp on `onchange` (e.g. `EditorSection.svelte:98-104`).

**Focus management**
- Focus-visible styles on nav (`SettingsPanel.svelte:137`) and on shadcn Button/Input base classes (`components/ui/button/button.svelte` base string, not in area).
- No explicit focus styles on: theme cards (`AppearanceSection.svelte:172-178`), ThemeEditor group tabs (`ThemeEditor.svelte:176-184`), `<summary>` (`HeadingTypographyEditor.svelte:53`), color swatch label (`ThemeColorRow.svelte:51-61`, the native color input is `opacity-0` and still focusable).
- `UpdateSection.svelte:364` removes outline (`focus-visible:outline-none`) and uses underline as the only focus indicator.

**Hover-only affordances**
- Theme card action row: `opacity-0 ... group-hover:opacity-100 group-focus-within:opacity-100` (`AppearanceSection.svelte:190`).
- Native color picker overlay is `opacity-0` covering the swatch (`ThemeColorRow.svelte:57`).

**Drag and drop / context menus / tooltips**
- Drag and drop: none in area.
- Context menus: none in area.
- Tooltips: no shadcn Tooltip used in area (grep: none). All tooltips are native `title=` attributes: `ThemeEditor.svelte:133`, `UpdateSection.svelte:332,365`, `TrashSection.svelte:118,127`, `AppearanceSection.svelte:197,208,224,235`.

**Click handlers on non-buttons**
- `AppearanceSection.svelte:173-178`: whole theme card is `div role="button"` with onclick and onkeydown (`svelte-ignore a11y_no_static_element_interactions` at `:171`).
- `ThemeColorRow.svelte:51`: `<label>` wrapping a native color input acts as the swatch click target.
- All other click targets are `<button>` or shadcn Button/Switch/Select.

**Other**
- File import: hidden `<input type=file>` triggered by an Import button (`ThemeEditor.svelte:97-99,164-170`); file read with FileReader, input reset after read (`:125-126`).
- Trash row has hover background only, no row click (`TrashSection.svelte:91`).
- Mod enable is saved, then start/stop runs immediately (`LabsSection.svelte:17-33`).

---

## 4. Accessibility facts

**Icon-only buttons**
- Close settings: `SettingsPanel.svelte:151` `aria-label="Close settings"`, no title.
- Back to themes: `ThemeEditor.svelte:133` title + aria-label.
- Theme card Edit / Duplicate / Uninstall / Delete: title + aria-label (`AppearanceSection.svelte:197-198, 208-209, 224-225, 235-236`).
- Trash Restore and Delete permanently: `title` only, no aria-label (`TrashSection.svelte:118, 127`). Icon-only; name comes from title.
- Color swatch (`ThemeColorRow.svelte:51-61`): no aria-label; the wrapped native color input has no label.

**Form controls without programmatic labels**
- Switches: 18 instances in area; only 3 have `aria-label`: `LabsSection.svelte:44`, `TroubleshootingSection.svelte:59`, `TroubleshootingSection.svelte:116`. The other 15 have no accessible name (for example PeriodicNotesSection.svelte:52-62, FilesSection.svelte:39-44, FileHistorySection.svelte:20-25, UpdateSection.svelte:343-346, SentrySection.svelte:52-55, TypesSection.svelte:15-20).
- Inputs: 35 `<Input>` instances in area; none has aria-label or id (checked with grep within 5 lines of each tag). Labels are `<span>` text in SettingItem (`SettingItem.svelte:26`), not `<label for>`.
- Hex text field and color input in ThemeColorRow have no label (`ThemeColorRow.svelte:55-71`).
- Font weight select has aria-label "Font weight" (`HeadingTypographyEditor.svelte:92`). Update channel Select has no aria-label (`UpdateSection.svelte:305-318`).
- Theme name input has placeholder only, no label (`ThemeEditor.svelte:137-143`).

**Roles and live regions**
- Dialog: `role="dialog" aria-label="Settings"` (`SettingsPanel.svelte:118-119`), no aria-modal.
- Nav headings: `h2` "Settings" (`:126`), group labels `h3.section-label` (`:130-132`); section pages use `h2` for title and `h3` for groups.
- Sentry: `role="alert"` (`SentrySection.svelte:75`), `role="status"` (`:88`), `aria-invalid` on DSN input (`:70`).
- Theme name error: not linked (no aria-describedby / aria-invalid) (`ThemeEditor.svelte:144-146`).
- Theme catalog section has `data-testid` only, no landmark (`AppearanceSection.svelte:252`).
- Trash count badge: plain span (`TrashSection.svelte:68-70`).

**Keyboard-only paths**
- Theme card select works via Enter/Space (`AppearanceSection.svelte:177`).
- Changelog entries are buttons with title "Open the commit on GitHub" (`UpdateSection.svelte:362-368`).

---

## 5. Styling facts

**Raw colors**
- Hard-coded in class: `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]` (`SettingsPanel.svelte:116`).
- No raw hex in any area .svelte file. Hex values appear only as runtime theme data via inline style (`ThemePreview.svelte:21-50`, `ThemeColorRow.svelte:53`).
- Settings token values exist as hex in app.css `.dark` block only (`src/app.css:261-267`: `--settings-dialog-bg #313549`, `--settings-sidebar-bg #2B2F40`, `--settings-text #bfcaf3`, `--settings-hover-bg #393e50`, `--setting-item-bg #20212d`, `--switch-unchecked-bg #444660`). Light `:root` (`app.css:155-213`) defines none of them; theme keys exist as defaults in `theme.logic.ts:170-174` and `theme-editor.logic.ts:82`; the runtime write path to CSS variables was not traced.

**Theme tokens used by the area**
- Surfaces: `bg-settings-dialog-bg`, `bg-settings-sidebar-bg`, `bg-settings-hover-bg` (incl. `/60`), `bg-setting-item-bg` (7 uses), `bg-card`, `bg-muted`, `bg-rail-bg`, `bg-list-bg`.
- Text: `text-settings-text` (8), `text-muted-foreground` (31), `text-primary`, `text-destructive` (8), `text-success`, `text-warning`, `text-type-purple`.
- Borders/rings: `border-border` (6), `border-primary`, `border-muted-foreground/10`, `ring-primary`, `ring-ring/50`.
- Status: `bg-success/20`, `bg-warning/20`, `bg-primary/20`, `bg-type-purple/20` (BuildInfo.svelte:29-34), `bg-destructive/10`.

**Typography**
- Theme text tokens (`src/app.css:92-99`): `text-label` 11px, `text-meta` 12px, `text-row` 14px. Used for rows, descriptions, badges.
- Tailwind defaults mixed in: `text-lg` for every section title (16 files, e.g. `EditorSection.svelte:38`, `UpdateSection.svelte:263`), `text-sm` for two intro paragraphs (`AppearanceSection.svelte:162`, `QuickCaptureSection.svelte:32`) while sibling intro/notes use `text-meta` (e.g. `TypesSection.svelte:54`, `AppearanceSection.svelte:254`).
- Mini preview uses raw px: `font-size: 5px`, `line-height: 10px`, bars `3px`/`4px`, `height: 14px`, widths `28px`, `40px` (`ThemePreview.svelte:25-50`), inline.
- ThemeColorRow overrides a shadcn size responsively: `md:text-meta` (`ThemeColorRow.svelte:65`).
- Mono font for hex and build info: `font-mono` (`ThemeColorRow.svelte:65`, `BuildInfo.svelte:44-45`).
- `section-label` utility (app.css:140) used for all group headings (uppercase, `text-label`, muted).

**Arbitrary sizes / spacing values**
- Panel width `w-[min(820px,80vw)]` (`SettingsPanel.svelte:116`), header band `h-14` (`:125`, `:150`), nav `w-48` (`:122`), content `px-10 pb-8`, `max-w-3xl` (`:156`).
- `max-h-[50vh]` trash list (`TrashSection.svelte:88`); `max-h-64` changelog (`UpdateSection.svelte:359`).
- Hex input `w-[5.5rem]` (`ThemeColorRow.svelte:65`); Input widths `w-24` (EditorSection, HeadingTypographyEditor, FileHistorySection:34, OneOnOneSection:94) and `w-44` select (`UpdateSection.svelte:310`), `w-36 h-20` catalog placeholder (`AppearanceSection.svelte:278`).
- `size-7` icon buttons in Trash (`TrashSection.svelte:117,126`), `size-10 opacity-30` empty icon (`:84`).
- SettingItem: `min-h-14 px-4 py-3`, `max-w-[50%]` control (`SettingItem.svelte:21,37`).
- Section spacing: h2 `mb-4`, h3 `mb-2`, section gap `mt-6` (e.g. `EditorSection.svelte:40,150`); theme editor `mb-4` blocks.

**z-index**
- Only `z-40` on the panel (`SettingsPanel.svelte:116`). Panel is `fixed ... bottom-(--status-bar-height)` (uses `--status-bar-height: 2rem`, app.css:212).

**Transitions and animation**
- Panel slide: `transition:fly={{ x: 820, duration: 200 }}` (`SettingsPanel.svelte:117`, import :95). 200 ms.
- `transition-colors` (Tailwind default duration) on nav items (`SettingsPanel.svelte:137`), tabs (`ThemeEditor.svelte:177`), theme cards (`AppearanceSection.svelte:173`).
- `transition-opacity` on theme action row (`AppearanceSection.svelte:190`).
- `transition-all` on Switch primitive (`components/ui/switch/switch.svelte`, not in area).
- `prefers-reduced-motion`: not referenced in any area file or in `src/app.css` (grep found no match; the only "reduce" hit is `theme-builder.logic.ts:185`, a JS array reduce).

**Custom CSS files**
- No `<style>` blocks in any area .svelte file (grep).
- Styling is Tailwind utilities plus app.css tokens; `column-tones` helpers live in app.css:376-393 and are used by ThemePreview (`ThemePreview.svelte:19-20`).

**Inline styles**
- `style=` in area: `EditorSection.svelte:74` (font-family per font), `ThemeColorRow.svelte:53` (swatch background), `ThemePreview.svelte:21,25-27,32-50` (theme colors and sizes).

**Shadcn primitives used by area**
- Button, Input, Switch, Select, Popover, Command, ScrollArea, buttonVariants. Not used: Dialog, Tooltip, Collapsible, Separator, DropdownMenu, ContextMenu (the settings panel is hand-built, see SettingsPanel.svelte:114-162).

---

## 6. Copy

**Heading and label case**
- Title case in dialog/button text: "Empty Trash" (`TrashSection.svelte:51,75`), "Delete Permanently" (`:36`), "Show in Finder" (`TroubleshootingSection.svelte:87`), "Open log folder" label is sentence case (`:83`).
- Sentence case elsewhere: "Create new theme" (`AppearanceSection.svelte:248`), "Send test event" (`SentrySection.svelte:80`), "Restart to update" (`UpdateSection.svelte:285`), "Check for updates" (`:272`), "Auto-check on launch" (`:340`).
- Section headings with "&": "Files & Folders" (`FilesSection.svelte:9`, nav `settings.logic.ts:277`), "Types & Lifecycle" (`TypesSection.svelte:9`).
- Nav label "Types" (`settings.logic.ts:267`) vs page title "Types & Lifecycle" (`TypesSection.svelte:9`).
- Nav label "Auto Organize" (`settings.logic.ts:279`) vs "Auto-organize" in other places (feature section, out of scope). "Auto-open", "Auto-pin", "Auto-check" hyphenated (`PeriodicNotesSection.svelte:51,58`, `UpdateSection.svelte:340`); "Automatic snapshots" (`FileHistorySection.svelte:18`).
- Nav "Calendar" (`settings.logic.ts:271`) for the event-calendar feature section (out of scope).
- Heading "Quick Capture" (`QuickCaptureSection.svelte:30`) matches nav label (`settings.logic.ts:269`).
- "Periodic Notes" nav and heading (`settings.logic.ts:268`, `PeriodicNotesSection.svelte:20`), body text "Quick Capture notes (Cmd+N included)" (`PeriodicNotesSection.svelte:24`) vs shortcut format "Ctrl+Alt+Cmd+Space" (`QuickCaptureSection.svelte:33`).
- Section names lowercase in prose: "Vault mods" (`LabsSection.svelte:40`), "Labs" (`:37`).

**Ellipsis**
- Three dots: "Loading...", `TrashSection.svelte:81`; "Loading the theme catalog...", `AppearanceSection.svelte:259`; "Checking...", `UpdateSection.svelte:280`; "Downloading v{version} ({size})... {percent}%" (`:282`).
- Unicode ellipsis: "Sending…" (`SentrySection.svelte:83`).

**Error and status phrasing**
- "Could not ..." (`AppearanceSection.svelte:52,263`; `SentrySection.svelte:21,37`; `LabsSection.svelte:22`, "Could not save the Vault mods setting") vs "Failed to ..." (`TrashSection.svelte:28,42,57`: "Failed to restore", "Failed to delete", "Failed to empty trash").
- Sentry: "Enter a valid Sentry Cloud DSN ..." (`SentrySection.svelte:18`) vs "Sentry DSN" label (`:60`); "Sentry is not active. Enter a valid DSN ..." (`:35`). "Cloud" appears once.
- Retry button labels: "Retry" (`UpdateSection.svelte:293`, `AppearanceSection.svelte:266`).
- Sentence endings: "Check the DSN and try again." (`SentrySection.svelte:21,37`) consistent; "Test event sent. Check Sentry Issues in a few moments." (`:32`) capitalizes "Issues".

**Units and ranges**
- Editor "Font size in pixels (8-32)" (`EditorSection.svelte:90`) vs heading "Size in em (0.5-5.0)" (`HeadingTypographyEditor.svelte:60`) vs "Line height multiplier" (`EditorSection.svelte:110`) vs heading "Multiplier (1.0-3.0)" (`HeadingTypographyEditor.svelte:73`). Ranges use en dash (`EditorSection.svelte:90,110`; `FileHistorySection.svelte:30`).
- Paragraph spacing "Extra space after each line, in em (0 = none, e.g. 0.5)" (`EditorSection.svelte:131`); Content width "(0 = no limit)" (`:154`).
- Retention: "Days to keep every snapshot. For 30 more days one per day is kept per file, then they are deleted (1-365)" (`FileHistorySection.svelte:30`).

**Description style and jargon**
- Most descriptions have no final period (e.g. `EditorSection.svelte:44,90,110`; `FilesSection.svelte:13,25`), but some are multi-sentence with periods (`SentrySection.svelte:50`, `TroubleshootingSection.svelte:56`).
- Developer terms in user copy: "_one_on_one_every: true" (`OneOnOneSection.svelte:90`), "_folder: <path>" (`TypesSection.svelte:55`), "{person}" placeholder (`OneOnOneSection.svelte:64`), "kb.pages()" (`FilesSection.svelte:25`), "run.log", "ctx.log" (`TroubleshootingSection.svelte:56`), "snapshots-backup" path (`FileHistorySection.svelte:47`), "Decorators" (`TroubleshootingSection.svelte:105`), "ms" and "click-to-paint" (`:67`).
- Tone: "Leave off unless you are chasing a stall." (`TroubleshootingSection.svelte:67`), "Inspect log files before sharing." (`:56`), "Only enable mods you wrote." (`LabsSection.svelte:41`).
- "Off by default." (`SentrySection.svelte:50`), "Recommended for everyday use." (`UpdateSection.svelte:57`), "May be unstable." (`:62,67`).

**Terminology drift**
- "Mods" (`LabsSection.svelte:41`) vs "mod run messages" (`TroubleshootingSection.svelte:55-56`) vs "Vault mods" label; "Labs" section placed under Advanced nav group (`settings.logic.ts:297`) while Mods toggle lives in Labs and its log flag in Troubleshooting.
- "Log" / "log file" / "system log directory" / "log folder" used for the same thing (`TroubleshootingSection.svelte:36-37,84,142`).
- "Inbox" capitalized as a view name (`TypesSection.svelte:13`), "rail's note lists" (`FilesSection.svelte:25`) vs "rail" elsewhere.
- "color theme" in the intro copy (`AppearanceSection.svelte:163`) vs "Appearance" heading (`:149`) and "Theme catalog" (`:253`).
- Update channels: "Stable", "Nightly", "Preview" (`UpdateSection.svelte:53-69`), and "Preview build" in downgrade copy (`:148`).
- Dash characters in user copy: en dash in ranges only; em dash only in code comments (`UpdateSection.svelte:81,96,221`).

**Other copy**
- Settings nav "Settings" h2 (`SettingsPanel.svelte:126`) and dialog aria-label "Settings" (`:119`) duplicate the same word; no other page-level title.
- "Show in Finder" is macOS-specific; the description says "system file manager" (`TroubleshootingSection.svelte:84,87`).
- "Install X (downgrade)" button in heading-like label (`UpdateSection.svelte:325,329`).
- "Releases page" (`:332`) vs "GitHub Releases page" in its title (`:332`).

---

## 7. Notable code facts for the review (no proposals)

- `UpdateSection.svelte:276` and `:292`: `onclick={checkForUpdates}` passes the MouseEvent as the `opts` argument of `checkForUpdates(opts)` (`:167-170`). The function reads `opts.forceChannel` / `opts.allowDowngrades`, which are undefined on an event object, so the default path is taken.
- `SentrySection.svelte:13-24`: every DSN keystroke calls `configureSentry` (`updateSentry` on each `oninput`, `:67`).
- `EditorSection.svelte:31`, `:99`: number inputs write on `oninput` before clamp; clamp happens only on `onchange` (`:101-104`), so the stored value can be out of range while typing.
- `FileHistorySection.svelte:38-41`: retention clamps on every `oninput`.
- `OneOnOneSection.svelte:10-16`: empty or unparseable due-days input is ignored (no value change, no visual feedback).
- `AppearanceSection.svelte:94-103`: deleting the active theme silently switches `activeTheme` to the default.
- `AppearanceSection.svelte:134`: save always sets `activeTheme` to the saved theme.
- `TroubleshootingSection.svelte:73-75`: heartbeat start is skipped silently when no log session is active.
- `SettingItem.svelte:25-31`: description is `text-pretty`; label is a `span` (not `label`).

## 8. Test coverage hints (for context only)

Area tests exist under `src/tests/lib/core/settings/` (for example `settings-copy.test.ts`, `SettingItem.test.ts`, `ThemeEditor.test.ts`, `UpdateSection.changelog.test.ts`, `TroubleshootingSection.test.ts`, `TrashSection.test.ts`). Not inspected in depth; `settings-copy.test.ts` may pin some strings.

## 9. Not checked

- Runtime rendering, contrast, and actual focus order (no app run; static read only).
- `components/ui/*` internals beyond the Switch, Button and Input class strings grepped.
- The six feature sections rendered inside the panel (listed in the header, not inventoried).
- `ModsStatusList.svelte` (rendered by LabsSection).
