# Scout 19: docs and ADR impact of composer tag and wikilink autocomplete

Read-only research. Paths are repo-relative. All claims verified by reading the files named; nothing UNVERIFIED unless marked.

## 1. Summary

Documentation that a composer autocomplete change must touch, in priority order:

1. `docs/adr/0028-quick-capture-merge-into-kokobrain.md`: the out-of-scope bullet (line 68) becomes false. Needs a dated `## Amendment` section (format in section 3).
2. `help/documentation/09-quick-notes-and-templates.md`: the "Composer popover (global)" table row (line 12).
3. Architecture module docs (enforced by a test, section 5): `docs/architecture/modules/src/routes.md`, `docs/architecture/modules/src/lib/plugins/quick-capture.md`, `docs/architecture/modules/src-tauri/src/quick_capture.md`, `docs/architecture/modules/src/lib/contracts.md`, and (only if new files or a new module appear) the matching module docs.
4. Optional, one line each: `docs/FEATURES.md` (line 13), `help/documentation/05-wikilinks.md`, `help/documentation/03-editor.md`, `help/documentation/20-keyboard-shortcuts.md`.
5. `CONTEXT.md` does not exist (section 7), so there is no glossary to update.

No doc in `help/` or `docs/` describes `#tag` autocomplete in the editor at all (grep for "tag autocomplete", "suggest", "type #" found only unrelated hits). Only wikilink autocomplete is documented.

## 2. help/documentation/09-quick-notes-and-templates.md

- Line 12, table row "Composer popover (global)": currently reads "Floating 600x240 popover ... Type, press `Cmd+Enter` to save, `Esc` to cancel. Focus returns to the previous app on dismiss. The popover closes only once the note is written; ... Text you close without saving comes back the next time you open it." This is the one place the user-facing popover behavior is described. Add one sentence about `#` tag and `[[` note suggestions, plus anything that changes how `Enter`/`Esc` behave while the popup is open (see Risks: `Esc` currently dismisses the popover, and `Cmd+Enter` saves; an open completion popup normally consumes `Enter` and `Esc` in CodeMirror).
- Line 17: image `screenshots/quick-note.png`. The directory `help/documentation/screenshots` does not exist in the repo (`ls help/documentation | grep -i screen` is empty, `find` for `quick-note.png` outside node_modules found nothing), so the image links already point at files not committed. No screenshot work is possible or needed in the repo. (Possible the images are hosted elsewhere; UNVERIFIED.)
- Line 88 TIP callout ("jot or paste things throughout the day from any app") is generic and needs no change.
- Section headings in the file (for reference): "Quick Capture, Instant Capture" (line 5), "Configuration" (19), "Source provenance" (33), "Template Variables" (56), "Example" (77). A note about suggestion data source (vault tags and note names) fits in the line 12 row or as one short paragraph after line 15.
- Behavior worth stating if it is true of the final design: what the suggestions list (all notes, aliases, tags), that it needs a vault open in the main window (the composer webview cannot read vault data itself, ADR-0028 line 47 and 63), and the failure case (no vault or data not available: no suggestions, typing still works). The last point depends on the chosen data path; UNVERIFIED until the design is fixed.

Secondary user docs, optional:

- `help/documentation/19-settings.md` lines 134-136: "Shared by all three capture surfaces..." describes settings only. No change needed (no new setting is implied by the task).
- `help/documentation/20-keyboard-shortcuts.md` lines 44-48: "Quick Capture (global ...)" table lists only the two global shortcuts. Line 98 lists `[[` under "Editor (In-Editor)" as "Trigger wikilink autocomplete". There is no row for `#`. No change is required by the task; adding composer rows would be scope creep unless the keys inside the popover change.
- `help/documentation/05-wikilinks.md` lines 10-19 ("Creating a Wikilink") and `help/documentation/03-editor.md` lines 118-120 ("Wikilink Autocomplete") describe only the editor. A one-line "also available in the Quick Capture popover" cross-link is optional.
- `help/documentation/README.md` line 31 and root `README.md` line 106 index page 09 with "Instant capture (composer popover + clipboard shortcut + Cmd+N)..."; no change.
- `help/documentation` is copied to the GitHub wiki by `scripts/sync-wiki-docs.mjs` (run by `.github/workflows/sync-wiki.yml`, tested in `src/tests/scripts/sync-wiki-docs.test.ts`). Edits to page 09 flow there automatically; keep relative links valid.
- Tests that read help docs: `src/tests/help/auto-organize-*.test.ts`, `src/tests/help/mods-example.test.ts`, `src/tests/lib/core/settings/settings-copy.test.ts`. None target page 09 by name in the grep; UNVERIFIED whether `settings-copy.test.ts` pins any text from page 09 (grep matched on help/FEATURES paths only, not inspected).

