# Issue 04 discovery

No `spec.md` for architecture-stability. Prototype read: `/tmp/brain-arch-analysis/s3/edges.mjs`
(named in the Issue); its extractor reports block-relative lines for `.svelte`, fixed here.

## Files that change

- `scripts/import-graph.mjs` (new, `// @ts-nocheck` like `scripts/check-outdated-cargo.mjs:2`):
  `extractImports(file, text)`, `resolveSpecifier(from, spec, exists)` (pure: `exists` is injected),
  `locate(path)`, `findViolations(edges, opts)`, `formatViolation`, `formatStale`, plus impure
  `scanLib(root)`. CLI `node scripts/import-graph.mjs` prints the baseline JSON to stdout, never writes.
- `src/tests/lib/architecture/import-graph.test.ts` (new): extractor/resolver unit tests on inline
  fixture strings (written first, red).
- `src/tests/lib/architecture/layer-rules.test.ts` + `layer-baseline.json` (new): the ratchet.
- `docs/adr/0003-four-layer-source-taxonomy.md`: enforcement section, composition-root table,
  features->features allowed while acyclic (Issue 05), plugin example fixed (calendar -> periodic-notes).

## Plan

1. Extractor tests red, then extractor + resolver + locate green.
2. Rules + roots + messages + layer-rules.test.ts; generate baseline once with the CLI.
3. ADR-0003 amendment; the test parses the ADR root table and compares it to `ROOTS`.

## Prior art

- `src/tests/help/examples-scoping.test.ts:29,353-363` (allowlist + stale entry), scanner sanity
  from `src/tests/lib/lib-specifier-convention.test.ts:50`, `.mjs` import from
  `src/tests/scripts/check-outdated-cargo.test.ts:3-23`.

## Defaults taken

- Scan scope: `src/lib/**/*.{ts,svelte}` minus `.d.ts`. Routes are not scanned (no rule applies).
- Composition roots are exempt from the outbound rules (core->features, core->plugins,
  features->plugins), as in the prototype; that is what makes them roots.
- "Root's own folder" = the root's directory and its subfolders.
- Packages (unresolvable bare specifiers) and `src/lib/contracts/` are never violations.
- utils->non-utils and types->lib count any `src/lib` target outside their layer (lib-root files included).
- Baseline size: the test pins a ceiling equal to the landing count, so a grown baseline fails too.

## Risks

- `<script>` inside an HTML comment or string in markup would be scanned as code (none today).
- Sidebar 24/25 land after this and must delete stale baseline lines (Issue landing note).
