# Issue 17 discovery

No `spec.md` exists for file-io-audit; ADR-0029 is the governing decision.

## Files that change

- `src/lib/core/frontmatter/properties.logic.ts:378-393`: export `LOSSY_FRONTMATTER_MESSAGES`
  (toast text per `LossyFrontmatterReason`), so the markdown editor, which may not import a
  service (`markdown-editor-imports.test.ts`), shows the same text as `toastFrontmatterWriteError`.
- `src/lib/core/frontmatter/frontmatter-write.service.ts:46-55`: `WRITE_ERROR_MESSAGES` spreads it.
- `src/lib/features/properties/properties.service.ts:78-98` (`commitChanges`): replace
  `isFrontmatterUnparseable` with `detectLossyFrontmatter`; on a reason, log, call
  `toastFrontmatterWriteError(new FrontmatterWriteError(reason, activePath))`, return false.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:754-769`
  (`dispatchMetaBindUpdate`): same swap; toast `Cannot set <bind>: <message>`.
- `src/lib/app/deep-link-actions.ts:164-170` (`executeCaptureAction`): when an injection
  would run and `detectLossyFrontmatter(fileContent)` is non-null, skip both injections,
  write the template output as is, then toast with the written path.
- `docs/adr/0029-frontmatter-yaml-canonical-form.md`: one amendment line.

## Tests

- Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/panel-meta-bind-lossy-rewrite.test.ts`
  to `src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts`, red first,
  plus a `tweet_id: 1234567890123456789` case for both writers and toast assertions.
- `meta-bind-writers.test.ts`: lossy reasons (comment, nested, big int) per writer.
- New `src/tests/lib/app/deep-link-capture-frontmatter.test.ts` modeled on
  `.scratch/editor-data-safety/repro/fs-trash-deeplink/deep-link-writes.test.ts` (F130 cases),
  with real `processTemplate` (the existing deep-link.service test mocks it).

## Risks / defaults taken

- `properties.service.test.ts` "still adds to a comment-only frontmatter block" asserts the old
  lossy behavior (it drops `# nothing yet`). Under the acceptance criterion (a note with a comment
  refuses) it must now refuse; the test is rewritten to assert the refusal, bytes kept and the
  `comments` toast. It existed to guard that a null-contents block is not called unparseable;
  the new assertion still pins the reason as `comments`, not `unparseable`.
- The panel now toasts on an unparseable block too (it only logged before), per the Issue.
- `alias-collision` and `duplicate-keys` notes now refuse panel / meta-bind edits, as
  `updateNoteFrontmatter` already does.
- Capture: no toast when no injection would run (nothing is lost). The in-place Document
  edit and YAML-quoting template variables are out of scope.