## 3. docs/FEATURES.md and ADR 0028

### docs/FEATURES.md

- Line 10: "Wikilinks (`[[note]]`) with autocomplete, block references and embeds" is the only autocomplete mention.
- Line 13: "Templates, Quick Capture (in-editor `Cmd+N`, a global composer popover, a clipboard shortcut) and 1:1 meeting notes". Adding "with tag and wikilink suggestions in the popover" is optional. The file is a feature list, so one clause at most.

### ADR 0028 (docs/adr/0028-quick-capture-merge-into-kokobrain.md)

Structure by line: frontmatter 1-7; existing `## Amendment (2026-11-05): the composer waits for the written note` at line 9; `## Context` 13; `## Decision` 19; "What adapts (seam edits)" 43 with line 47 stating "The composer route runs in a separate webview from the main window; it cannot import `vaultStore`..."; `## Consequences` 50; Negative 59 with line 63 "The composer webview lives at its own Tauri origin and cannot share `vaultStore` directly..."; `### Out of scope (Phase 5 follow-ups)` at line 65; the target bullet at line 68: "Wikilink `[[` autocomplete in the composer (requires CodeMirror swap + IPC exposing vault entries to the composer webview)."; References 71.

Amendment rules (docs/adr/README.md lines 5 and 99-100):

