# 02 discovery: task-line patch and anchor helpers

No `spec.md` for this feature; the design is `.scratch/todoist-bisync/research/design.md` (rules 4, 5, 10, 11, Anchor).

## Files

- New `src/lib/features/todoist-sync/anchor.logic.ts`: `🆔 td-` read / foreign-id detect / build / generate-unique, anchor -> occurrences map, sync scope filter.
- New `src/lib/features/todoist-sync/task-line.logic.ts`: status, `📅`, priority, tag add/remove, description replace, content round-trip check. Imports `anchor.logic.ts` only (no framework, no `features/tasks`, per design Architecture).
- New tests `src/tests/lib/features/todoist-sync/{anchor,task-line}.logic.test.ts`.
- Parser mirrored (read-only): `src-tauri/src/vault/parsing.rs` TASK_RE :1426, ORDERED_TASK_RE :1433, signifiers :1448-1485, RECURRENCE_RE stops :1531, ID_RE :1550, TASK_TAG_RE :1577, collapse :1581, `map_checkbox_char` :1589.

## Plan

- Split a line into prefix (indent + `-*+` or `N.` marker + `[`), status char, text, mirroring both Rust task regexes. Every patch returns `null` for a non-task line and edits only the text group (or the status char).
- Status (rule 5): close keeps `x`/`X`/`-`, else `x`; open keeps ` /?!>`, else space.
- `📅`: set replaces the first `📅 date` in place (parser reads the leftmost) or inserts; remove drops every `📅 date`. Priority: set replaces the first priority emoji in place and drops any other (parser picks by list order, not position); remove drops all.
- Tags: add is a no-op when the tag is already a standalone token (case-insensitive, rule 8); remove drops only standalone tokens (`(^|\s)#tag` not followed by a tag char), so `[[a#b]]` and `url/#b` are untouched.
- New tokens go immediately before the first `🆔`, else at the end of the text (before trailing whitespace). Removal also drops one adjacent whitespace run, so no double space is left.
- Description replace: tokenize the text into links (`[[..]]`, `[..](..)`, `http(s)://`), signifier tokens (date+value, priority, `🔁` + text up to the next stop like RECURRENCE_RE, `🆔`/`⛔`/`🏁` + value), standalone-or-not tags (TASK_TAG_RE) and plain words. Links count as words (the parser keeps them in `description`). The span replaced runs from the first to the last word.
- Round-trip check: returns the first problem (`newline`, `hash`, `signifier`, `whitespace`) or `null`.

## Defaults taken (open questions)

- Mid-sentence conflict = a tag, link or unmapped signifier (`⏳ 🛫 ➕ ✅ ❌ 🔁 ⛔ 🏁`) before the last word (rule 4 literally, so also before the first word), plus a mapped token (`📅`, priority, `🆔`) between the first and last word: replacing that span would drop it. A line with no description word is a conflict too (`no-description`).
- `readAnchor` returns the full value (`td-…`) of the first `🆔` (the parser keeps only the first); `null` when that value lacks `td-`. `hasForeignId` is true when any `🆔` value lacks `td-`.
- `generateAnchor(taken, random = Math.random)`: injectable random only so the collision retry is testable.
- Occurrences input is generic `{ relPath, line }` (line = text) so callers can carry a line number.
- Scope paths are vault-relative; `_system/` and `.kokobrain/` match at the root; templates folder matched as the folder itself or `folder/` prefix, ignored when empty.
- `addTag` throws on a name that fails the tag rule (caller filters labels by `isTaskTagName`, rule 8).

## Prior art

- `src/tests/lib/features/tasks/todoist-bridge.logic.test.ts` (pure logic test style, `#lib/...js` imports).
- `generateBlockId` in `src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:59` (random id in a `.logic.ts`).

## Risks

- Drift from the Rust parser: the TS regexes are copies; each sits next to a comment naming its Rust constant.
- Astral emoji need the `u` regex flag; `️` is optional after every signifier, as in Rust `emoji_pattern`.
