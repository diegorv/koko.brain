# Sweep s8: Phase 6 (194 to 232) and 169 to 171

Checked against HEAD `318b6e9b5` on 2026-11-12. Read-only: no tests, no app run. "Verified" means I read the cited lines at HEAD. "Inferred" means a conclusion drawn from them.

Out of scope, skipped: 198 (done, 1198d8e7b), 229 (done, 8ab6672fa), 227 (moved to tasks-view-ux), 233 (past the range). 172 to 193 are not in this sweep.

## Verdict first

Phase 6 is almost all polish, refactor or docs. Three groups are real bugs, but none rates "high" for this owner's daily workflow. The Issues that deserve queue space, in this order:

1. **214** (note row loses its active fill on hover; kanban lane grip never appears). S, low risk. The note-row half is seen on every rail click, and the kanban half hides a feature.
2. **230** (linear calendar bars drift in every month shorter than 31 days). S, low risk, pure geometry. Impact depends on whether the owner uses the linear calendar view of a `.view` (inferred: unknown).
3. **225** (shipped kanban example has an invalid `sortMode`, so cards and lanes cannot be dragged). S, docs and an example file only, zero code risk. Only hits someone who opens the example, so it is optional and cheap.

Nothing here is already fully fixed. Partly fixed: 202 (per the Issue's own audit, not re-checked here), 224 (the 2000 ms vs 3000 ms delay is fixed in the README at `help/examples/auto-organize-features/README.md:41`, but step 4 is still wrong), 206 (collection parse error alert exists; graph and kanban gaps remain).

## Table

Impact is for this owner (core editing and saving, tables, Quick Capture, `.view` rail views, meta-bind, Kanban, canvas; no external sync). Class: bug, ux (works but misleading), polish, refactor, docs. "Owner decision" is open only when the Issue text says so and no decision is recorded.

| # | Issue | Class | State at HEAD | Impact (trigger) | Cx | Risk | Owner decision open | Recommend |
|---|---|---|---|---|---|---|---|---|
| 169 | File icons: one frontmatter reader (Rust) | refactor | present (two readers) | low: icon can change after a save only for frontmatter that `yaml` rejects; owner sets icons via the menu | M | medium (file-icons store, watcher path, save race) | no (option A recorded 2026-11-05) | no |
| 170 | File icon saves that cannot happen tell the user | bug (corner) | present | low: needs invalid YAML or a repeated key in a `.view` | S | low | no; waits on 169 | no |
| 171 | `$$` block math right under a paragraph or callout line | bug (live preview) | item 2 present; items 1, 3, 4 postponed by owner | low to medium: only if the owner writes math without a blank line above | S to M | high (Lezer block parser, live preview) | no (item 2 decided 2026-11-06) | no, see notes |
| 194 | Default theme drops Catppuccin preview overrides | polish | present | low: colors only, needs by-eye review | S | low | no | no |
| 195 | Canvas nodes, edges, grid use theme tokens | polish | present (white-alpha literals in 7 files) | low: only light themes; Default is dark | M | low | no | no |
| 196 | Canvas menus, pickers, edge labels use theme tokens | polish | present | low: light themes only | S | low | no; waits on 195 | no |
| 197 | Kanban card hides empty date row until hover or focus | polish | present; blocker 151 now done | low: visual noise | S | low | no | no |
| 198 | Status colors use theme tokens | done | done | - | - | - | - | skip |
| 199 | Settings moves focus in and returns it on close | ux | present | low to medium: Settings is opened rarely; after Mod+Comma typing still edits the note, after close focus is on body | S | low | no | maybe later |
| 200 | Settings modal with scrim and Tab trap | ux/design | present (no scrim, no aria-modal) | low | S | low | no (decided 2026-11-06); waits on 199 | no |
| 201 | Retention days and debounce accept typed values | bug (ux) | present (both fields clamp in `oninput`) | low: clearing the field and typing 30 gives 130; stored value is clamped, no corrupt data | S | low | no | no |
| 202 | Help text inside its settings row (SettingItem hint) | polish | partly fixed per audit; no `hint` prop still (not re-opened by me) | low | S | low | no | no |
| 203 | Settings groups as cards with dividers | polish | present | low | M | low | no | no |
| 204 | EmptyState, InlineAlert, Badge primitives | refactor | present | none visible | M | low | no | no |
| 205 | Panels and settings use the primitives | refactor | present | none visible | M | low | no; waits on 204 | no |
| 206 | Graph, collection, kanban real empty and error states | ux | partly: graph still logs and returns on a failed `buildGraph` (`GraphView.svelte:80-85`), no retry | low: graph is not a daily view | M | low | no; waits on 087, 204 | no |
| 207 | Chrome icon buttons share sizes, shadcn tooltips | polish | present | low | M | low | no | no |
| 208 | Graph controls and event dialog use shadcn controls | polish | present | low | S | low | no | no |
| 209 | Search and link rows reserve a gutter for hover actions | polish | present (`SearchResult.svelte:175-178`) | low: only event notes | S | low | no | no |
| 210 | NoteInfo and Relationships heading follow section recipe | polish | not re-checked | low | S | low | yes (drop or strengthen the heading) | no |
| 211 | Editor tables use the full content width | polish | present (`styles.ts` wrapper `paddingRight: '24px'`, `paddingBottom: '10px'`) | medium visibility, low harm: every table is 24px narrower than sibling blocks; owner uses tables daily | S | medium (live preview CSS; controls are absolute-positioned in that padding; Live Preview rule 11 stopPropagation) | no | optional, after 062 |
| 212 | Tags view explains rare-tag filter hiding everything | ux | present (`TagsView.svelte:35-39, 81-82`) | low: only when every tag has fewer than 10 uses | S | low | no | no |
| 213 | Word count and graph stats pluralize for 0 and 1 | polish | present (`WordCount.svelte:33`, `GraphView.svelte:462`) | low: "0 words ... 1 min read" on an empty note | S | low | no | no |
| 214 | Active note row keeps its fill on hover; kanban lane grip appears on lane hover | bug (CSS) | present both halves | medium: row half on every rail click; kanban half hides lane reorder | S | low | no | YES |
| 215 | Collection table reads as a table | polish | not re-checked in code beyond the audit | low | M | low | no | no |
| 216 | Collection table header names and sticky header | polish | not re-checked | low | M | low | yes (dotted-key wording); needs-info | no |
| 217 | New event dialog shows "Enter a title." untouched | ux | present (`EventForm.svelte:38, 69-74`) | low: owner does not list the event calendar | S | low | no | no |
| 218 | Command palette dense rows with key hints | polish | not re-checked | low | M | medium (shared CommandDialog: Quick Switcher, pickers) | no (decided 2026-11-06) | no |
| 219 | Click in audio wrapper padding moves the cursor | bug (live preview) | present (`widgets.ts:196-217`, two `test.fail()` in the E2E) | low: audio embeds are rare | S | high (live preview widget events) | no | no |
| 220 | Search panel stops repeating index status | polish | present (`SearchPanel.svelte:98-111`) | low | S | low | no (decided) | no |
| 221 | Code-block dropdown and guide offer unhighlighted languages | bug (ux) | present | low to medium: powershell, dockerfile, elixir, haskell, scala show as plain text | S (drop from list) or M (add grammars and a dependency) | low (list) / medium (dependency, needs `pnpm build`) | no | optional |
| 222 | Register the five grammars | bug | present; waits on 221 | same as 221 | M | medium (dependency) | no | no |
| 223 | Markdown guide Quick Reference shows `$$formula$$` | docs | present (`04-markdown.md:748`) | low | S | none | no | docs batch |
| 224 | Auto Organize example steps | docs | partly fixed: delay now 3000 ms; step 4 "no edits needed" still wrong | low | S | none | no | docs batch |
| 225 | personal-week kanban example `sortMode` | bug (example) | present (`personal-week.kanban:24`, type at `kanban.types.ts:43`) | low: only when the example is opened; then no sort and no drag | S | none | no | optional docs batch |
| 226 | Periodic Notes help format examples | docs | present (`08-*.md:62`, journal path example) | low: shipped default is already escaped | S | none | no | docs batch |
| 228 | Help docs speak of views | docs | not checked; waits on 067, 142 | low | S | none | no | no |
| 229 | Todoist token note | done | done | - | - | - | - | skip |
| 230 | Linear calendar bar geometry | bug | present (`CollectionLinearCalendarView.svelte:67-73` vs 31-column grid at `:144, :163, :189-194`) | unknown: wrong in every month under 31 days (about three cells off for day 28 of February) if the owner uses the linear calendar | S | low | no | YES (if used) |
| 231 | Opt-in renderer diagnostics | feature | needs-triage | none | M | medium | yes (needs approval) | no |
| 232 | Future: custom icon colors | feature | needs-triage, not built | none | L | low | yes | no |

## Notes on the picks and near misses

**214, two class bugs in hover states (verified).**
- Note row: `src/lib/features/note-list/NoteRow.svelte:70` carries `hover:bg-primary/10` and `{isActive ? 'bg-primary/25' : ''}` on one button. In Tailwind the hover variant outranks the plain utility, so the open note's stronger fill drops to the hover fill while the cursor is on it (inferred from Tailwind ordering; not run). The sibling `TypesNavigator.svelte:282-283` already uses the correct form (`active ? ... : 'hover:...'`), so the fix is a one-line ternary copied from it.
- Kanban lane grip: `KanbanLane.svelte:215` declares `group/lane`, but `:236` uses the unnamed `group-hover:opacity-60`. I grepped the kanban plugin, the editor core and `AppShell.svelte` for a bare `group` ancestor: only `KanbanCard.svelte:158` (a descendant) matches. Fact: the lane grip has no unnamed group ancestor in those folders. Inference: it stays at `opacity-0` on hover. Lines `:356` and `:391` already use `group-hover/lane`, so the fix is `group-hover/lane:opacity-60`.
- Gate: the Issue wants two E2E checks on computed style (jsdom cannot evaluate Tailwind hover). That is the cost, not the code. Frontend gate plus `bash scripts/e2e.sh` on `rail-shell.spec.ts` and `kanban-view.spec.ts`.
- Touches `NoteRow.svelte`, which is shared with RailNoteList. Check the `.view` rail lists do not depend on the hover fill (view-engine Issues are series-sensitive: "RailNoteList / lens.logic.ts / CollectionView.svelte" group in the priority file; NoteRow is adjacent but not in that list).

**230, linear calendar geometry (verified).** `getBarLeft` and `getBarWidth` divide by `daysInMonth` (`:67-73`) while the track has 31 equal columns (`:144, :163, :189-194`). The fix is to divide by 31. The test is a pure function check. Ask the owner (one line) whether they use the linear calendar; if not, drop it. It is not in the deferred 131-144 chain.

**171, item 2 (verified present, not recommended).** `blockMathParser` at `math-extension.ts:63-111` has no `endLeaf` (grep found none). The owner decided on 2026-11-06 to render it. Risk is high by the owner's rules: a block parser change in live preview, and an `endLeaf` has to check that a closing `$$` exists, or typing a lone `$$` under a paragraph splits the paragraph while the user is still typing. The existing parser returns false for an unclosed block, so a naive `endLeaf` would make this worse. Impact is unknown: it needs the owner to write math directly under a paragraph. Leave it unless the owner reports hitting it. Related docs fix 223 is the cheap alternative: the Quick Reference row `$$formula$$` (`04-markdown.md:748`) describes a form the parser deliberately rejects (pinned by `math.test.ts:49-53` per Issue 223).

**211, table width (verified present).** The owner uses tables daily, so this is the most visible polish item in the range, but it is only 24px of width and carries medium risk because the add-column and add-row controls are absolutely positioned into the reserved padding. The Live Preview rules file applies (rule 11, `stopPropagation` on the controls). Do it after 062 (same `widgets.ts` hot code group), or not at all.

**199 and 200 (settings focus and modal).** `SettingsPanel.svelte` has no `bind:this`, no focus call, no `aria-modal` (grep for `focus|bind:this|aria-modal` matches only the nav buttons' `focus-visible` classes at `:137`). Fact. The effect: after Mod+Comma, typing edits the note behind the drawer; after close, focus is on `body`. Settings is a rare surface for this owner, so low to medium. 199 first, 200 only after 199.

**221 (code languages).** `code-highlight.logic.ts:5` builds lowlight from `common` only; `code-block-widget.ts:41-47` offers `powershell`, `dockerfile`, `elixir`, `haskell`, `scala`; `highlightCode` returns escaped plain text for any unregistered language (`:41-46`). Fact. `lowlight` is the only direct dependency in `package.json` (`:68`); `highlight.js` is transitive. The cheap fix removes the five names from the dropdown and the guide (S, no dependency change). Registering them (the Issue's preferred route, and the owner's recorded one in 222) adds a direct dependency and needs `pnpm build` plus the quarantine policy. Low to medium: only when the owner writes one of those five languages.

**201 (typed values).** Both fields still clamp in `oninput`: `FileHistorySection.svelte:38` and `AutoOrganizeSection.svelte:134-137` (the Issue still says "AutoMove", the feature is now Auto Organize, `clampDebounce` at `:29`). No test file for either section exists. The glitch needs select-all, delete, type, and the stored value stays clamped. Low.

**Docs-only group 223, 224, 225, 226 (and 228 after 067, 142).** All still present, all S, no code risk, single docs commit batch in the Gate sense (`pnpm vitest run src/tests/help/`). Impact is low because they only mislead someone following the docs. 224 needs its text re-read first: the file is now under `help/examples/auto-organize-features/README.md`, the 3000 ms default is already right, and step 4's "no edits needed" is still wrong because `writeTab` returns early for a clean tab (`editor.service.ts:189`; Issue 224 says the observer is `notifyAfterSave`, so a non-dirty Cmd+S moves nothing, inferred from that path). 225 is the only one of the four that breaks behavior (a drag-disabled, unsorted board) and only for the shipped example file.

## Owner decisions still open in this range

- 210: drop the "Relationships" heading or strengthen it.
- 216: how dotted keys (`file.name`, `formula.x`) read when humanized (status needs-info).
- 231 and 232: needs-triage; 231 also says "when explicitly approved for implementation".
- 230 (not an Issue decision, a usage question): does the owner use the linear calendar view.

## Not verified

- Tailwind ordering for 214 was read from the class strings, not run in a browser.
- 202, 210, 215, 216, 218, 228 were rated from the Issue text and the 2026-11-08 audit headers only; I did not open their code.
- No test run, no app run, so every "present" is a code read at HEAD, not a reproduction.
