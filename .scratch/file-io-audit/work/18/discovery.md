# Issue 18 discovery

No `spec.md` exists for file-io-audit; ADR-0029 (frontmatter canonical form) governs. Pattern
follows `work/17` (same writers); this Issue preserves instead of refusing.

## Files that change

- `src/lib/core/frontmatter/properties.logic.ts:567-585` (`serializeProperties`): optional
  `originalRaw` (raw frontmatter). For a key whose original root value is an unquoted (PLAIN)
  number or boolean scalar with a `source`, and whose property value is still `===` the parsed
  value (same JS type), emit `source` verbatim. yaml 2.9.1 has no "keep source" switch for ints
  (`0042`, `0x1F`, `1e3` re-spell even in-place), so the token goes out through a custom
  `default: true` scalar tag on the Document (`identify` a wrapper class, `stringify` returns the
  token, no tag prop is printed).
- `properties.logic.ts:606-612` (`rebuildContent`): optional third arg `original` (full note
  content); it extracts the raw block and passes it on. `ensureFrontmatterLink` :545 passes it.
- Callers that rewrite an existing note pass their source content:
  `frontmatter-write.service.ts:128`, `properties.service.ts:99`, `widgets.ts:798`,
  `event-calendar.service.ts:998`, `event-calendar-event.logic.ts:355` (template base),
  `deep-link.logic.ts:398-454` (injectTitle/injectTags).
- `detectLossyFrontmatter` unchanged: the serializer keeps every spelling in the Issue.

## Tests

- New `src/tests/lib/features/properties/frontmatter-number-spelling.test.ts`: both repros
  (`number-respelling`, `f53-favorite-scalar-bytes`) merged, red first, plus `0o17`, `TRUE`,
  `False`, `FALSE`, no-toast assertion, meta-bind (F103 `price: 9.90` / `done: True`, real
  EditorView as in `panel-meta-bind-lossy-rewrite.test.ts`), Properties panel edit, and a
  changed key (`version` -> 2) written canonically.
- `properties.logic.test.ts`: serializeProperties/rebuildContent with original raw (kept token,
  changed value canonical, quoted string unaffected, no original = old output).

## Risks / defaults

- Equality is per canonical key; an alias key (`color` -> `_color`) keeps its value token.
- The Properties panel stores a number as a JS number; a user edit that sets the same value
  (e.g. retypes `1.10` as `1.1`) keeps the original spelling (value unchanged), acceptable.
- Meta-bind writes strings, so a bound number/boolean key goes canonical (it is the edit).
