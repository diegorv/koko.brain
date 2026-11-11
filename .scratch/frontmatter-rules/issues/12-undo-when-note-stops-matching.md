# 12: Document the two-rule pattern for values that switch back

**What to build:** documentation only. Rules never revert what they wrote when a note stops matching (PRD Decision 7). A pair of rules covers the common case without any memory: one rule for the state, one for its opposite. The owner chose on 2026-11-10 to document this pattern instead of building an undo.

**Blocked by:** 14

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm vitest run src/tests/help` (docs and an example only).

### Behavior

1. The help page (`help/documentation/22-auto-organize.md`) gets a section, "Switching a value back", with the pattern:

   ```
   status == "blocked"   ->  _color: red      (always)
   status != "blocked"   ->  remove _color    (Issue 07's remove mode)
   ```

   Also a variant that sets a known default instead of removing, such as `_icon`.
2. The section says when the pattern does **not** work: when the value before the rule is unknown, for example a color the user picked by hand. The second rule removes it or overwrites it. The text says this plainly.
3. It reminds the reader that the higher rule wins a key (Issue 01), so the two rules must have exclusive filters, and shows how to write them with `!` or `!=`.
4. The pattern is added to `help/examples/auto-organize-features/.kokobrain/auto-organize-rules.json` and evaluated by the examples test, as Issue 06 does for its examples.

### Acceptance

- [ ] The section exists with both variants and the "unknown previous value" limit.
- [ ] The example pair is in the examples config, and a test evaluates it on a `blocked` note and an `active` note, with the expected `_color` result for each.
- [ ] `pnpm vitest run src/tests/help` passes.

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-12*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

1. **Fixture, not the shipped example file.** The pair goes in a test fixture under `src/tests/help/`. The shipped `help/examples/auto-organize-features/auto-organize-rules.json` is flat and must stay folder-scoped. The test runs `findMatchingRules`, `ownedProperties` and `propertiesToWrite` on a `blocked` note and an `active` note.
2. **The help-page pair uses exclusive filters.** It also notes that another rule owning `_color` (such as Issue 06's examples) wins by list order.

## Notes

- **Owner decision, 2026-11-10 survey:** "only document the pair".
- If an undo is ever built, the same survey recorded these answers:
  - memory in `.kokobrain/auto-organize-state.json`;
  - a rule that matches now beats the undo;
  - an edited or deleted rule's memory is forgotten silently.

## Comments
