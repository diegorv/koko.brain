# Issue 41 discovery

No `spec.md` for architecture-stability. Follows `work/39` (same function, same shared fixtures).

## Rust reference (checked by reading the code)

`build_node` (`src-tauri/src/vault/parsing.rs:676-709`) replaces every alias with a copy of the
anchored node before `project_value` (:739-753) runs, so the fold sees aliases already resolved:
- `a: &x [[X]]` + `b: *x` -> `{a: "[[X]]", b: "[[X]]"}`
- `a: [[&x X]]` + `b: *x` -> `{a: "[[X]]", b: "X"}`
- `z: &x X` + `a: [[*x]]` -> `a: "[[X]]"`; `a: &l [X]` + `b: [*l]` -> `b: "[[X]]"`

## Plan (smallest change that matches Rust on all four)

1. `foldUnquotedWikilinks` (`src/lib/features/properties/properties.logic.ts:45-55`): before the
   fold, replace each alias whose target is a scalar or a chain of one-item sequences ending in a
   scalar with an anchor-free clone of that target (`alias.resolve(doc)`, `node.clone()`). Only those
   shapes, so a clone holds no alias and is linear in size (no billion-laughs blowup; map aliases and
   merge keys stay aliases). After that no alias points into a fold candidate, so dropping the old
   nodes' anchors cannot leave `*x` unresolved. Copying the anchor alone would not do: for
   `[[&x X]]` it would make `b` read `"[[X]]"` instead of `"X"`.
2. `computeAndCache` (:133-136): log `doc.warnings` the way `yaml.parse` did (`console.warn`, which is
   what yaml's browser `log.warn` does at the default log level).
3. Panel guard: `commitChanges` (`properties.service.ts:74-90`) has no parse-failure check and
   PropertiesView does not block editing. Add `isFrontmatterUnparseable(content)` to the logic file
   (non-empty block whose parse errors, throws in `toJS`, or has a non-map root) and refuse the commit.
   An empty or comment-only block (root null) is not a failure, so adding the first property still works.
4. Pin the four inputs in `src/tests/fixtures/frontmatter-parity.fixture.json` (Rust value, raw yaml
   value as `tsExpected`) so the Rust reading is tested, and in `properties.logic.test.ts` through
   `parseFrontmatterProperties`. TS now agrees with Rust: no ADR divergence; one clause in the
   Issue 39 amendment of ADR 0029 says aliases resolve before the fold.

## Prior-art tests

- `src/tests/lib/features/properties/properties.logic.test.ts` (unquoted wikilink block from Issue 39).
- `src/tests/lib/features/properties/properties.service.test.ts` for the commit guard.

## Risks / defaults

- Detecting failure costs one extra `parseDocument` per panel commit (not per keystroke); fine.
- A refused commit does nothing visible beyond a `PROPERTIES` log line; the panel already shows no
  properties for such a note. No toast added (not asked).
