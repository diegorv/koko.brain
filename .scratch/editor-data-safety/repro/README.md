# Repro tests for audit-2026-11-02

Red tests written during the deep dive of `../audit-2026-11-02.md`. Each test asserts the
CORRECT behavior, so it fails today on the bug's assertion. They live here, outside
`src/tests/`, so the vitest gate does not pick them up.

To run one, copy its group folder back to `src/tests/audit-repro/<group>/` (relative imports
such as `../../fixtures/...` and `../../lib/core/markdown-editor/test-helpers` assume that
depth) and run `pnpm vitest run src/tests/audit-repro/<group>/`.

When a bug is fixed, move its test into the matching `src/tests/lib/...` file as the
regression test and delete it from here.

`writes-into-wrong-tab/_probe.test.ts` is a diagnostic probe used to refute F5, not a repro.
