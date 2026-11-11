# 12: Document the two-rule pattern for values that switch back

**What to build:** documentation only. Rules never revert what they wrote when a note stops matching (PRD Decision 7). A pair of rules covers the common case without any memory: one rule for the state, one for its opposite. The owner chose on 2026-11-10 to document this pattern instead of building an undo.

**Blocked by:** 11

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

## Notes

- **Owner decision, 2026-11-10 survey:** "only document the pair".
- If an undo is ever built, the same survey recorded these answers:
  - memory in `.kokobrain/auto-organize-state.json`;
  - a rule that matches now beats the undo;
  - an edited or deleted rule's memory is forgotten silently.

## Comments
