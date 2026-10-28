# 72: Flaky pointer-drag and keyboard tests in the Calendar E2E spec

**What to build:** the `Event calendar pointer drag` and `Event calendar keyboard` describes in `e2e/specs/event-calendar.spec.ts` pass reliably without retries.

**Blocked by:** None

**Status:** needs-triage

- Measured on main with `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts -g "pointer drag|keyboard" --retries=0`: before issue 49 (76e1a7ee) 2 of 4 runs had one failure; after it (2ce5bfa1) 1 of 3. Pre-existing, not a regression from 49.
- Tests seen failing: "dragging a block one hour down" (block still shows 09:00 - 10:00), "dragging the resize handle", "a week step mid-drag discards the move", "Escape mid-drag discards the move", "Meta+Z undoes a drag and Meta+Shift+Z re-applies it". With the default retry the suite reports them as flaky and stays green, which hides them.
- Likely a race between the drag gesture and the block's layout or the index refresh; find it with logging before changing waits.

- [ ] Root cause recorded; 10 consecutive `--retries=0` runs of those describes pass
