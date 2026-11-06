# 110: Deep-link names resolve safely: .md is added unless the name ends in a real extension, name=. stays inside the vault, and overwrite never replaces .kokobrain files

**Migrated from:** `.scratch/file-io-audit/issues/25-deep-link-path-safety.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Same fix site: resolveFilePath at utils/path.ts:33-53. It is reachable only from hand-built external URLs, because in-app Copy deep link includes the extension.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/utils/path.ts:33-53 resolveFilePath accepts normalized === base (:42) and appends .md to a last segment without a dot (:47-50), so name=. resolves to <parent>/<vault>.md outside the vault; a segment with a dot (.kokobrain/trash/trash-manifest.json) is kept as is. The overwrite branch src/lib/features/deep-link/deep-link.service.ts:306-320 mkdirs and writeTextFile's the target with no confirmation and no reject of .kokobrain or non-markdown targets. The silent-create branch :322-337 now refuses an existing file (9f5e4dd25), which narrows the name=. silent case to creating a new sibling, but overwrite=true still replaces it. Needs a crafted URL from a local process or a web page; no normal daily trigger.

**Stale in the text below:** The silent branch no longer overwrites an existing file (9f5e4dd25, Issue 04), so the name=. P3 section's 'silent branch writes it' only creates a missing <vault>.md; overwrite=true still overwrites. Line refs drifted: overwrite branch is deep-link.service.ts:306-320 (Issue :292-306 and :309-315), resolveFilePath check at path.ts:42 and suffix at :47-50 (Issue :41-50).

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: security
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Deep-link overwrite can replace any vault file, including .kokobrain trash manifest and settings.json, without confirmation

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity security)
- Claims covered: feature-writers-9, recovery-7

**How a user hits it.** Any local process (open kokobrain://...), or a browser page once the scheme is allowed, sending new&overwrite=true&file=.kokobrain/... No user action in the app.

**Recoverable from.** Notes: File History if saved in the app in the last 7 days. App JSON (.kokobrain/*.json): none.

**Root cause.** src/lib/features/deep-link/deep-link.service.ts:292-306 together with src/lib/utils/path.ts:46-50

**Evidence.** resolveFilePath keeps the path in the vault, but a segment with a dot is not suffixed with .md, so .kokobrain/trash/trash-manifest.json resolves as is. The overwrite branch writes unconditionally, and resolveAndDispatch/handleDeepLinkUrl (:118-169) has no confirmation. capabilities/default.json allows write-text-file on kokobrain-vaults/** and **/.kokobrain/**. The downstream effects in recovery-7 (orphaned trash, settings reset) were not verified here.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-path-safety.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected '[]' to be '[{"id":"1"}]' (overwrite refuses to rewrite app-owned files under .kokobrain)
```

**Fix sketch.** Reject deep-link write targets under .kokobrain (and dot-dirs) and non-markdown extensions. Optionally confirm before overwriting an existing note.

## Deep-link name that normalizes to the vault root (name=.) writes <vault>.md outside the vault

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity security)
- Claims covered: feature-writers-10

**How a user hits it.** Needs a crafted URL such as kokobrain://new?vault=Work&name=.&silent=true. The escape is limited to a sibling .md inside kokobrain-vaults (static fs scope; no runtime scope grants exist).

**Recoverable from.** none for an overwritten sibling <vault>.md, which rarely exists

**Root cause.** src/lib/utils/path.ts:41-50

