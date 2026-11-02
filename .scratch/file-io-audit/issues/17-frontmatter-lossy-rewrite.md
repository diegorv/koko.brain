# 17: Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors

**Status:** resolved

**Blocked by:** none

**What to build:** Three writers rebuild the whole frontmatter block from the parsed `Property[]` and guard only with `isFrontmatterUnparseable`, so comments, nested maps, duplicate keys and anchors are dropped and integers above 2^53 change digits: the Properties panel `commitChanges` (src/lib/features/properties/properties.service.ts:78-98), meta-bind `dispatchMetaBindUpdate` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts) and the capture title/tags injection in `executeCaptureAction` (src/lib/app/deep-link-actions.ts, `injectTitleIntoContent` / `injectTagsIntoContent`). `detectLossyFrontmatter` already catches all of these and `updateNoteFrontmatter` (src/lib/core/frontmatter/frontmatter-write.service.ts:121) uses it. Fix: run `detectLossyFrontmatter` in all three writers and refuse with the `toastFrontmatterWriteError` toast, leaving the note's bytes unchanged (for capture: skip the injection and write the template output as is). See the Fix sketch below; the in-place Document edit is the recorded alternative, not this Issue's fix.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: fidelity-6

**How a user hits it.** Default settings, common action. Clicking one Properties panel checkbox, or any meta-bind control, on a note whose frontmatter has a comment or a nested map. The disk copy is rewritten by the 500 ms frontmatter autosave. No toast is shown.

**Recoverable from.** Not via undo: the editor applies the rewrite with addToHistory(false). File History has the old bytes only if the app saved that version before. Otherwise only git or Time Machine.

**Root cause.** src/lib/features/properties/properties.service.ts:82 (commitChanges checks only isFrontmatterUnparseable). Same in src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:756 (dispatchMetaBindUpdate). Neither runs detectLossyFrontmatter, which updateNoteFrontmatter runs at frontmatter-write.service.ts:121.

**Evidence.** properties.logic.ts:290-300 drops nested maps on parse, and serializeProperties (:575-590) emits only the parsed props, so comments are lost. commitChanges rebuilds with rebuildContent(updated, extractBody(content)) (:86-95). ADR-0029 documents this as an accepted limitation. The control test passes: toggleFavoriteForPath writes nothing for the same note.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/panel-meta-bind-lossy-rewrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: ---\ntitle: x\ndone: true\n---\n# Body\n: expected '---\ntitle: x\ndone: true\n---\n# Bod…' to contain '# reviewed' (disk after one panel checkbox). The meta-bind toggle fails the same way, with done: "true".
```

**Large integers.** The same two writers also change the digits of an integer beyond Number.MAX_SAFE_INTEGER. On a note with `tweet_id: 1234567890123456789`, a Properties panel checkbox or a meta-bind toggle on another key writes `tweet_id: 1234567890123456800`. isFrontmatterUnparseable does not flag this (the parse cache marks only a throw, a non-mapping root or a circular list item as unparseable), while detectLossyFrontmatter already reports it as 'unparseable'.

**Third writer: capture title and tags injection.** executeCaptureAction (src/lib/app/deep-link-actions.ts:104) renders the capture template with processTemplate (:157), which does not YAML-quote variables, then calls injectTitleIntoContent (:165) and injectTagsIntoContent (:169). Both (src/lib/features/deep-link/deep-link.logic.ts:385-406, :419-455) parse with parseFrontmatterProperties, which returns [] for a block that does not parse, strip the whole block with extractBody and rebuild it from the injected key alone. No lossy or unparseable check runs. Trigger: a link template with `title: <% title %>` and `created: ...`, captured with the title `Clean Code: A Handbook`, renders `title: Clean Code: A Handbook`, which is invalid YAML; the written note keeps only `title`, and `created` and every other template key are gone with no notice. A note capture with tags whose template output or pasted text starts with a frontmatter block that does not parse loses that block the same way. Issue 30 (empty `---` `---` block) is a different defect.

**Fix sketch.** Run detectLossyFrontmatter in commitChanges and dispatchMetaBindUpdate. Refuse with the same toast as toastFrontmatterWriteError, or route both through updateNoteFrontmatter. Because the detector reports unsafe integers as 'unparseable', this also stops the large-integer digit change; keeping only isFrontmatterUnparseable does not. Guard the third writer too: in executeCaptureAction, when detectLossyFrontmatter(fileContent) is non-null after the template step, skip the title and tags injection, write the template output as it is and show a toast. Optionally YAML-quote string variables exposed to capture templates, or document that `<% title %>` needs quotes. An alternative to refusing, a single-key edit on the parsed yaml Document, is recorded under Audit evidence below.

**Acceptance.**

- [x] Failing test comes first. Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/panel-meta-bind-lossy-rewrite.test.ts` under `src/tests/`: one Properties panel checkbox and one meta-bind toggle on a note with a comment or a nested map either refuse with the toast and leave the bytes unchanged, or keep the comment and the map
- [x] A meta-bind toggle and a Properties panel checkbox on a note with `tweet_id: 1234567890123456789` refuse with the toast and leave the note's bytes unchanged
- [x] A link capture with the title `Clean Code: A Handbook` and a template with `title: <% title %>` and `created: ...` keeps `created` and every other template key, or skips the injection and shows a toast; a note capture with tags whose template block does not parse behaves the same way

