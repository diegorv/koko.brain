# Scout 14: prior art outside this repo

Area: how other tools model "when a note/record matches a rule, change its properties/icon/color". Read-only web research, 2026-11-10. No repo file was edited.

Evidence grades used below:
- **[P]** primary: I fetched the README, docs page or source and the quoted facts come from that page.
- **[S]** secondary: the fact comes only from a search-result summary or a third-party write-up. Treat as a lead, not proof.
- **[U]** not found: the source does not say. Stated explicitly so nobody assumes.

The fetch tool summarizes pages with a small model, so quotes marked as quotes are the tool's extraction of the page text, not byte-verified copies.

## 1. Summary table

| Tool | Trigger | Action | Set vs fill | Conflict / loop | Rule UX |
|---|---|---|---|---|---|
| Auto Note Mover (farux) | create, metadataCache `changed`, rename, plus manual command; Automatic/Manual mode toggle | move file only | n/a | first match wins; rename guard avoids self-trigger | ordered list: folder + tag-or-title pattern |
| Conditional Properties (diegoeis) | manual, per-file command, per-rule run, scheduled (min 5 min). No on-save | add/remove/overwrite/delete/rename property, H1 edits, file rename/move/bookmark/delete | "Add value" non-duplicating; "Overwrite"; no fill-if-missing action, emulated by an `does not exist` condition | rules run in list order, later rules see earlier changes in the same scan; no loop detection documented | IF (all/any) / "Do this" rows, JSON export, rule search |
| Auto-Properties | per-rule checkboxes: modify (debounced), open, focus (leave note), manual | writes one frontmatter key from note content | per-rule "no overwrite" (skip if non-empty) vs default overwrite; "auto-add" creates missing key | loop behavior undocumented | rules in settings, JSON clipboard export/import |
| Frontmatter Generator | on save via a separate save plugin, plus manual folder/vault commands | JS expression returns an object of fields | undocumented | undocumented; `yaml-gen-ignore` opt-out | one template, JS expression |
| MD Butler | per-field checkboxes: open, modify, rename, bulk | managed fields (names, paths, dates, tags, custom text/select) | "New notes only" vs "All files" scope; "Force apply" | "Do-Not-Touch" key list; "Full repair" | per-field panel, templates `{{frontmatter:key}}`, `{{oldPath}}` on rename |
| Metadata Menu | mostly manual ("Insert missing fields"); auto only for Formula/Lookup fields and modified date | schema (fileClass) with fields | insert missing is the default path | fileClass assignment priority: explicit frontmatter first | fileClass files |
| Templater folder templates | vault `create` event only | render template into the new empty file | n/a (whole-file template) | known race with other create-time plugins | folder -> template table |
| Iconize rules | rendering time | icon (+ color) by regex on file/folder name or path; frontmatter `icon` key per file | n/a (derived at render) | rule order; no content matching | ordered rule list |
| Dynamic File and Folder Highlighter | rendering time | color by right-click, folder, regex, frontmatter key=value, numeric max/min | n/a (derived, nothing written) | fixed tier priority, later wins | settings panel with live regex validation |
| Supercharged Links | rendering time | copies chosen frontmatter attributes to link HTML attributes for CSS | n/a | CSS cascade | attribute selectors + Style Settings |
| Notion database automations | page added, property edited, schedule | Edit property, add/edit pages, notify, webhook | edit property overwrites; add/remove for multi-values | automations never trigger automations; paused on error | trigger/action builder |
| Tana supertags | applying the supertag | static default values, plus "auto-initialize" from context | fills at apply time only, never retroactive, not live | none needed (one shot) | field config panel |
| Capacities | none (no rules) | templates carry defaults | templates | none | object type settings |

## 2. Per-tool findings

### 2.1 Auto Note Mover (farux) [P]
Source: https://github.com/farux/obsidian-auto-note-mover and `main.ts` at https://raw.githubusercontent.com/farux/obsidian-auto-note-mover/main/main.ts

