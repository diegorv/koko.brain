# Issue 12 discovery: document the two-rule pattern for values that switch back

Docs and a test only. No `spec.md` for this feature; `PRD.md` holds the decisions (Decision 7: no revert). Repeats Issue 06's help-test pattern (`work/06/`): rules read from the help page, sample notes and expected writes in a JSON fixture, run through `findMatchingRules` -> `ownedProperties` -> `propertiesToWrite`. What differs is listed below.

## Files that change

- `help/documentation/22-auto-organize.md`: new `## Switching a value back` section between `## Examples` (ends :537) and `## Debounce Delay` (:539). The "Blocked notes in red" example (:471) points to it instead of its one-line hint.
- `src/tests/help/auto-organize-switch-back.fixture.json` (new): the two pairs as complete rules, plus sample notes and expected writes per pair.
- `src/tests/help/auto-organize-switch-back.test.ts` (new).

## Plan

1. Test first: the test reads every ```json block of the new section, asserts they equal the fixture's rules (so the page and the fixture cannot drift, and the pair lives in a fixture as amendment 1 asks), and runs **both rules of a pair together** (`findMatchingRules([a, b], ...)`, unlike 06's one-rule `run`) on each sample: a `blocked` note gives `_color: red`, an `active` note with `_color: red` gives `remove _color`, a `blocked` note matches only the first rule (exclusive filters). One sample shows the limit: an `active` note with a hand-picked `_color: blue` loses it.
2. Section text: the pattern block from Behavior 1; the remove pair (`_color`); the default variant (`_icon` set back to a known icon with `always`); the "unknown previous value" limit, plainly; exclusive filters with `!=` or `!(...)`, and why (higher rule owns a key, Issue 01); another rule owning `_color` (06's "Blocked notes in red", "Archive done notes") wins by list order.

## Defaults taken

- The pair's JSON on the page is scoped with `type == "project"`: `status != "blocked"` is true on a note with no `status`, so unscoped it would remove a hand-picked `_color` from every note any save touches. The pattern block keeps the Issue's bare form.
- Separate fixture and test file: 06's test fails on a fixture key with no rule in Overview/Examples, and the new section is outside both.
- Not in `help/examples/auto-organize-features/auto-organize-rules.json` (amendment 1).

## Risks

- `!=` against a missing property: relies on `null != "blocked"` being true; the `active`-without-status sample checks it.
