# o10 frontmatter fidelity: deep-dive raw report

Worktree: `.claude/worktrees/file-io-repro` (HEAD 0ba80e6a). All repros live in
`src/tests/repro/o10-frontmatter-fidelity/` and were run one file at a time with
`./node_modules/.bin/vitest run <file>`. Each one asserts the correct behavior and
fails on that assertion today: 10 fail, and 1 control passes.

Upstream sources fetched:
- tauri-plugin-fs `fs-v2.7.1`, `plugins/fs/guest-js/index.ts`. `readTextFile` runs
  `new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes)`, which is non-fatal,
  so invalid bytes become U+FFFD. `writeTextFile` runs `new TextEncoder().encode(data)`.
- codemirror/state `main`, `src/state.ts`. `EditorState.create` splits a string doc
  with `staticFacet(EditorState.lineSeparator) || DefaultSplit`, and
  `lineBreak` returns `facet(lineSeparator) || "\n"`.

## B1 (fidelity-6): Properties panel and meta-bind edits drop comments and nested maps - CONFIRMED_BY_TEST, P1
- `properties.service.ts:78-97` `commitChanges` checks only `isFrontmatterUnparseable`
  before it rebuilds the block from the store (`rebuildContent(updated, extractBody(content))`).
  `widgets.ts:754-769` `dispatchMetaBindUpdate` does the same.
- `properties.logic.ts:290-300` skips nested mappings during the parse. The serializer
  then writes only what was parsed, so comments and nested maps disappear.
- `updateNoteFrontmatter` (`frontmatter-write.service.ts:121-122`) runs `detectLossyFrontmatter`
  and refuses the same note. The control test proves this: the favorite leaves the disk unchanged.
- ADR-0029 calls the drop an accepted limitation, but the owner's top concern is lost content
  with no way back. The editor applies the rewrite with `addToHistory.of(false)`
  (`MarkdownEditor.svelte` content-sync effect), so Cmd+Z cannot undo it.
- Test `panel-meta-bind-lossy-rewrite.test.ts`:
  `AssertionError: ---\ntitle: x\ndone: true\n---\n# Body\n: expected ... to contain '# reviewed'`.
  This is the disk content 600 ms after a single panel checkbox. The nested `meta:` map is gone as well.
- Recovery: File History has the old bytes only if the app saved them before. The
  after-save snapshot hook is always on (`app-lifecycle.service.ts:268`), but it records
  saved content, never the pre-rewrite bytes of a note written elsewhere. Otherwise only
  git or Time Machine can bring it back.

## B2 (fidelity-7): every rewrite re-spells numbers - CONFIRMED_BY_TEST, P1
- yaml core schema: `parseDocument` + `toJS` yields JS numbers (`properties.logic.ts:249`,
  `convertToProperty` :188-190). `serializeProperties` (:580) writes a fresh node from the
  number, so it cannot keep the source spelling.
- `detectLossyFrontmatter` flags only unsafe integers (:427-434), so the strict writer
  goes ahead with the rewrite.
- Test `number-respelling.test.ts` (sidebar favorite, closed note) writes
  `zip: 1234\nversion: 1.1\nratio: 1\nh: 31`. The assertion fails with
  `expected '---\nzip: 1234...' to contain 'zip: 01234'`.
- Every rewriting path hits this (panel, meta-bind, icon, favorite, lifecycle), with default settings.

## B3 (fidelity-3): meta-bind toggle/number/select write quoted strings - CONFIRMED_BY_TEST, P2
- The toggle commits `'true'`/`'false'` (`widgets.ts` MetaBindToggleWidget) and the number
  input commits `input.value`. `setPropertyByBindTarget` keeps the string. The serializer
  quotes `"true"` and `"7"`.
- `lifecycle.logic.ts:7-12` checks `=== true`. Rust `extract_bool_flag` / `_organized`
  use `as_bool()` (`entry.rs:246-251`, :373-378), and `project_value` turns a quoted
  scalar into a JSON String (`parsing.rs:809`). So `_archived: "true"` reads as not
  archived, and `_organized: "false"` reads as organized (`unwrap_or(true)`).
- The help doc example is `INPUT[toggle():archived]` (help/documentation/24-meta-bind.md), and `archived` canonicalizes to `_archived`.
- Test `meta-bind-value-types.test.ts` fails twice: `expected 'inbox' to be 'archived'`
  for a doc that now holds `_archived: "true"`, and `count: "7"` parses as
  `{type:'text', value:'7'}` instead of the number 7.
