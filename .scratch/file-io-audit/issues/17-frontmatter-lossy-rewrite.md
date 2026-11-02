# 17: Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors

**Status:** needs-triage

**Blocked by:** none
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

**Fix sketch.** Run detectLossyFrontmatter in commitChanges and dispatchMetaBindUpdate. Refuse with the same toast as toastFrontmatterWriteError, or route both through updateNoteFrontmatter.
