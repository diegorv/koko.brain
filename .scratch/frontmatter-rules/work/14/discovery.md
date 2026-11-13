# Issue 14 discovery: normalize a create-note target before its gates

## Files that change

- `src/lib/features/auto-organize/auto-organize.logic.ts:355-376`: add `normalizeVaultRelativePath`; `createTargetProblem` normalizes first and runs the file-name, protected and excluded checks on the normalized path (null result: `leaves the vault`).
- `src/lib/features/auto-organize/auto-organize.logic.ts:409-417` (`countNotesToCreate`): dedupe and existence check on the normalized target, so the editor count agrees with the run.
- `src/lib/features/auto-organize/auto-organize.service.ts:463-472` (`createRuleNotes`): after the gate passes, build `targetPath` from the normalized target, so `creatingPaths`, `exists`, `mkdir` and `createFile` all see the same path.
- Tests: `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts:1325` (`createTargetProblem` block, plus a `normalizeVaultRelativePath` block), `src/tests/lib/features/auto-organize/auto-organize.service.test.ts:1334` (`create note` block).

## Plan

1. Failing logic tests: `./_system/x.md` -> `inside _system/`; `_system//x.md`, `a/./../x.md`, `./Excluded/x.md` refused; `notes/./x.md` accepted, normalizes to `notes/x.md`. Then the helper and the `createTargetProblem` change.
2. Failing service test: rules `./notes/x.md` and `notes/x.md` in one run -> one `createFile('/vault/notes', 'x.md', '')`. Then the service change. The in-memory disk in that block keys on the literal path, so without normalization the second rule creates a second note.
3. `countNotesToCreate` uses the normalized target (one logic test: `./notes/x.md` with `notes/x.md` in the index counts 0).

## Prior art

- `createTargetProblem` tests at logic test :1325, `countNotesToCreate` tests right after.
- Service `create note` block (:1334): `creator()`, `run()`, in-memory `disk`.

## Rename (Behavior 4)

`renameTarget` (logic :621) passes every name through `toFileName` (:597), which replaces `/` and `\` with `-` and strips leading dots, so a rename cannot build a `.`, `..` or doubled-slash path. No change.

## Defaults taken

- The helper returns `''` for a target of only `.`/empty segments; the file-name check then refuses it (`has no file name`).
- A leading `/` is dropped by the normalization (empty segment). `sanitizeCreateNote` already refuses a configured leading `/`, and a variable producing one stays inside the vault.
- Whitespace-only segments are left as is (not in the Issue).
- The debug line for a refused target keeps the raw resolved target, so the log shows what the rule produced.
- `countNotesToCreate` is not named in the Issue; it is the same gate on the same target, changed so the count and the run agree (Behavior 3: a target and its `./` twin are the same target).

## Risks

- None found in move destinations: `resolveDestination` is untouched (Issue out of scope).
