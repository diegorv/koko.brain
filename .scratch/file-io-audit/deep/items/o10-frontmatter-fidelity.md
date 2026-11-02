# Deep-dive group o10-frontmatter-fidelity

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## fidelity-2: Empty frontmatter '---\n---' is not matched by FRONTMATTER_REGEX; writers prepend a new block and leave the old fences in the body (incl. the app's own folder-note placeholder)
- claimed severity: corruption
- anchor: src/lib/core/frontmatter/properties.logic.ts:37
- scenario: Set an icon on a folder without a folder note: ensureFolderNote writes '---\n---\n', then updateNoteFrontmatter writes '---\n_icon: lucide:folder\n_color: "#0000ff"\n---\n---\n---\n' (two stray rules). Same for sidebar favorite, Properties panel add, or meta-bind on any note/template starting with an empty block.
- evidence given: properties.logic.ts:37 regex needs a line before closing fence; extractBody returns full content on no match :53-56; rebuildContent :615-621; file-icons.service.ts:92-98 placeholder, :130-133; frontmatter-write.service.ts:117-124; detectLossy returns null :413-414; editor treats it as frontmatter (parsers/frontmatter.ts:10, editor.logic.test.ts:245-249); ensureFrontmatterLink special-cases it :531-532; test file-icons.service.test.ts:149-161 does not assert the second write.

## fidelity-3: Meta-bind toggle/number/select write quoted strings; documented INPUT[toggle():archived] writes _archived: "true" which nothing treats as archived
- claimed severity: corruption
- anchor: src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:863
- scenario: Note uses INPUT[toggle():archived] as in help/documentation/24-meta-bind.md:44. User ticks it; file gets _archived: "true". Toggle shows checked, but sidebar, lifecycle and Rust index say not archived. Unticking _organized writes "false", which Rust reads as organized. count: 5 edited to 7 becomes count: "7" (text), breaking numeric sort/filter.
- evidence given: widgets.ts:862-864 toggle, :931-934 number/date, :704-707 select; setPropertyByBindTarget keeps type but string value properties.logic.ts:597-609; serialize :580; tests pin count: "7" and done: "true" (meta-bind-writers.test.ts:21,97,110); lifecycle.logic.ts:7-24 === true; entry.rs:246-251, :371-376 as_bool; frontmatter-aliases.ts:9 archived->_archived.

## fidelity-4: CRLF note rewritten with LF on first edit; ADR-0029 claims save writes verbatim
- claimed severity: corruption
- anchor: src/lib/core/markdown-editor/setup/editor-extensions.ts:188
- scenario: Open a Windows-origin or autocrlf note, type and delete one character: tab content is LF, savedContent CRLF, autosave rewrites every line ending; git shows the whole file changed and undo cannot restore CRLF.
- evidence given: CodeMirror EditorState.create splits on DefaultSplit and joins with \n unless lineSeparator facet is set (FETCHED codemirror/state src/state.ts); no lineSeparator in src/lib (grep); editor-extensions.ts:188 doc.toString(); editor.store.svelte.ts:84-88; editor.logic.ts:44-46; editor.service.ts:165-168; ADR-0029:82 says save writes verbatim; LF frontmatter + CRLF body on closed writers properties.logic.ts:621.

## fidelity-6: Properties panel and meta-bind edits silently drop comments, nested maps, duplicate-key values and anchors while updateNoteFrontmatter refuses the same note
- claimed severity: data-loss
- anchor: src/lib/features/properties/properties.service.ts:82
- scenario: Note with 'title: x  # reviewed' and a nested meta: map; tick a Properties checkbox; within 500 ms the comment and meta are gone from disk with no toast. Favoriting the same note from the sidebar shows a refusal toast instead.
- evidence given: properties.service.ts:78-97 guards only isFrontmatterUnparseable; widgets.ts:754-769 same; nested drop properties.logic.ts:290-300; uniqueKeys:false :263; toJS expands anchors :249; frontmatter-write.service.ts:121-122 refuses. Documented as intended in ADR-0029 amendments (docs/adr/0029-frontmatter-yaml-canonical-form.md:103, :107).

## fidelity-7: Every frontmatter rewrite re-spells numbers: 01234 -> 1234, 1.10 -> 1.1, 1.0 -> 1, 0x1F -> 31
- claimed severity: corruption
- anchor: src/lib/core/frontmatter/properties.logic.ts:580
- scenario: Note with zip: 01234 or version: 1.10 is favorited from the sidebar (or gets an icon or any panel edit). File now says zip: 1234 / version: 1.1. Passes the strict updateNoteFrontmatter guard too.
- evidence given: FETCHED yaml v2.9.1 core int.ts (decimal parseInt radix 10) and float.ts (minFractionDigits kept only on the node); toJS properties.logic.ts:249; plain number :188-190; fresh node via doc.set :580; detectLossy flags only unsafe ints :427-434; fixture treats h: 0x1F as safe properties.logic.test.ts:1232 and round-trip test compares values not text :1252-1257; not listed in ADR-0029.

## fidelity-8: Non-UTF-8 notes get U+FFFD written back, including from a sidebar favorite or rename link update with no editor edit
- claimed severity: corruption
- anchor: src/lib/core/frontmatter/frontmatter-write.service.ts:117
- scenario: Legacy Latin-1 note, closed. User favorites it from the sidebar: readTextFile decodes with non-fatal TextDecoder, the rewrite writes UTF-8 with EF BF BD in place of every accented byte. Same when renaming a note it links to, or after any keystroke in the editor. Original bytes are not in file history.
- evidence given: FETCHED plugins-workspace fs-v2.7.1 guest-js/index.ts readTextFile (TextDecoder utf-8 non-fatal) / writeTextFile (TextEncoder); frontmatter-write.service.ts:117, :149; link-updater.service.ts:35-39; editor.service.ts:124, :168; file-history.service.ts:111-123, :190-196.

## fidelity-9: Panel commit rebuilds frontmatter from a store whose post-commit parse is skipped, reverting later frontmatter edits
- claimed severity: stale-state
- anchor: src/lib/features/properties/properties.service.ts:86
- scenario: Click a Properties checkbox, then within 300 ms type 'status: done' in the frontmatter (or click a meta-bind toggle) with keystrokes under 300 ms apart. The only parse is skipped, store never sees it. A later panel edit (any time) rewrites frontmatter from the store and removes status: done; 500 ms autosave writes it.
- evidence given: properties.service.ts:86-89 frontmatter from store and skip flag armed; :33-37 consume skips regardless of content; PropertiesView.svelte:100-114 300 ms debounce with clear on every content change; propertiesMatchActiveNote checks only path :64-69.