- **Trigger model.** Three listeners registered only after `onLayoutReady`: `vault.on('create')`, `metadataCache.on('changed')` (used as the "modify" trigger, there is no `vault.on('modify')`), and `vault.on('rename')`. No debounce or timer. A "Move the note" command runs the same `fileCheck` with caller `cmd`. A setting toggles Automatic vs Manual; in Manual only the command moves.
- **Why metadataCache and not modify.** Running after Obsidian re-parsed the file means rules see fresh tags/frontmatter and the check does not run on every raw write. Cost: on `create`, the cache may not be ready, and the code has no null check on the cache result.
- **Loop guard.** On rename, if the last segment of `oldPath` equals the current `basename.extension`, the handler exits, so the plugin's own folder move (and any manual folder move) does not retrigger. One move per check (`break` after the first matching rule).
- **Rules.** Ordered list, first match wins. A rule is a destination folder plus either a tag or a title regex. A rule with both set matches neither branch and is silently skipped. In regex mode a rule with both empty matches any note that has a tag. Tags need a `#` prefix.
- **Per-note opt-out.** `AutoNoteMover: disable` in frontmatter, plus excluded folders (exact parent match when regex is off, so subfolders are not excluded).
- **Known complaints.** Issue #73 (https://github.com/farux/obsidian-auto-note-mover/issues/73): with a Templater daily-note template, the new note errors because the move happens before Templater scripts finish, described as a race condition [S for the cause, the user's own guess; no maintainer fix seen]. Issue #39: manual command did nothing while automatic worked, fixed by reinstall/reconfigure [S].
- **Forks.** Auto Mover X (glebnaz) adds AND/OR tags and batch with dry-run preview; Auto Note Mover Plus (devkade) adds multi-condition rules (tag, title, property, date) with ALL/ANY [S, from search summaries]. Both exist because the original rule shape (one tag or one title) was too narrow: users wanted property conditions.
- **Relevance.** This is the closest analogue to Kokobrain Auto Move, and Kokobrain already exceeds it (expression engine, lifecycle rules). The lessons are the failure modes: creation-time race, empty-pattern edge cases, silently skipped half-filled rules.

### 2.2 Conditional Properties (diegoeis) [P]
Source: https://github.com/diegoeis/obsidian-conditional-properties

This is the nearest existing "if note matches, change frontmatter" plugin.

- **Trigger.** Manual vault-wide run, "Run on current file", "Run this rule", or a schedule (minimum 5 minutes) with scan scopes "latest created", "latest modified (1 to 1000)", "entire vault". The page documents no on-save or on-edit trigger. This is the main gap relative to the owner's wishes: users must run it or wait for the timer.
- **Condition model.** Property/H1 title/filename conditions with operators exact, contains, does not contain, exists, does not exist, is empty; regex via `/pattern/flags`; Match = all/any. Roadmap (not built): greater/less-than, nested groups, content modification, folder/tag scoping. Kokobrain's expression engine already covers all of these.
- **Action model.** Add value, remove value, overwrite all values, delete property, rename property; H1 prefix/suffix/overwrite; file rename/prefix/suffix/move/bookmark/delete. Multiple actions per rule. Placeholders `{{date}}`, `{{filename}}`, `{{propertyName}}`.
- **Set vs fill.** There is no "fill only if missing" action. The user writes an `IF prop does not exist` condition. Pitfall documented by the plugin itself: `is empty` on a missing property returns false, so "fill if missing or empty" needs two conditions. The plugin type-coerces: for checkbox/date/datetime "Add value behaves as Overwrite". "Rename property" is skipped silently if the target exists.
- **Ordering and chaining.** "Rules run in the order they're listed"; later rules see earlier changes within the same scan, including file renames and moves; within a rule later actions see earlier ones. "Delete stops everything else for that file." A malformed regex never crashes a scan: counted as no match plus a one-time notice.
- **Loop/conflict.** No documented loop detection or conflict resolution [U]. Scans are one forward pass, so the design avoids loops by not being event-driven.
- **UX.** Sentence-style rows ("Where ... And/Or ... Do this"), add-condition button, regex-missing-slashes hint, rule search, empty-state welcome, JSON export/import. Active release cadence (0.20.0 on 2026-05-19 per the community listing, [S]).
- **Lesson.** The "needs the user to press Run" model is the most common complaint category for this class of plugin (inferred from the existence of the scheduler and per-file command; I did not find an issue thread quoting it). The owner's "things change right away" requirement is explicitly the thing this plugin does not provide.

