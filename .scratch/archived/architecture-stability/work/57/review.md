VERDICT: APPROVED

## Acceptance criteria

- [met] Every palette shortcut label comes from the registration that binds it; no shortcut string is written twice under `src/lib/app/` — `src/lib/app/commands.ts` has no `shortcut: {...}` literal left: 17 labels are `shortcutFor('<id>')` over `GLOBAL_KEYBINDINGS` (`src/lib/app/global-keybindings.ts:62-201`), the list `registerGlobalKeybindings` maps into `registerKeybinding` (`:224`), and Copy Link to Block reads `COPY_BLOCK_LINK_SHORTCUT`, which also builds the editor keymap key (`editor-extensions.ts:35,127`). A grep for `key: '`, `code: '`, `meta: true`, `Mod-` and `Cmd+` under `src/lib/app/` outside `global-keybindings.ts` returns nothing. Each derived combo equals the old literal (the existing `commands.test.ts` `toEqual` assertions on the literal shapes still pass).
- [met] `RESERVED_KEYBINDINGS` is derived from the same registrations — there is no `RESERVED_KEYBINDINGS` to derive: a grep of `src/` and `docs/` finds none. It was removed from `core/keybindings/keybindings.logic.ts` in 43498215 (sidebar-redesign Issue 25), together with `findKeybindingConflict`, its only consumer (`git show 43498215^:src/lib/core/keybindings/keybindings.logic.ts`). Nothing reserves keys today. Recreating it would add a constant that nothing reads, so leaving it out is right; the Issue's premise was stale (see finding 4).
- [met] A test fails when a palette command shows a shortcut no registration binds — `src/tests/lib/app/global-keybindings.test.ts` "every shortcut the palette shows is bound by a registration". I probed it myself: replacing `shortcutFor('file-history:open')` with a literal `{ meta: true, shift: true, key: 'j' }` made it fail with "file-history:open shows a shortcut no registration binds" (exit 1). I then restored the file, and the worktree is clean.

## Findings

1. minor, `src/tests/lib/app/global-keybindings.test.ts:759`: the test adds `COPY_BLOCK_LINK_SHORTCUT` to the `bound` set as a constant, without reading it from the editor keymap. If the keymap stopped using the constant, this test would not notice. The new `editor-extensions.test.ts` dispatch test (Ctrl+Shift+L reaches `copyBlockLinkToClipboard`) covers the key itself, so the gap is small. Fix (optional): collect the keys of `createExtensions()`'s keymap and assert that `toCodeMirrorKey(COPY_BLOCK_LINK_SHORTCUT)` is among them.
2. nit, `src/lib/app/global-keybindings.ts:207-208`: the JSDoc says a typo "fails at build time of the command list". It actually throws at runtime, inside `getBuiltInCommands()`, which `AppOverlays.svelte:15` calls while rendering. In the app, a bad id breaks the overlay render instead of just dropping a label. The tests that call `getBuiltInCommands()` (`commands.test.ts`, `commands.new-commands.test.ts`, the new palette test) catch the typo first, so the throw is acceptable. Fix: reword it to "throws when the command list is built (tests call it), so a typo fails loudly instead of dropping the label".
3. nit, build report: it says `registerGlobalKeybindings` registers "the same objects". The rest spread at `global-keybindings.ts:224` passes new objects without `command`. Behavior is unchanged and the existing registration tests still pass. No code change is needed.
4. nit, `.scratch/architecture-stability/issues/57-derive-palette-shortcut-labels.md:3,14`: the Issue was filed against a `RESERVED_KEYBINDINGS` that no longer existed. Deliver should record in the squash body that criterion 2 holds vacuously, as `discovery.md` already does, so nobody recreates the constant later.

No blockers. There is no scope creep: the `KeyCombo` type, `toCodeMirrorKey` and `COPY_BLOCK_LINK_SHORTCUT` each serve the single-declaration criterion and have tests. No layer violation: `app -> core` and `core -> utils`, and `src/tests/lib/architecture` passes with the baseline untouched.

## Checks run (by this review)

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app src/tests/lib/utils/keybindings.test.ts src/tests/lib/core/markdown-editor/setup src/tests/lib/features/command-palette src/tests/lib/architecture`: exit 0, 23 files, 420 tests passed. The test verdict rests on these files, mainly `src/tests/lib/app/global-keybindings.test.ts`, `src/tests/lib/app/commands.test.ts`, `src/tests/lib/app/commands.new-commands.test.ts`, `src/tests/lib/utils/keybindings.test.ts`, `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`, `src/tests/lib/features/command-palette/*` and `src/tests/lib/architecture/layer-rules.test.ts`.
- Probe: an unbound literal shortcut on `file-history:open` makes the new palette test fail (described above).
- Not run: the full suite, `pnpm build` and E2E (deliver runs the gate).

## Resolution

1. Rejected. `editor-extensions.test.ts` "binds COPY_BLOCK_LINK_SHORTCUT (Cmd+Shift+L)" already pins the constant's value and dispatches that exact combo through the `createExtensions()` keymap, so a keymap key that drifts from the constant fails it. A check over the keymap facet's keys could not tell the constant from an equal literal either, so it would add no coverage.
2. Fixed: the `shortcutFor` JSDoc now says it throws when the command list is built, which the tests do, instead of "at build time".
3. No change needed (report wording only, as the review says).
4. Recorded in the squash commit body: criterion 2 holds vacuously because `RESERVED_KEYBINDINGS` was removed in 43498215 with `findKeybindingConflict`, its only consumer.
