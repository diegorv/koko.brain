# Deep-link polish — future work

Polish items discovered while extending the `kokobrain://capture` action with a `title` param (see `tasks/done/deep-link-capture-title.md` and `deep-link-capture-title-followup.md`). None are blocking; they are quality-of-life and robustness improvements that can ship independently of each other.

## Tasks

- [ ] Task 1: Success feedback on `capture`. Today `executeCaptureAction` writes silently — callers (quick-capture, Raycast scripts) have no signal that the note landed. Decide on a toast policy (`toast.success('Captured to <relative path>')` is the cheapest), or expose a return value through the deep-link plugin response if Tauri ever supports one. Update `deep-link.service.ts` + service tests.
- [ ] Task 2: Filename collision dedup in `executeCaptureAction`. Two rapid captures within the same `filenameFormat` resolution unit (minute/second/hour depending on the user's setting) currently overwrite each other. Wrap `buildQuickNotePath` output in a numeric-suffix loop (e.g. `name.md`, `name-2.md`, `name-3.md`) until the path is free. Touches `quick-note.logic.ts` or `deep-link.service.ts`; logic tests in `quick-note.logic.test.ts` and `deep-link.service.test.ts`.
- [ ] Task 3: Document the `tags` scalar overwrite footgun. `injectTagsIntoContent` replaces a non-list `tags:` YAML property with a list, dropping the original scalar. Behavior is intentional and unit-tested but is not called out in `help/documentation/23-deep-links.md`. Add a paragraph under the `capture` section describing it.
- [ ] Task 4: Add `clipboard=true` support to the `capture` action. The `new` and `daily` actions both honor it via `resolveContent`; `capture` ignores it. Type change in `deep-link.types.ts`, parse change in `deep-link.logic.ts`, service wiring in `deep-link.service.ts`. Tests in each of the three test files.
- [ ] Task 5: Mirror `title` on the `new` action. `capture` got title injection; `new` should accept the same param so external tools can supply structured titles for arbitrary file paths, not only quick-capture-style notes. Apply the same parse + inject pattern via `injectTitleIntoContent`. Type + parse + service + tests.
- [ ] Task 6: Deep-link E2E smoke test. Unit coverage is solid but there is no test that fires a real `kokobrain://` URI through `registerDeepLinkListener` end-to-end. Add a Playwright test under `tests/` that invokes the listener with a synthetic URL and asserts the note file shows up on disk. Reference `scripts/e2e.sh` for the harness pattern.

## Notes

- Each task is independently shippable — don't bundle. Pick the highest-value one when you have an hour and ship it on its own slice with the standard test + commit gate (CLAUDE.md rule 6 and Quick Reference rule 11).
- Tasks 1, 2, and 4 are the most user-visible. Tasks 3 and 6 are doc/test hardening. Task 5 is symmetry/completeness for power users.
- The motivating context for the parent slice was the quick-capture integration at `/Users/diegorv/Dev/pet-projects/koko/quick-capture`; once that integration runs in production any of these gaps may become real bug reports.
