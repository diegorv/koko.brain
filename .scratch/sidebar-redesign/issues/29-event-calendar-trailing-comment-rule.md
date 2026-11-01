# 29: Re-evaluate the event-calendar trailing-comment rule

**What to build:** Issue 26 moved the Rust frontmatter reader to `yaml-rust2`, which strips YAML comments. The event calendar still flags a value containing ` #` as `trailing-comment` (`src/lib/features/event-calendar/event-calendar-event.logic.ts:33-34,137-139`), because the old subset parser kept `start: 09:30 # standup` as `"09:30 # standup"`.

After issue 26 the rule still fires, but only for:
- notes whose whole block falls back to the subset parser (yaml-rust2 rejected it, see the `FRONTMATTER` debug log);
- quoted values that really contain ` #` (`location: "Room #4"` is not a checked key, but a quoted `start: "9 #x"` is).

Decide whether the rule stays (fallback notes only), changes, or goes. Align `rustFrontmatter` in `src/tests/fixtures/event-notes.fixture.ts:35` (its doc comment says "a trailing ` # comment` stays in the value") with the new Rust behaviour here.

**Blocked by:** 26

**Status:** ready-for-agent

**Source:** Issue 26 acceptance criterion "Follow-up issue filed".

- [ ] The rule's remaining triggers are listed and the decision is recorded in the code comment on `COMMENT_CHECKED_KEYS`
- [ ] `rustFrontmatter` in `event-notes.fixture.ts` matches `parse_frontmatter` for the event-note shapes, including a trailing comment
- [ ] Tests cover a fallback note and a quoted value with ` #`