**Evidence.** normalizePath('/…/Work/.') returns '/…/Work', which equals base and is accepted at :41. The last segment has no dot, so :47-49 returns '/…/kokobrain-vaults/Work.md'. The silent branch (deep-link.service.ts:309-315) writes it. $HOME/kokobrain-vaults/** allows it, and no allow_directory/allow_file exists in src-tauri/src.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-path-safety.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ '/Users/me/kokobrain-vaults/Work.md' ] to deeply equal []; AssertionError: expected false to be true (resolveFilePath(VAULT,'.') under VAULT/)
```

**Fix sketch.** In resolveFilePath, reject normalized === base (require startsWith(base + '/')).

## Audit audit-2026-11-05 additions

### Also: Deep-link new and open add .md to a name whose dot is not a known file extension

resolveFilePath (src/lib/utils/path.ts:46-50, re-exported by deep-link.logic.ts:318) appends '.md' only when the last segment contains no '.' at all, so 'Dr. Smith' is used verbatim. executeNewAction (src/lib/features/deep-link/deep-link.service.ts:253-254) then misses the existing 'Dr. Smith.md' in the append/prepend branches (:268-303, exists false) and creates an extensionless file instead (:325-346); Rust is_markdown_filename (src-tauri/src/utils/fs.rs:140) rejects it, so it is not indexed, searchable or listed, and the _organized flag is skipped (:324). open (:186-190) looks for the extensionless path and toasts 'Failed to open file.'. help/documentation/23-deep-links.md:60,77 promises '.md is added automatically if no extension is present'. Fix direction: treat the suffix after the last dot as an extension only when it is one the app knows (the extensions fs.logic.ts recognizes, plus the binary/image ones a deep link may name); otherwise append .md. utils/path.ts may not import core/, so either keep a small extension list there or do the check in deep-link.logic.ts. Coordinate with Issue 25, whose fix sketch rejects non-Markdown write targets.

- [ ] Failing test first, in src/tests/lib/features/deep-link/deep-link.logic.test.ts: resolveFilePath('/vault', 'Dr. Smith') returns '/vault/Dr. Smith.md', and resolveFilePath('/vault', 'notes/2026.11.05 Notes') returns '/vault/notes/2026.11.05 Notes.md'. It fails today.
- [ ] Known extensions are kept: 'notes/hello.md', 'notes/data.canvas', 'x.view' and 'x.kanban' resolve unchanged (existing cases at :905-911 stay green).
- [ ] In src/tests/lib/features/deep-link/deep-link.service.test.ts: new with name='Mr. Smith', append=true and an existing '/vault/Mr. Smith.md' appends to that file and creates no other file.
- [ ] open with file='v1.2 plan' opens '/vault/v1.2 plan.md'.
- [ ] Frontend gate: pnpm check and pnpm vitest run.

- **Trigger:** An external launcher (Raycast, Shortcuts, a script) fires kokobrain://new?vault=V&name=Dr.%20Smith (or name=2026.11.05%20Notes, name=v1.2%20plan, with or without append/prepend), or kokobrain://open?file=v1.2%20plan for an existing 'v1.2 plan.md'.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/utils/path.ts:46-50 `if (!lastSegment.includes('.')) return `${normalized}.md`` -> src/lib/features/deep-link/deep-link.logic.ts:318 re-export -> src/lib/features/deep-link/deep-link.service.ts:188 open, :253-254 new -> :269/:288 exists(fullPath) false for the extensionless path -> :325-346 create branch writes it -> :324 isMarkdownFile false skips markUnorganized -> src-tauri/src/utils/fs.rs:87,140 is_markdown_filename accepts .md/.markdown/.view only -> help/documentation/23-deep-links.md:60,77. In-app 'Copy deep link' builds file= with the extension (deep-link.logic.ts:321-331), and editor-host createNote uses markdownTarget (src/lib/app/editor-host.ts:87-89,133-136), so only hand-built external URLs hit this.
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/25-deep-link-path-safety.md`, `.scratch/file-io-audit/issues/53-deep-link-content-fidelity.md`
- **Second opinion:** upheld (content, low). utils/path.ts:46-50 appends .md only when the last segment has no '.'. So `new` with name 'Dr. Smith' writes the content to an extensionless file 'Dr. Smith', which is not indexed. With append, it misses the existing 'Dr. Smith.md' and creates that extensionless file instead, so the content goes to the wrong file. This contradicts 23-deep-links.md:60,77. It is reachable only from hand-built external URLs: in-app Copy deep link includes the extension. Corrections to apply while implementing: Duplicate of N-file-io-09 (same function, same fix). Merge them.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-06` (from file-io-content-1, file-io-rust-4, file-io-ux-4). Size S.

### Also: Deep-link open and new add .md to a note name with a dot unless it ends in a real file extension

help/documentation/23-deep-links.md:60,77 says '.md is added automatically if no extension is present'. resolveFilePath (src/lib/utils/path.ts:46-49, re-exported by deep-link.logic.ts:318) adds .md only when the last segment has no '.' at all. So executeNewAction (src/lib/features/deep-link/deep-link.service.ts:254) creates an extensionless file '<vault>/Node.js tips'. isMarkdownFile (src/lib/core/filesystem/fs.logic.ts:65-68) is false for it, so it is not a note: no index, backlinks, tags, search or markdown editing. The open action (deep-link.service.ts:186-190) looks for 'Dr. Smith' instead of 'Dr. Smith.md'. Fix: treat the segment as having an extension only when it ends in a file type the vault knows (.md/.markdown, .canvas, .kanban, .view, and the image/pdf types the app opens), and add .md otherwise. The other caller, appEditorHost.openView (src/lib/app/editor-host.ts:153), gets .view targets and keeps working. Do not change how createNote resolves names (it uses markdownTarget at editor-host.ts:87-89).

- [ ] Failing test first, in src/tests/lib/features/deep-link/deep-link.logic.test.ts (the resolveFilePath block at :894): expect resolveFilePath('/vault', 'Node.js tips') to be '/vault/Node.js tips.md' and resolveFilePath('/vault', 'People/Dr. Smith') to be '/vault/People/Dr. Smith.md'. It fails today.
- [ ] Known extensions are kept: 'notes/hello.md', 'notes/data.canvas', 'board.kanban', 'x.view' and an image name resolve unchanged (existing tests stay green).
- [ ] A dotted folder with a plain name still gets .md ('notes.archive/hello' -> 'notes.archive/hello.md', existing test).
- [ ] Path traversal is still rejected (existing tests).
- [ ] In src/tests/lib/features/deep-link/deep-link.service.test.ts, a new action with name 'Node.js tips' creates '<vault>/Node.js tips.md'.
- [ ] Gate: pnpm check, pnpm vitest run.

- **Trigger:** An Alfred, Raycast or clipper workflow sends kokobrain://new?vault=V&name=Node.js+tips&content=..., or name=Dr.+Smith or name=Meeting+5.30pm, or kokobrain://open?vault=V&file=Dr.+Smith for an existing 'Dr. Smith.md'.
- **Evidence (verified by reading code at `5f8003d67`):** help/documentation/23-deep-links.md:60,77 (promise) -> src/lib/features/deep-link/deep-link.logic.ts:318 (re-export) -> src/lib/utils/path.ts:46-49 (any '.' in the last segment counts as an extension) -> src/lib/features/deep-link/deep-link.service.ts:254 (new) and :186-190 (open) -> src/lib/core/filesystem/fs.logic.ts:65-68 (isMarkdownFile false for the result). Tests: src/tests/lib/features/deep-link/deep-link.logic.test.ts:894-945 have no dotted-name case. The other caller is src/lib/app/editor-host.ts:153 (openView).
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/25-deep-link-path-safety.md`
- **Second opinion:** upheld (content, low). Same confirmed root cause as N-file-io-06: resolveFilePath at utils/path.ts:46-50, called from deep-link.service.ts:188 (open) and :254 (new). 'Node.js tips' becomes an extensionless file that is not a note. The deep-link.logic.test.ts resolveFilePath block at :894 has no dotted-name case. Corrections to apply while implementing: Duplicate of N-file-io-06; merge them.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-09` (from file-io-spec-2). Size S.


## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/25-deep-link-path-safety.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
