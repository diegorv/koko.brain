# Discovery: Issue 01, rules set properties on save

No `spec.md` exists for this feature; `PRD.md` holds the settled Decisions.

## Files that change

- `src/lib/features/auto-move/auto-move.types.ts:14-27`: `RuleProperty`, `AutoMoveRule.properties?`.
- `src/lib/features/auto-move/auto-move.logic.ts`: add `sanitizeRuleProperties` (Behavior 1), `findMatchingRules` (all matches; `findMatchingRule` stays, used by `examples-scoping.test.ts` and lifecycle tests), `findMoveRule` (first with `destination.trim()`), `ownRuleProperties` (first rule per canonical key owns it), `applyRuleProperties(props, owned)` (pure mutate, returns `null` when nothing changes), `isPropertyWriteBlocked(path, content, vault, folders)` gates.
- `src/lib/core/frontmatter/properties.logic.ts:464`: export `isEmptyPropertyValue`.
- `src/lib/features/auto-move/auto-move.service.ts:42-65` load sanitizes `properties`; `:94-127` observer drops captured content, returns early for paths in a module-level `writingPaths` set; timer re-checks `settingsStore.autoMove.enabled` and reads fresh content (tab first, else disk; vanished file returns with a `debug`); `:152-215` `evaluateAndMove` rewritten: match all, move via `findMoveRule`, then inside `writingPaths.add(target)` / `finally delete`: legacy icon, re-read content, gates, one `updateNoteFrontmatter` call. Failed property write logs `error` once per rule id per session (set cleared in `resetAutoMove`).
- `help/documentation/22-auto-move.md`: "Setting properties" section, field table, "How Rules Work", config example, user-term caveats.

## Plan

1. Failing test first (`auto-move.service.test.ts`, Acceptance 1), then types + logic + service.
2. Logic tests in `auto-move.logic.test.ts` for sanitize, matching, move rule, ownership, modes, gates.
3. Service tests for modes, two rules, fall-through, move then write, failed move, fresh content, deleted note, disabled before timer, boolean, load, gates. `updateNoteFrontmatter` stays real and writes through the mocked `writeTextFile` (closed-note branch); the file keeps its `editor.hooks` / `moveItem` / `setIconForPath` mocks, with `notifyAfterSave` added to the hooks mock.
4. New `auto-move.no-chain.test.ts`: real `editor.hooks`, real `updateNoteFrontmatter`, real `setIconForPath`; only `@tauri-apps/plugin-fs` (in-memory map) and `#lib/contracts/ipc.js` `call` mocked. Chaining (A sets `_belongs_to`, B on it) and loop (legacy icon no color + `_color: red` always, note already in destination) cases; assert `vi.getTimerCount() === 0`.
5. Docs.

## Prior art

- `src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts`: real frontmatter writer with mocked fs and `invoke`.
- Existing observer tests in `auto-move.service.test.ts` (captured observer + fake timers).

## Risks

- Decision 11: an unchanged note must never be rewritten, but `rebuildContent` canonicalizes. So the service decides on fresh content before calling `updateNoteFrontmatter`, and re-reads after the legacy icon write (it may have removed `_color`), else the next save would leave `_color` removed.
- `mutate` re-decides on the props it receives (pure), so a base that moved between the check and the write still gets the right values.

## Defaults taken

- A non-array `properties` is removed from the loaded rule (not set to `[]`), so a config without it round-trips unchanged.
- Empty key means `key.trim() === ''`. A list value must hold only strings.
- Type definition = parsed `_type === 'Type'` (case-sensitive, as `isA === 'Type'` in the type-definitions store).
- The "once per rule" error names every contributing rule not yet reported; a repeat failure for already-reported rules is a `debug`.
- Move-failure behavior (mkdir failure, `moveItem` throw or `null`) is unchanged: return before any write.