- The existing test `meta-bind-writers.test.ts` pins `done: "true"` / `count: "7"`
  as expected output.
- No bytes are lost. The type changes, which breaks the flags and numeric sorting.
  The user can fix it by hand.

## B4 (fidelity-2): an empty `---\n---` block is not seen as frontmatter, so writers prepend a new one - CONFIRMED_BY_TEST, P2
- The regex `^---\r?\n([\s\S]*?)\r?\n---` needs a newline before the closing fence. On
  `---\n---\n` it does not match, so `extractRawFrontmatter` returns null, `extractBody`
  returns the whole content, and `detectLossyFrontmatter` returns null.
  `rebuildContent` then prepends a new block.
- The app writes this shape itself: `ensureFolderNote` (`file-icons.service.ts:97`).
- Test `empty-frontmatter-block.test.ts` fails twice. Setting a folder icon gives
  `"---\n_icon: lucide:folder\n_color: \"#0000ff\"\n---\n---\n---\n"` (4 fence lines,
  2 expected). The sidebar favorite gives `"---\n_favorite: true\n---\n---\n---\n# Title\n"`.
- The existing test `file-icons.service.test.ts` "routes directories" checks only the
  placeholder write.
- No content is lost, but two stray `---` rules are added to the body. This happens the
  first time a folder icon is set, with default settings. It does not grow on later writes.

## B5 (fidelity-8): non-UTF-8 notes are written back with U+FFFD - CONFIRMED_BY_TEST, P2
- The decode is lossy (fetched source above). Every writer then writes UTF-8.
- Test `non-utf8-rewrite.test.ts`: the fake disk mirrors the fetched guest-js decode
  and encode. After a sidebar favorite on Latin-1 `Café`, the file holds
  `title: Caf�` (EF BF BD) and the assertion `expected true to be false` fails.
- Path refuted: the claim's rename link-update path. Rust indexing uses
  `fs::read_to_string` (`commands/vault.rs:1302,1320`), which fails on invalid UTF-8
  and skips the file. So the note has no backlinks entry and `updateLinksAfterRename`
  never reaches it.
- Paths that do reach it: open the note from the file tree (the tree comes from
  `read_dir`, `scan_vault`) and type anything, then autosave runs. Or an icon or
  favorite write by path.
- On open the user already sees the � characters, but nothing blocks the save.
  File History never has the original bytes.
- Latin-1 notes are rare in a macOS vault, hence P2.

## B6 (fidelity-4): a CRLF note is saved with LF after any edit - CONFIRMED_BY_TEST, P3
- No `lineSeparator` facet anywhere in `src/lib` (grep). The update listener sends
  `update.state.doc.toString()` (`editor-extensions.ts:188`), which joins lines with `\n`.
- Test `crlf-line-endings.test.ts` uses the app's real `createExtensions` with
  `onContentChange`, types one character, deletes it, and saves. The result is
  `Received: "---\ntitle: Win\n---\n# Heading\n\nLine one\nLine two\n"`, where the
  CRLF original was expected.
- The text survives and only the line endings change. The result is whole-file git
  churn and mixed endings from closed-note writers (`rebuildContent` uses LF for the
  frontmatter, and the body keeps CRLF). CRLF notes are rare on macOS.

## B7 (fidelity-9): a frontmatter edit inside the panel's skip window is lost on the next panel edit - CONFIRMED_BY_TEST, P3
- `commitChanges` arms `skipNextParseFor`. PropertiesView's 300 ms debounce clears and
  restarts on every content change. When the single timer finally fires, it consumes
  the skip flag and skips the parse (`properties.service.ts:33-37`), whatever the
  content is by then.
- The store stays stale, and `propertiesMatchActiveNote` checks only the path. The
  next panel edit rebuilds from the stale store, and the autosave writes that out.
- Test `skip-parse-stale-store.test.ts` copies the effect line for line, the same way
  `properties-cross-note.test.ts` does. The store never sees `status` (soft assertion),
  and the disk ends up as `---\ndone: true\npriority: high\n---\n# Task\n`, failing
  `to contain 'status: done'`.
- To trigger it, a second frontmatter edit has to land within 300 ms of a panel click:
  a meta-bind toggle, the favorite or organized keybinding, or typing. Any later edit
  to the note re-parses and heals the store. The rewrite skips undo history.

## Not verified
- I ran no app or E2E test. The Properties panel effect is copied into the test, not
  rendered, because the repo has no component-testing library.
- I did not check whether note-list rows can show a non-UTF-8 note. They are built
  from the index, which skips such files.
