# 11: Migrate test imports and mocks to #lib

**What to build:** every `$lib` specifier in the test suite, including `vi.mock`, `vi.importActual` and `vi.doMock` strings, uses `#lib`, so each mock still intercepts the module the source imports (a mismatched mock silently loads the real module).

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] No `$lib` specifier left in the test suite
- [ ] Mock specifiers match the specifiers the mocked modules are imported with
- [ ] pnpm check + pnpm vitest run + pnpm build green

## Comments

- 2026-10-28 16:39 — calendar-feature ticket 36 — the event-calendar plan added these `vi.mock` strings (still `$lib`); migrate each together with the matching source import:
  - `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:151`: `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)`
  - `src/tests/lib/core/layout/tauri-listeners.service.test.ts:67`: `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)`
  - `src/tests/lib/features/type-definitions/type-definitions.service.test.ts:17`: `vi.mock('$lib/core/note-creator/note-creator.service', ...)`