## Audit evidence (editor-data-safety, 2026-11-02)

Findings from `.scratch/editor-data-safety/audit-2026-11-02.md`, cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md`. Code paths re-read at 1351a35d. The repro tests live under `.scratch/editor-data-safety/repro/` and must be copied to `src/tests/audit-repro/<group>/` to run (see the README there).

- G2 (P0, occasional, covered by the original scope): a Properties panel edit on a note with a nested map, a comment, an anchor or a duplicate key rewrites the block without them. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/g2-panel-lossy.test.ts`. Code: commitChanges (src/lib/features/properties/properties.service.ts:78-98) checks only isFrontmatterUnparseable at :82, then writes rebuildContent(updated, extractBody(content)) at :87-88.
- F97 (P0, occasional, covered by the original scope): the meta-bind toggle and inline select do the same. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts` (F97 cases). Code: dispatchMetaBindUpdate (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:754-769) checks only isFrontmatterUnparseable at :756.
- F103 (P1, rare): unsafe integers change digits on both writers. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts` (F103 cases, through the inline select) and `.scratch/editor-data-safety/repro/frontmatter-roundtrip/g2-panel-lossy.test.ts` ("F103 (panel leg)"). Code: computeAndCache (src/lib/core/frontmatter/properties.logic.ts:258-318) caches UNPARSEABLE only on a throw, a non-mapping root or a circular list item, so isFrontmatterUnparseable (:360-365) is false for `tweet_id: 1234567890123456789`; detectLossyFrontmatter flags it at :427-434.
- F130 (P2, occasional): capture injection drops a template block that does not parse. Repro: `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts` (two F130 cases). Code: src/lib/app/deep-link-actions.ts:157 (processTemplate; src/lib/utils/template.ts has no YAML escaping), :164-170 (injection); src/lib/features/deep-link/deep-link.logic.ts:389-390 and :422-423 (parse and extractBody); parseFrontmatterProperties (properties.logic.ts:345-349) returns [] for UNPARSEABLE; extractBody (:53-57) strips the block by FRONTMATTER_REGEX whether or not it parses; rebuildContent (:615-622). A read-only check with yaml 2.9.1 confirms `title: Clean Code: A Handbook` fails to parse (BLOCK_AS_IMPLICIT_KEY).
- Alternative to refusing (read-only check against node_modules/yaml 2.9.1, not a repo test): parseDocument(raw), then doc.set('favorite', true), then doc.toString(), on a block with a top-level comment, a nested `location:` map with an inline comment, `price: 9.90`, `done: True`, `id: 0042`, `mask: 0x1F`, `exp: 1e3` and `tweet_id: 1234567890123456789`. The output kept the comment, the nested map with its inline comment, `price: 9.90` and `done: True`, and changed `favorite`. It still wrote `id: 42`, `mask: 0x1f`, `exp: 1e+3` and `tweet_id: 1234567890123456800`; with `{ intAsBigInt: true }` the tweet_id digits survived, but `0042` still became `42`. ADR-0029 says comments cannot be preserved with yaml@2.9.1 and Document.toString (docs/adr/0029-frontmatter-yaml-canonical-form.md:74, :95). That holds for the current serializer, which builds a new Document from parsed values (serializeProperties, properties.logic.ts:569-585), not for an in-place edit of the parsed Document. The in-place edit still needs the detector (or issue 18's source-token check) for leading zeros, hex, exponent and unsafe integers, and choosing it amends ADR-0029. Duplicate keys and anchors were not part of this check.

## Comments

- 2026-11-02, branch issue/17-frontmatter-lossy-rewrite: the Properties panel commit and the meta-bind dispatch now run detectLossyFrontmatter and refuse with the frontmatter write-error toast, leaving the bytes unchanged (comments, nested maps, duplicate keys, anchors, unsafe integers); capture title/tags injection is skipped with a toast when the rendered template block is lossy or does not parse; ADR 0029 records the refusals. Fix round after review 1: repeated refusal toasts collapse and the refused field resets. Tests: pnpm check passed (0 errors); full suite at 33621aaf passed (exit=0, 429 files, 9925 passed, 1 skipped, 1 todo, build done), log test-logs/file-io-audit/17-deliver.log. Reviews: round 1 APPROVED, round 2 APPROVED (open owner question: a comment-only frontmatter block makes the panel read-only).