### 2.3 Auto-Properties [P]
Source: https://community.obsidian.md/plugins/auto-properties

- **Triggers are per rule and combinable:** Modify (shortly after content changes, described as "on edit pause", so debounced), Open (once when first opened), Focus (when leaving the note), Manual (no trigger enabled; command palette only). Scope by folder include/exclude with path-prefix matching; exclusion wins when both match; both empty means every note.
- **Action:** one rule reads the note body or file metadata and writes one frontmatter key. Rule types: lines, between, headings, callouts, file. Output pipeline then a template `${result}`, `${filename}`, `${created}`, `${modified}`.
- **Set vs fill:** a per-rule flag. Default overwrites on every fire. "No overwrite" skips the rule when the property already has a non-empty value. "Auto-add" creates the key if missing; without it the rule only updates existing properties. This is the closest match to the owner's "configurable per action between fill only if missing and always set", and it validates the shape: one boolean per write, evaluated against "non-empty", not just "present".
- **Loop handling:** undocumented [U]. The page does not say whether writing frontmatter refires Modify. Design principle stated: "Note bodies are never changed."
- **Maintenance pitfall:** upgrading V1 to V2 erased existing rules. A rule schema needs a versioned migration from day one.

### 2.4 Frontmatter Generator [P]
Source: https://www.obsidianstats.com/plugins/frontmatter-generator

- On save, but only through a separate plugin (obsidian-custom-save) calling a command; so it is not a self-contained trigger.
- A template is JSON or a JS expression returning an object, with `file`, `file.properties`, `file.tags`, optional `dv`, `z`. Conditional via ternary returning `{}`.
- Overwrite/preserve semantics, loop handling, and whether returning `{}` removes earlier fields are all undocumented [U]. Author warns templates are not sandboxed. Last release about three years old, score 36/100 on the stats page. Lesson: an expression-returns-object model is attractive but without documented merge semantics users cannot predict it. Kokobrain's engine is a sandboxed expression parser, which avoids the sandbox warning.

### 2.5 MD Butler [S]
Source: https://community.obsidian.md/plugins/md-butler (search summary only; page not fetched)

- Per-field checkboxes for four events: open, modify, rename, bulk. Defaults differ per field (dates and name/path on open/rename/bulk; lastModified on modify/rename/bulk).
- Scope "New notes only" (skip files that already have DateCreated) vs "All files"; "Force apply"; "Full repair"; a "Do-Not-Touch" list of YAML keys it will never write; rename events expose `{{oldPath}}`, `{{oldFolder}}`, `{{oldName}}`.
- Lesson: trigger selection attached to the action (per field) rather than to the whole feature matches the owner's per-action semantics. A protected-keys list is a cheap safety valve against overwriting user-curated keys.

### 2.6 Metadata Menu / Fileclass [S]
Sources: https://mdelobelle.github.io/metadatamenu/fields/ , https://community.obsidian.md/plugins/metadata-menu , https://community.obsidian.md/plugins/fileclass

- Schema first: a fileClass file defines fields; assignment by frontmatter, tag, bookmark group, query, folder mapping, or global; explicit frontmatter assignment has highest priority.
- No automatic write of new fileClass fields into existing notes; "Insert missing fields" is a button/bulk command. Only Formula and Lookup fields auto-update, and the docs warn formula auto-update can slow Obsidian on large vaults. Modified-date auto-update exists.
- Lesson: "fill what is missing" as an explicit user action, not a background event, is what this ecosystem settled on for schema fields. The performance warning on vault-wide auto-update supports scoping evaluation to the changed note.

### 2.7 Templater folder templates [S]
Sources: https://www.dsebastien.net/the-complete-guide-to-templates-and-templater-in-obsidian/ , https://forum.obsidian.md/t/templater-trigger-templater-on-new-file-creation/54425

