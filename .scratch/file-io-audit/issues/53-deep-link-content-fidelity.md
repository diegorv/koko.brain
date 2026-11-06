# 53: Deep-link prepend detaches the frontmatter, and non-silent new rewrites `<% %>` in the sent text

**Status:** wontfix

Priority: P2 (no bytes lost; the note's properties stop parsing, or the new note's text differs from what was sent)

**What to build:** two content-fidelity fixes in the deep-link write paths.

1. **Prepend goes below the frontmatter block (F129).** `executeNewAction` (src/lib/features/deep-link/deep-link.service.ts:271-288, the write at :276) and `executeDailyAction` (src/lib/app/deep-link-actions.ts:58-60) both build `content + '\n' + existing`. When the note starts with a frontmatter block, the block is pushed down a line. `FRONTMATTER_REGEX` (src/lib/core/frontmatter/properties.logic.ts:37) is anchored at `^`, so `parseFrontmatterProperties` (:345) returns `[]`: the note drops out of its type, its icon and every property-driven view. Daily notes often carry properties from their template, so `kokobrain://daily?prepend=true` hits this regularly.

   Fix: add one pure helper in src/lib/features/deep-link/deep-link.logic.ts (it already imports `properties.logic.ts`) and call it from both branches. When the note has a frontmatter block, insert `content + '\n'` right after the line break that ends the closing `---` line, leaving every byte before and after it unchanged; with no block, prepend as today. Detect the block with `FRONTMATTER_REGEX` (export a small helper from properties.logic.ts that returns the block's end offset, rather than copying the regex), so the detection agrees with `parseFrontmatterProperties` and follows issue 30 if that issue widens the regex.

2. **Non-silent new writes the sent text literally (F142).** The non-silent create branch (deep-link.service.ts:334-340) passes the URI or clipboard text to `openOrCreateNote` as `inlineTemplate` (:338). `loadNoteTemplate` (src/lib/core/note-creator/note-creator.service.ts:49-64) always runs `processTemplate`, which replaces every `<% ... %>` (src/lib/utils/template.ts:22-30) and returns unknown expressions without their delimiters (`evaluatePart`, :188-215). So `Hello <%= user.name %>!` is stored as `Hello = user.name!`. The silent branch (deep-link.service.ts:327-333) writes the same text raw, so one input is stored two ways depending on `silent`. A `prepend` or `append` to a missing note falls through to the same create branch.

   Fix: in the non-silent branch call `openOrCreateNote` with `buildContent: () => content` and no `inlineTemplate` (note-creator.service.ts:100-101 runs `buildContent` on the rendered empty template, so the sent text reaches `create_note` untouched). This drops `<% %>` expansion for deep-link text; no doc or test promises it (the existing test at src/tests/lib/features/deep-link/deep-link.service.test.ts:274-287 checks only the `inlineTemplate` argument and changes with the fix). Issue 04 changes the adjacent silent branch; whichever lands second rebases onto the other.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/features/deep-link/deep-link.service.ts:271-288,327-340, src/lib/app/deep-link-actions.ts:32-67, src/lib/features/deep-link/deep-link.logic.ts, src/lib/core/frontmatter/properties.logic.ts:37-47, src/lib/core/note-creator/note-creator.service.ts:49-64,100-101, src/tests/lib/features/deep-link/deep-link.service.test.ts, src/tests/lib/features/deep-link/deep-link.logic.test.ts

- [ ] Failing tests come first. Move the two `F129` tests and the `F142` test of `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts` under `src/tests/` and see them fail on the bug assertions. Its `editor.service.js` mock predates Issue 02: add `saveFileByPath: vi.fn(() => Promise.resolve(true))` (deep-link.service.ts:246-249 now calls it before every prepend). The `F126` tests in the same file belong to issue 04 and the `F130` tests to issue 17: leave them
- [ ] `new` + `prepend` on `---\n_type: Task\nstatus: open\n---\nBody line\n` writes `---\n_type: Task\nstatus: open\n---\nHi\nBody line\n`, and `parseFrontmatterProperties` of the result returns `_type` and `status`
- [ ] `daily` + `prepend` on a daily note with the same frontmatter does the same, through the real registered daily handler
- [ ] A prepend into a note without frontmatter still writes `content + '\n' + existing` (the existing prepend tests at deep-link.service.test.ts:468-505 and :673-689 still pass)
- [ ] The helper has unit tests in deep-link.logic.test.ts: block followed by body, block at end of file with no trailing line break, CRLF block (bytes outside the insertion unchanged), no block
- [ ] Non-silent `new` with `content=Hello <%= user.name %>!` creates a note whose bytes are exactly `Hello <%= user.name %>!`; the silent branch stores the same bytes
- [ ] Non-silent `new` + `prepend` (or `append`) on a missing note stores `<% %>` content literally too
- [ ] Non-silent `new` with no content still creates an empty note and opens it

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P2 table), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (issue 02 touches the same prepend branches only to save a dirty tab and keeps the `content + '\n' + existing` order; issue 30 covers only the empty `---\n---` block; issue 04 only adds an exists check to the silent branch; nothing mentions `processTemplate` or `inlineTemplate` on deep-link text). Code re-read at 1351a35d, after Issue 02 landed; the line numbers above are current.

