# Issue 10 discovery

No `spec.md` exists for audit-2026-11-05 (only PRD.md); the Issue is self-contained.

## Files that change

- `src-tauri/tauri.conf.json:32-43` (`app.security.assetProtocol.scope`): add
  `$HOME/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**/.kokobrain/**`.
  Keep every existing entry (the 2026-11-06 note and the plan review: add, never narrow).
- `src/tests/lib/architecture/fs-capabilities.test.ts` (new): reads
  `src-tauri/tauri.conf.json` and `src-tauri/capabilities/default.json`; for every glob in the
  `fs:allow-read-text-file` scope, asserts some asset-scope glob covers it.
- `help/documentation/README.md:52-62` ("Embedded Local Files"): the list mirrors the asset
  scope, so add `~/kokobrain-vaults/**`.

## Plan

1. Write the test, run it, see it fail for `$HOME/kokobrain-vaults/**` (and its .kokobrain glob).
2. Add the two scope entries, run it green. Update the README list.
3. Gate per Issue: cargo test (tauri.conf.json is embedded by `generate_context!`), pnpm check,
   targeted vitest.

## Coverage semantics (default taken)

The criterion says "contains the same glob", but also says the test fails today only for
`$HOME/kokobrain-vaults/**`, and `$DOCUMENT/kokobrain-vaults/**` is not listed literally: it is
covered by `$DOCUMENT/**`. So the test checks coverage, not string equality. It models Tauri's
`requireLiteralLeadingDot` (default true on Unix, per `@tauri-apps/cli/config.schema.json`):
`**` never matches a segment starting with `.`, so `$DOCUMENT/**` does not cover
`.../.kokobrain/**`; `$DOCUMENT/**/.kokobrain/**` does. Each fs glob is matched as a path whose
`**` is an ordinary non-dot segment.

## Prior art

- `src/tests/lib/core/settings/theme-catalog.service.test.ts:139-150` (JSON read of default.json).
- `src/tests/lib/architecture/event-listen.test.ts` (file header JSDoc style).

## Risks

- Manual criteria (image renders under ~/kokobrain-vaults, Quick Capture shot, Documents vault
  still renders) cannot be checked by this run: Tauri enforces the scope at fetch time.
- `$DOCUMENT` vs `$HOME/Documents` aliasing is not modelled; both configs use `$DOCUMENT`.