- Trigger: vault `create` only; a setting "Trigger Templater on new file creation" must be on, plus a folder or regex rule. Documented limits: folder templates and file-regex templates are mutually exclusive; `tp.file.title` is "Untitled" at creation time; Templater and Obsidian race at creation so frontmatter may only appear on a second application; with the trigger on, files arriving via sync or copied into the vault get processed; it does not fire on open/edit of existing notes; a note moved by a script does not get the destination folder's template (forum thread 67085).
- Lesson for "on create/move/rename" triggers: create is a hazardous moment (empty file, name not final, sync imports look like creates). A design should decide whether files that appear from outside the app (sync, git pull) count as create, and should not apply to a note still being created by another feature (template apply, quick capture).

### 2.8 Iconize rules [P/S]
Sources: https://florianwoelki.github.io/obsidian-iconize/files-and-folders/use-frontmatter.html , https://github.com/FlorianWoelki/obsidian-iconize/discussions/121 , https://github.com/FlorianWoelki/obsidian-iconize/issues/492

- Two sources of icon: a per-note frontmatter key (default `icon`, name configurable, must be enabled in settings), and custom rules (regex on name or full path, for file/folder/both, with icon and color, ordered).
- Rules cannot match frontmatter or content. Maintainer, Oct 2022: content matching "requires to read all the content of all files, which can be really heavy to compute"; no commitment [P]. In Kokobrain the property index already exists, so this cost objection does not apply, but it explains why the Obsidian ecosystem has no "icon by property rule" and why a rule-to-frontmatter write (this feature) is the workaround users want.
- Issue #492: rule ordering bugs (icons wrong in subfolders; UI order differing from `data.json` order) [S]. Lesson: one authoritative order, shown in the UI exactly as evaluated.
- The page does not document precedence of frontmatter icon vs rule icon [U]. AutoIcons (https://community.obsidian.md/plugins/autoicons) documents a chain: frontmatter, then custom rules, then type defaults [S]. A design that writes the icon into frontmatter makes the per-note value the single source of truth, which is exactly that precedence by construction.

### 2.9 File/folder coloring: File Color, Dynamic File and Folder Highlighter, Tags Color Files [P/S]
Sources: https://community.obsidian.md/plugins/obsidian-file-color , https://community.obsidian.md/plugins/dynamic-file-folder-highlighter (fetched), https://community.obsidian.md/plugins/tags-color-files

- File Color (ecustic) is manual only: right-click, pick from a named palette; options are cascade to children and text vs background [S].
- Dynamic File and Folder Highlighter [P]: rule types right-click, folder path, regex on name or path, YAML key/value (exact, case-sensitive trim match, files only), conditional numeric max/min, hierarchy, active file. Fixed priority tiers "later wins": regex, YAML, conditional, folder/right-click, active, hierarchy. Rule editor has live regex validation with up to 3 sample matches, light and dark variant per color, named color combinations. Colors update live as files are edited.
- Tags Color Files: rule = tag + color, can highlight files lacking a tag, folder-scoped rules, drag to reorder [S].
- Lesson: these derive color at render time and write nothing. The owner wants writes (`_color`, `_icon`). The UX patterns worth copying are the named palette (a rule picks a named color, not a hex) and the live preview of matches while editing a rule. Pitfall: a hardcoded tier-priority list that users cannot reason about; a single ordered list is simpler.

### 2.10 Supercharged Links / Front Matter Title [S]
Sources: https://github.com/mdelobelle/obsidian_supercharged_links , https://github.com/snezhig/obsidian-front-matter-title

- Supercharged Links copies explicitly chosen frontmatter keys to link HTML attributes (`data-link-<key>`) plus CSS custom properties; styling is CSS or Style Settings selectors by tag, attribute value, path. Requires the user to list "Target Attributes for Styling". A fork, Re-supercharged Links, evaluates rules in memory without generated CSS.
- Front Matter Title never edits files; it only changes the displayed title from a frontmatter template key across explorer, tabs, graph, search. Pairs with Tidy Titles which writes the original title into frontmatter.
- Lesson: the frontmatter-as-single-source-of-truth pattern is widespread (icon, color, title all read from a key). This supports writing `_icon`/`_color`/`_title_color` and letting existing renderers react, rather than adding a second visual-override layer.

### 2.11 Other frontmatter writers and their hazards [S]
- Linter (https://platers.github.io/obsidian-linter/usage/running-rules/): triggers "lint on save" (Ctrl+S) and "lint on file change" (when closing or switching away, not while typing). The file is written twice when custom commands run after rules. Issue reports: a Thino-triggered Linter run linted the wrong active file and inserted frontmatter there (https://github.com/KazooTTT/issues-blog/issues/79); a conflict where frontmatter added on Ctrl+S did not appear in the editor until reopen (https://github.com/mnaoumov/obsidian-better-markdown-links/issues/40). Both are cousins of Kokobrain's open caret/editor-sync blocker (.scratch/open-itens/issues/001...). Obsidian's own users opt out per note with `disabled rules: [all]` or a body marker.
- Frontmatter Date Manager never writes into a note with unsaved changes in an open editor [S, search summary]. Frontmatter Operator offers snapshot undo [S].
- Obsidian API `FileManager.processFrontMatter` (https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter) [P]: "Atomically read, modify, and save the frontmatter"; the callback must be synchronous; throws `YAMLParseError` on unparseable YAML; the page says nothing about preserving comments, key order or quoting [U]. Kokobrain's equivalent is `updateNoteFrontmatter` with a lossy-frontmatter refusal (per Issue 01 evidence), which is stricter than what the Obsidian docs promise.
- YAML Toolkit (batch IF/THEN rules over frontmatter) exists as a 2026 forum release [S] (https://forum.obsidian.md/t/new-plugin-yaml-toolkit-for-obsidian-batch-manipulate-front-matter-with-conditional-rules/109674); not fetched.
- Bases (Obsidian core) has open requests for "default values for columns" and "autofill properties based on folder" (https://forum.obsidian.md/t/bases-qol-default-values-for-columns/113320 , https://forum.obsidian.md/t/autofill-properties-based-on-folder/79268). The stated current workaround is folder-triggered Templater. This confirms demand for folder/rule-driven default properties, and that users compare it favorably to template-based approaches because templates only run at creation.

### 2.12 Notion database automations [P]
Source: https://www.notion.com/help/database-automations (fetched)

- Triggers: Page added, Property edited (choose which kinds of edits count for some types), Every {frequency}. Multiple triggers combine with "any of" or "all of"; "all of" over several edited triggers must land within about 3 seconds.
- Actions: Edit property (add/remove individual values for multi-select, people, relation), Add page, Edit pages in, notify, mail, webhook, Slack, Define variables.
- **Loop handling is structural:** "Database automations can't be triggered by other automations." A page created or edited by one automation does not fire another. Only a user clicking a button chains.
- Failure handling: an automation that previously worked and hits an error is paused and must be re-enabled manually; formula/webhook failures may not notify the user. Date math on empty fields fails; recommended fix is a filtered view excluding empties.
- Scope: an automation limited to a view only runs if the page still matches the view at trigger time.
- Lesson: "no automation triggers another" is the simplest loop breaker and the most widely adopted. Auto-pausing a failing rule is an alternative to per-save error spam (compare Issue 01 rule 7: log, do not toast per autosave). Cost: users who want a rule to react to another rule's output cannot get it; Issue 01 rule 6 deliberately allows chaining through the save instead, which Notion forbids.

### 2.13 Tana supertags [P]
Source: https://outliner.tana.inc/docs/fields (fetched, redirected from help.tana.inc/auto-initialize-field-values.html)

- Trigger: applying a supertag to a node. Default values are static values in the supertag template. "Auto-initialize" fills a field from creation context (value from ancestor with the same field, ancestor with the supertag, random node with the tag, current date, date of ancestor day node, current user).
- Semantics: runs once when the tag is applied; not live; moving the node does not refresh values; it only works for fields that are part of the template; adding an auto-initialize field to a supertag already on nodes does not fill existing nodes (they get an empty field). It "won't change any prior field values" from before the initialization functions existed. Whether an existing non-empty value is kept at apply time is not stated [U]. User can edit afterwards.
- Workaround Tana users use for re-run: a command node (Insert Tana Paste) that recomputes the value on demand.
- Mobile known issue (older): auto-initialization did not run for nodes created on mobile [S].
- Lesson: Tana treats "set at apply time, never retroactive, never reverted" as the model, which matches the owner's "nothing is reverted when a rule stops matching". Tana users still ask for a re-run mechanism, so an explicit "apply rule to existing notes" command is the natural complement to event triggers.

### 2.14 Capacities [S]
Source: https://docs.capacities.io/migration/switching-from-tana , https://docs.capacities.io/reference/properties

- No rules/automation engine found. Default property values come from templates; a default template can be starred per object type. Titles cannot be generated from fields. Two-way linking of object properties is the only automatic property behavior. Changing a property's type maps existing values on a best-effort basis.
- Lesson: low relevance. It shows the "template at creation" baseline that the other tools extend.

## 3. Cross-cutting patterns

### 3.1 Trigger models seen
1. Event-driven on file events (Auto Note Mover, Templater, MD Butler, Auto-Properties).
2. Metadata-cache-driven change event rather than raw write (Auto Note Mover). Gives fresh parsed data, no per-keystroke cost.
3. Scheduled or manual scan (Conditional Properties, Metadata Menu, Frontmatter Generator manual).
4. Render-time derivation, nothing written (Iconize rules, highlighter, Supercharged Links, Front Matter Title).
5. Apply-time only (Tana, Templater).

The owner wants 1 plus a manual "apply to existing" (3). No surveyed tool offers on-save, on-property-change, and on-create/move/rename in one rule engine; MD Butler comes nearest with four per-field events. Property-change triggers in practice are implemented as "metadata changed" events (Auto Note Mover's `changed`, Notion's `Property edited`).

### 3.2 Set vs fill
- Per-rule or per-field boolean is the common shape (Auto-Properties "no overwrite", MD Butler "New notes only"/"Force apply").
- "Missing" definition matters and is a recurring trap: absent vs empty string vs null vs empty list. Auto-Properties says "non-empty"; Conditional Properties documents that `is empty` is false for a missing key. Issue 01 rule 4 already defines missing as absent/null/''/empty list on the canonical key; this matches the better prior art.
- Multi-value properties need an "add without duplicating" mode distinct from overwrite (Conditional Properties, Notion add/remove). For single-value types, add degrades to overwrite.
- A protected-keys list (MD Butler Do-Not-Touch) and a per-note opt-out key (Auto Note Mover `AutoNoteMover: disable`, Frontmatter Generator `yaml-gen-ignore`, Linter `disabled rules`) are common escape hatches. Not requested by the owner; mention as an open question.

### 3.3 Conflict and loop handling
- First match wins (Auto Note Mover; Kokobrain Auto Move). Natural for moves, because a note can go to one folder only. For property writes, several rules matching one note is normal; Conditional Properties runs all rules in order with later rules seeing earlier changes. This is a real design fork: "first match wins" would make a property rule block later rules (Issue 01 rule 5 already hit this and added a "has something to do" skip).
- Loops: three strategies observed. (a) Structural: automations cannot trigger automations (Notion). (b) Event filtering: ignore rename when only the folder changed (Auto Note Mover). (c) Convergence by idempotence: with "fill only if missing", a second pass writes nothing, so a save-triggered re-evaluation settles (Issue 01 rule 6). Always-set rules with a constant value are also idempotent (writing the same value should be a no-op write that does not touch the file or fire a save). Always-set rules whose value depends on volatile data (current date, modified time, counters) will not converge and need either a no-write-if-equal check or a ban on volatile placeholders. Most surveyed plugins do not document this [U].
- Write-while-editing hazards: Linter's double write, the wrong-active-file Thino case, and the Better Markdown Links "frontmatter not shown until reopen" issue are the same class as the caret blocker. Frontmatter Date Manager's "skip notes with unsaved editor changes" is one policy; Issue 01's policy is to write through the editor tab and fix the caret first.
- Silent no-ops are a common source of confusion: Auto Note Mover skips a rule with both tag and title set; Conditional Properties silently skips renames to an existing name and bookmarks when the Bookmarks plugin is off. Surface "this rule does nothing" inline (Issue 01 already plans this).

### 3.4 Rule-editing UX worth copying
- Ordered list with the displayed order equal to the evaluated order (Iconize #492 shows the cost of divergence).
- Sentence-style condition rows with all/any (Conditional Properties); Kokobrain already has an expression field, so the analogue is inline expression error plus a preview of matching notes.
- Live validation and sample matches while editing (highlighter: invalid regex in red, up to 3 sample matches).
- Per-rule enable toggle without deleting (Auto-Properties); JSON export/import (Conditional Properties, Auto-Properties).
- Named palette for colors; icons chosen from the existing icon picker.
- Dry-run/preview before a batch (Auto Mover X fork; Frontmatter Date Manager preview) and undo snapshot (Frontmatter Operator) for any "apply to existing notes" command.
- Empty state with an Add rule button (Conditional Properties).

### 3.5 Known complaints and pitfalls (consolidated)
1. Creation-time races with other create-time plugins (Auto Note Mover #73, Templater "Untitled" and second-apply frontmatter).
2. Files appearing from sync/import treated as creates (Templater trigger warning).
3. Rules that need manual or scheduled runs, so changes are not "right away" (Conditional Properties, Metadata Menu).
4. Rule schema migrations wiping user rules (Auto-Properties V1 to V2).
5. Ordering UI not matching evaluation order (Iconize #492).
6. Ambiguous "empty" semantics (Conditional Properties documents it; others silent).
7. Undocumented merge semantics (Frontmatter Generator).
8. Vault-wide auto-recompute slowing the app (Metadata Menu formula warning; Iconize's content-matching objection).
9. Writes colliding with the open editor (Linter family, caret blocker).
10. Silent failures (Notion formula/webhook failures may not notify; Notion pauses the automation instead).

## 4. Recommendations for the Kokobrain design, grounded in the above

These are inferences from prior art, not verified facts about this codebase. Repo-specific claims belong to the other scouts' reports.

1. **Shape of the write action.** Copy Auto-Properties: each property action carries one mode flag, `fillIfMissing` vs `alwaysSet`, with "missing" meaning absent/null/empty string/empty list on the canonical key (already Issue 01 rule 4). Add a third value mode for list properties only if needed ("add without duplicate"); Conditional Properties and Notion both ended up needing it.
2. **Per-action trigger selection is optional.** MD Butler attaches events to each field. The owner's wishes (save, property change, create/move/rename) are feature-wide triggers; per-rule event checkboxes (Auto-Properties style) are enough, and per-action would be extra surface. Decide with the owner (see questions).
3. **All-match for property rules, first-match for moves.** Prior art splits the same way: Auto Note Mover first-match for a single-destination action; Conditional Properties all-rules-in-order for property writes. A shared rule list that mixes both needs an explicit statement of which actions stop evaluation (Issue 01 rule 5 is the minimal version of this).
4. **Loop safety by idempotence plus no-write-if-equal**, optionally Notion-style "rule writes do not trigger rule evaluation of the same rule". Do not allow volatile values (now, counters) in always-set actions without that guard.
5. **Treat create as hazardous.** Delay or ignore create for notes still being created by a Kokobrain feature (templates, quick capture, periodic notes) and for sync-arrived files; Auto Note Mover #73 and Templater show the failure.
6. **Provide an explicit "apply rules to existing notes" command with preview.** Tana and Metadata Menu users end up building this by hand. Because "nothing is reverted", an applied batch is not undoable by re-running; a preview (and ideally a count) is the safety net.
7. **Write frontmatter, do not add a parallel visual layer.** Iconize, AutoIcons, Front Matter Title and Supercharged Links all converge on per-note frontmatter as the override source. Writing `_icon`/`_color`/`_title_color` keeps one precedence rule.
8. **Surface inert rules inline** and keep config migration versioned (items 3.3 and 3.5).
9. **Per-note opt-out and protected keys** are common; cheap to add later, so not required in v1 unless the owner asks.

## 5. Open questions only the owner can answer

1. Should all matching property rules run in order (Conditional Properties style, later rules see earlier results), or first match wins like Auto Move today? Mixed move+property rule lists need one answer.
2. Should a rule's write be allowed to re-trigger rule evaluation (Issue 01 rule 6 says yes, via the save), or should a rule's own write be excluded (Notion style)? Chaining is powerful but is the main loop risk for always-set actions.
3. Is a per-note opt-out key (like `AutoNoteMover: disable`) wanted, and a protected-keys list?
4. Should files that appear from outside the app (sync, git pull, external editor) count as create/move/rename events for triggers?
5. Is an "apply to all matching notes now" command with preview wanted in v1, given "nothing is reverted" and that existing notes otherwise only change on their next trigger?
6. Is `alwaysSet` allowed with dynamic values (current date, file name), which cannot converge under re-evaluation?

## 6. Not verified

- Several Obsidian plugin pages (MD Butler, Metadata Menu, Templater limits, Auto Mover X, Auto Note Mover Plus, YAML Toolkit, Tags Color Files, File Color, Capacities) were read only through search-result summaries, not fetched. Their details are leads.
- I did not read the source of Conditional Properties, Auto-Properties or MD Butler, so loop behavior for them is "not documented", not "absent".
- No GitHub issue search was done for Conditional Properties or Auto-Properties complaints; the complaint list above comes from docs and the few issues listed.
- Notion and Tana pages are vendor docs and may change.

## 7. Sources

- https://github.com/farux/obsidian-auto-note-mover
- https://raw.githubusercontent.com/farux/obsidian-auto-note-mover/main/main.ts
- https://github.com/farux/obsidian-auto-note-mover/issues/73
- https://github.com/farux/obsidian-auto-note-mover/issues/39
- https://github.com/glebnaz/obsidian-auto-note-mover-improved
- https://github.com/devkade/obsidian-auto-note-mover-plus
- https://github.com/diegoeis/obsidian-conditional-properties
- https://community.obsidian.md/plugins/auto-properties
- https://www.obsidianstats.com/plugins/frontmatter-generator
- https://community.obsidian.md/plugins/md-butler
- https://mdelobelle.github.io/metadatamenu/fields/
- https://community.obsidian.md/plugins/fileclass
- https://www.dsebastien.net/the-complete-guide-to-templates-and-templater-in-obsidian/
- https://forum.obsidian.md/t/templater-trigger-templater-on-new-file-creation/54425
- https://forum.obsidian.md/t/automatically-trigger-a-templater-folder-template-after-having-use-templater-to-move-the-note-in-this-folder/67085
- https://florianwoelki.github.io/obsidian-iconize/files-and-folders/use-frontmatter.html
- https://github.com/FlorianWoelki/obsidian-iconize/discussions/121
- https://github.com/FlorianWoelki/obsidian-iconize/issues/492
- https://community.obsidian.md/plugins/autoicons
- https://community.obsidian.md/plugins/dynamic-file-folder-highlighter
- https://community.obsidian.md/plugins/obsidian-file-color
- https://community.obsidian.md/plugins/tags-color-files
- https://github.com/mdelobelle/obsidian_supercharged_links
- https://github.com/snezhig/obsidian-front-matter-title
- https://platers.github.io/obsidian-linter/usage/running-rules/
- https://github.com/KazooTTT/issues-blog/issues/79
- https://github.com/mnaoumov/obsidian-better-markdown-links/issues/40
- https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter
- https://forum.obsidian.md/t/bases-qol-default-values-for-columns/113320
- https://forum.obsidian.md/t/autofill-properties-based-on-folder/79268
- https://forum.obsidian.md/t/new-plugin-yaml-toolkit-for-obsidian-batch-manipulate-front-matter-with-conditional-rules/109674
- https://www.notion.com/help/database-automations
- https://outliner.tana.inc/docs/fields
- https://docs.capacities.io/migration/switching-from-tana
- https://docs.capacities.io/reference/properties
- Repo (read only for context): `.scratch/auto-move-default-properties/issues/01-auto-move-rule-fills-missing-properties.md` rules 4, 5, 6, 7.