### F129: prepend inserts text above the frontmatter block, detaching the note's properties

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** Note N starts with `---`, `_type: Task`, `_icon: ...`, `---`, then the body. `kokobrain://new?name=N&content=Hi&prepend=true`, or `kokobrain://daily?prepend=true` with clipboard or content text, writes `Hi`, then the old block, then the body. The block now reads as body text, so the note leaves its type, icon and property views until the user moves the text by hand.

**Recoverable from.** Yes, by hand: every byte survives, only the order is wrong.

**Code trace.** deep-link.service.ts:267 saves the dirty tab (Issue 02), :275 reads the disk copy, :276 `const newContent = content + '\n' + existing;`, :278 writes it. deep-link-actions.ts:55 saves, :56 reads, :58-60 `action.prepend ? content + '\n' + existing : existing + '\n' + content`, :63 writes. properties.logic.ts:37 `FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/`, :44-47 `extractRawFrontmatter` returns null when the text before `---` is not empty.

**Repro test.** `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts`, tests `F129: new + prepend keeps the frontmatter block parseable` and `F129: daily + prepend keeps the frontmatter block parseable`. Failing assertion in both: `expect(parseFrontmatterProperties(written).map((p) => p.key)).toEqual(['_type', 'status'])` receives `[]`. Recorded before Issue 02 landed; the missing `saveFileByPath` mock (first criterion) must be added before it reaches that assertion again.

**Fix sketch.** A shared helper: if the note has a frontmatter block, insert the content right after the closing `---` line, keeping the original line endings; otherwise prepend as today. Apply it in both `executeNewAction` and `executeDailyAction`.

### F142: non-silent new processes URI and clipboard text as a template, rewriting `<% %>` in note content

- Verdict: REPRODUCED (P2, likelihood rare)

**How a user hits it.** The user copies a snippet with ERB/EJS tags (`<%= user.name %>`, `<% if (x) { %>`) and runs `kokobrain://new?vault=V&name=Snippet&clipboard=true`, or sends it as `&content=`. The new note opens with `= user.name` and `if (x) {`: the delimiters are gone. The same link with `&silent=true` stores the text as sent. The change is visible at once, and only a brand-new note is affected (an existing note is opened untouched).

**Code trace.** deep-link.service.ts:260 `resolveContent(action)`, :334-339 `openOrCreateNote({ filePath, title, inlineTemplate: content || undefined })`. note-creator.service.ts:100 `loadNoteTemplate(...)`, :60 `content = inlineTemplate ?? ''`, :63 `processTemplate(content, title, ...)`. template.ts:28 `template.replace(/<%\s*([\s\S]*?)\s*%>/g, ...)`; `evaluatePart` falls through to `return part` (:215) for an unknown expression, without the delimiters. deep-link.service.ts:331 (silent) `writeTextFile(fullPath, content)` with no processing.

**Repro test.** `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts`, test `F142: non-silent new stores <% %> content literally`. Failing assertion: `expect(disk.get(`${V}/Snippet.md`)).toBe(snippet)` with `expected 'Hello = user.name!' to be 'Hello <%= user.name %>!'`.

**Fix sketch.** Write the URI content literally: call `openOrCreateNote` with `buildContent: () => content` and no `inlineTemplate`, or add a raw option to `openOrCreateNote` that skips `processTemplate`.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/111-deep-link-prepend-goes-below-frontmatter-non.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