- A decision is immutable; "Amend for factual drift ... add an amendment dated `YYYY-MM-DD` ... either a `## Amendment (YYYY-MM-DD)` section near the top or a dated bullet in Consequences. Say what changed, cite the new paths and line ranges, and leave the original text in place as the record of what was first decided."
- Reversing a decision needs a new superseding ADR. The out-of-scope bullet is a deferred follow-up, not a decision, so an amendment (not a new ADR) is the matching form. This matches precedent: 0028's own 2026-11-05 amendment changed the composer's save flow the same way.
- Format precedent in this ADR and others (0002 line 9, 0003 lines 9 and 21, 0004 lines 9 and 13, 0010): `## Amendment (YYYY-MM-DD): <short title>` placed above `## Context`, newest first (0003 and 0004 put the newer amendment above the older, and the newer one says "This replaces ... of the 2026-11-04 amendment below"). The 0028 amendment body is a single dense paragraph that ends with an attribution like "Audit 2026-11-04, Issue 12."
- Content the new amendment should carry: the out-of-scope bullet at line 68 no longer holds; how the composer gets vault data (the IPC/capability path actually chosen, citing real files and lines at that time); that the editor completion sources are reused and which file hosts them; that the "CodeMirror swap" premise in the bullet changed or not (if the composer stays a `<textarea>`, say the bullet's CodeMirror precondition was dropped, else say CodeMirror was adopted); and any change to the Negative consequence at line 63 ("cannot share `vaultStore`"), which stays true (still separate stores) unless a store is introduced in the composer. Mention that `src-tauri/capabilities/composer.json` loosened if it did (its current description says "no filesystem, no clipboard, no other IPC": lines 4 of that file).
- Date: use the date of the change (the session clock disagrees between 2026-11-05 and 2026-11-13; verify at write time).
- Do not edit lines 47, 63 or 68 in place; the README rule is to leave original text. The bullet at 68 stays as history.
- Index: `docs/adr/README.md` line 135 is the 0028 row (title only, status active). Rows for other ADRs carry an "(amended: ...)" suffix when the title-level summary changed (0015, 0016 rows). For 0028 the existing 2026-11-05 amendment did not add a suffix, so none is required here.
- Also reread ADR-0003 (layer rules) and ADR-0034 only if the design places code across layers (`src/routes` importing from `core/markdown-editor` or a new shared module). `src/tests/lib/architecture/markdown-editor-imports.test.ts` lines 1-22 forbid the editor `.ts` files from importing Tauri, stores, services, features, plugins or `utils/debug`; any reuse of editor completion code from the composer route goes through that constraint (the reverse direction, route importing editor, is governed by `layer-rules.test.ts`; routes may import `#lib/app`, `docs/architecture/modules/src/routes.md` line 50).

## 4. Architecture module docs that describe the composer

All paths under `docs/architecture/modules/`. Style rule from `docs/architecture/README.md` ("Keeping it current"): describe what the code does now, repo-relative paths in backticks, no file counts, line numbers or dates.

`src/routes.md` (summary line 2: "pages are thin and own no stores"):

- Line 7 Responsibility (truncated in my read, mentions /composer page): add that the composer now does tag and wikilink completion, if so.
- Line 15 Key files: `src/routes/composer/+page.svelte`: "draft textarea that submits to Rust and waits for the written-note result." The "textarea" wording changes if the input element changes; add any new files under `src/routes/composer/` or `src/lib/...` that the page imports.
- Lines 19-22 State: localStorage `kokobrain:composer-draft`; "No Svelte store is defined under src/routes"; "composer keeps its text ... in component state". Update if completion adds state (cached tags/notes, popup state) or a store.
- Lines 27-28 Collaborators: `src/lib/contracts`: "The composer page uses call(), on() and EVENT_NAMES for every Rust command and event it uses." and `src/lib/core`: "the composer uses the theme service". Add the new `core/markdown-editor` (or other) dependency if the page imports editor completion code.
- Lines 34-37: IPC and event lists. Add any new command the composer calls to fetch tags and notes, and any new event.
- Line 46 Gotcha: "The composer is a second webview ... never touches the main window's stores". Becomes inaccurate if data comes from the main window stores over events; rewrite to the new truth.
- Lines 47-48: show-reset behavior (`resetForShow`) and save timeouts. If completion state must reset on each summon, say so there.

`src/lib/plugins/quick-capture.md`:

- Line 47 Gotcha: "The composer runs in a separate webview, so it cannot call executeAction or read vaultStore." Still true unless changed; if the main-window listener serves vault data to the composer, add the responder here (the plugin registers `registerQuickCaptureListener`, so it is the likely owner of a new main-window-side data provider, but that is a design choice, UNVERIFIED).
- Lines 32-38: IPC and event bullets "Called by the composer route". Add new ones.
- Line 7 Responsibility and line 11 Key files if a new file is added in `src/lib/plugins/quick-capture/`.

`src-tauri/src/quick_capture.md`:

- Line 7 Responsibility and Key files (line 11 lists `commands.rs`): if a new Rust command for vault data is added under `quick_capture` rather than reusing an existing command from `src-tauri/src/commands`.
- Lines 37-40 IPC bullets and 42-44 event bullets (`qc:open-composer`, `qc:composer-capture-result`): add new ones.
- Line 58 gotcha: "ComposerCaptureResult has #[ts(export)] ... requires cargo test to regenerate src/lib/contracts/generated". Any new IPC DTO with `#[ts(export)]` triggers the same rule, which also moves the commit gate to "Both" per CLAUDE.md Quick Reference rule 6.

`src/lib/contracts.md`:

- Lines 12-14: `commands.ts` (CommandMap and COMMAND_ARGS manifest) and `events.ts` (EVENT_NAMES mirrors `src-tauri/src/events.rs`). A new command or event needs entries there and the parity tests enforce it (lines 16-17, gotcha at 66 "minimum-count floor").
- Line 33: "`src-tauri/src/quick_capture`: The composer capture result type that carries ts(export)." and line 41 `src/routes`: update if new DTOs or composer calls appear.
- Lines 49-50: event bullets for `qc:open-composer` (typed string) and `qc:composer-capture-result`. Add new event bullets if added.
- Line 65: lists commands registered but never invoked by TS. Not affected unless a command is added without a TS caller.
- Note `docs/architecture/modules/src/lib/contracts.md` line 62: contract files import nothing from `#lib`.

`src-tauri/src.md`: lines 11, 23, 60 describe `lib.rs` and the composer window (600x240 per ADR). Only change if the composer window size or build in `build_composer_window` changes (e.g. to fit a popup). Verify: the popup of a CodeMirror completion renders inside the webview, so a 240px-high transparent window may clip it. That would be a window-size or CSS change and would then need ADR 0028 line 27 ("600x240 popover") and `help/documentation/09-quick-notes-and-templates.md` line 12 ("600x240") updated too. Whether the popup clips is UNVERIFIED (not in my topic).

`src/lib/core/settings.md` line 44: composer calls `applyStoredTheme`; "the composer has no settings store". Still true unless the composer needs settings; no change expected.

`src/lib/core/markdown-editor.md` (editor module doc), no edit if no editor file changes, but it is the source of truth for the reuse story:

- Line 12 `editor-host.ts`: EditorHost, editorHost facet, NOOP_HOST.
- Lines 44-45: `extensions/tag` ("Completion source for #tags, fed by EditorHost.listTags and ranked with fuzzy matching") and `extensions/wikilink`.
- Line 50: "EditorHost may be called only from event handlers, toDOM and completion sources".
- Line 51: "The editorHost facet is static and the host is installed once at mount".
- Line 53: "Only one autocompletion() extension may be installed ... one override list, because a second autocompletion() throws a config merge conflict." Directly relevant if the composer mounts its own CodeMirror view (it would have its own single `autocompletion()`; no conflict because it is a separate EditorView, UNVERIFIED in practice).
- Line 27 mentions `src/lib/app/editor-host.ts` implements `listTags` through `get_all_tags_v2` (from the doc, not re-verified by me).
- Line 33: "The table-of-contents logic imports HEADING_RE and the kanban wikilink suggestions import completion logic from here." Precedent that other modules already import completion `.logic.ts` from `core/markdown-editor` (see also `docs/architecture/modules/src/lib/core/markdown-editor.md` Collaborators). This is a reuse precedent for a composer-side import of the `.logic.ts` files.
- If a new folder is added under `src/lib/core/markdown-editor/extensions/` it becomes a module only if a doc is written for it (README: "A doc for a folder inside a module makes that folder a module of its own"); existing `extensions/live-preview.md` is the only sub-module doc. Not needed otherwise.

Group docs (`docs/architecture/groups/frontend-root.md` line 1 and `rust.md` line 1, `docs/architecture/overview.md` lines 10, 26, 31) describe the composer in one sentence each ("the quick-capture composer", "the composer window", "composer commands"). They need updating only if the composer's role changes substantially; adding autocomplete does not require it.

## 5. Docs gate: architecture-map test

`docs/architecture/README.md` ("Keeping it current") and `src/tests/lib/architecture/architecture-map.test.ts` fail when:

- a module folder has no doc;
- a doc's module folder is gone;
- a doc has no `summary:`;
- a doc names a repo path in backticks that does not exist (paths with placeholders like `<feature>` are skipped).

Consequence: any new file named in backticks in these docs must exist when the test runs, and a new folder under `src/lib/core|features|plugins`, `src/lib/*` layers, `src/routes`, or `src-tauri/src` needs `modules/<path>.md`. A new file inside an existing folder needs no new doc, but should be listed under Key files. `node scripts/architecture-map.mjs --check` is the cheap local check (do not run it as part of this research per the rules; the owner's CLAUDE.md tests apply at implementation time).

## 6. Other repo docs that describe composer constraints

- `src-tauri/capabilities/composer.json` line 4 (`description`): "The popover only needs to invoke the submit and dismiss commands and listen for the open-composer and composer-capture-result events; no filesystem, no clipboard, no other IPC." Permissions: `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`. Any new IPC that the composer calls changes this description (text, not just permissions) and should be kept honest. `src/tests/lib/architecture/fs-capabilities.test.ts` reads `capabilities/default.json` only (lines 32, 70-75), so it does not guard the composer capability; UNVERIFIED whether any other test pins the description.
- `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md`, root `README.md` (other than line 106): grep for "composer" found nothing. No privacy row is needed; suggestions are local.
- `docs/adr/0026-type-definitions-relationships-lifecycle.md` line 55 amendment mentions the composer only for `_organized: false`; unaffected.
- `docs/architecture/modules/src/lib/features/deep-link.md` lines 7 and 45 mention the composer capture path; unaffected.
- `help/documentation/25-types-and-relationships.md` line 293 and `28-mods.md` line 206 mention composer as a note-creation surface; unaffected.

## 7. CONTEXT.md glossary

- `CONTEXT.md` does not exist: `find . -maxdepth 2 -iname "CONTEXT*"` (excluding node_modules, .git) returned nothing, and `ls CONTEXT.md` failed; no `GLOSSARY*` at depth 3 either. `docs/agents/domain.md` says to "proceed silently" when it is missing and that the producer skill creates it lazily. Verdict: no glossary section to update. If the owner wants terms recorded, candidates would be "composer" (the popover) versus "note composer" (Cmd+N); the docs already use both: help line 11 "Note composer (in-editor)" vs line 12 "Composer popover (global)". Use "composer popover" in any new help text to avoid mixing the two.

## 8. Reuse opportunities (docs side)

- ADR amendment: copy the shape of the 0028 amendment at line 9 (title, dense paragraph, trade-offs, attribution).
- Help: extend the existing row at line 12 of page 09 instead of adding a new section.
- Architecture: update the four existing module docs; no new module doc unless a new folder is created.

## 9. Risks

1. Doc/code drift in `routes.md` line 46 and `quick-capture.md` line 47 ("never touches the main window's stores", "cannot read vaultStore"). Both are stated as invariants; the chosen data path decides whether they stay true.
2. The `architecture-map` test fails the CI/commit gate if a backticked path in a doc points at a file the change did not actually create.
3. A DTO with `#[ts(export)]` makes the commit gate "Both" (CLAUDE.md Quick Reference 6), so doc updates for `contracts.md` should land in the same commit as the regenerated bindings.
4. Help text must not promise behavior the popup cannot deliver (e.g. `Esc` and `Enter` while the popup is open versus the composer's `Esc` to cancel and `Cmd+Enter` to save at line 12). Verify against the final keymap before writing.
5. Window height 240 (ADR line 27, help line 12, `src-tauri.md` / `src.md`): a suggestion popup might need a taller window, which would force edits in three docs. UNVERIFIED.
6. The 0028 "Out of scope" bullet explicitly says "requires CodeMirror swap + IPC exposing vault entries". If the owner's constraint 1 (reuse editor completion code) leads to a CodeMirror swap of the textarea, `routes.md` line 15 and the draft/autosave/IME behavior docs (routes.md lines 19-22, 47-48, and the 0028 2026-11-05 amendment text about the textarea draft) need review. The amendment at line 9 speaks of "text typed while a save waits is kept" and "Only a leading copy of the written text is dropped"; those semantics are tied to the textarea string value.

## 10. Open questions

- Which data path serves tags and notes to the composer webview (new Rust command reading `VaultIndex`, an event round trip through the main window, or a snapshot pushed on summon)? The doc edits in sections 3 and 4 depend on it.
- Does the composer stay a `<textarea>` or become a CodeMirror view? Drives routes.md line 15 and the ADR amendment wording on "CodeMirror swap".
- Should `help/documentation/05-wikilinks.md` and `03-editor.md` cross-link to the popover? Optional; owner call.
- Which date for the amendment (session clock conflict, section 3).
