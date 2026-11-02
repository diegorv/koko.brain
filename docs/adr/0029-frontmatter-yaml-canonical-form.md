---
type: ADR
id: "0029"
title: "Canonical YAML form for frontmatter on the write path"
status: active
date: 2026-05-31
---

## Context

Every UI mutation that touches frontmatter (Properties panel, lifecycle toggles, meta-bind widgets, frontmatter-icon picker, deep-link writers, type-definitions service) eventually re-serializes the whole frontmatter block via `serializeProperties` + `rebuildContent` (`src/lib/core/frontmatter/properties.logic.ts:202` and `:218`). The serializer delegates the per-scalar quoting decision to `yaml@2.9.0` with `{ lineWidth: 0, flowCollectionPadding: false }`. ADR 0027 already covers the underscore-prefix + alias convention for keys, but not the value-side rules — quoting, empty handling, list flow style, key order, drops.

External producers also write frontmatter directly. The motivating case is `koko.brain-os/vault/work/people/_generate.py`, a Python script that materialises 105 person notes from a JSON source. Its hand-rolled quoting heuristic disagreed with yaml@2.9.0 (it over-quoted `@` and `:` inside strings), guaranteeing a one-shot diff against any file the app had touched, and breaking the "re-run generator = zero diff" idempotence we depend on for safe regeneration.

We need: a documented contract for the canonical form, codified in tests, locked against silent yaml-version drift, exported in a form a non-TypeScript producer can read.

## Decision

**The canonical frontmatter byte sequence emitted by Kokobrain is defined by `serializeProperties` at `src/lib/core/frontmatter/properties.logic.ts:202` running against yaml@2.9.1 (pinned, no caret) with `{ lineWidth: 0, flowCollectionPadding: false }`. The exact rules below are reproduced as a pure pre-emission predicate at `src/lib/core/frontmatter/yaml-quoting.logic.ts` (`shouldQuoteScalar`) and pinned by 12 byte-level snapshot tests + 130 predicate parity tests.**

### Quoting (scalar values)

A string scalar is **double-quoted** iff any of the following is true. Otherwise it is bare.

| Trigger | Example -> emitted |
| --- | --- |
| Empty string | `""` |
| Leading char in `[`, `]`, `{`, `}`, `!`, `&`, `*`, `>`, `\|`, `@`, `` ` ``, `'`, `"`, `#`, `%`, `,` | `[[Foo]]` -> `"[[Foo]]"`, `@foo` -> `"@foo"` |
| Leading `?` or `-` followed by space/tab | `? key` -> `"? key"` |
| Lone `~` | `~` -> `"~"` |
| Leading or trailing space/tab | `" leading"` -> `" leading"` |
| Trailing `:` | `foo:` -> `"foo:"` |
| Substring `": "` (colon + space or tab) | `foo: bar` -> `"foo: bar"` |
| Substring `" #"` or `"\t#"` | `foo #x` -> `"foo #x"` |
| Reserved literal: `true`, `false`, `null`, `Null`, `NULL`, `True`, `False`, `TRUE`, `FALSE`, `~` | `true` -> `"true"` |
| Parses as YAML core number (decimal, hex, octal, float, scientific, `.inf`, `.nan`) | `42` -> `"42"`, `.inf` -> `".inf"` |
| Contains control char (`\x00-\x08`, `\x0b`, `\x0c`, `\x0e-\x1f`, `\x7f`) | -> quoted |
| Contains `\n` or `\r` | emitted as block scalar (`\|-`) |

Bare survives for:
- `:` mid-string with no following space (URN-style values like `urn:example:identity:uuid:abc`).
- `@` mid-string or trailing (emails like `foo@bar.com`, `foo@`).
- ISO date-like strings (`2026-05-31`, `2026-05-31T12:00:00`).
- `yes`, `no`, `on`, `off` (NOT reserved in YAML 1.2 core).
- Mid-string tabs.
- `100%`, `foo%bar` (only leading `%` quotes).
- `?nospace`, `-nospace` (only `?`/`-` + space quotes).
- `~tilde` (only lone `~` quotes).

Inside a flow-sequence item (`[a, b]`), the predicate is stricter: any `,` forces quoting because the comma is the flow-sequence separator. So `foo, bar` is bare in mapping context but quoted in list context.

Quote style: always **double-quoted**. yaml@2.9.1 sometimes picks single-quotes (for values containing `"` but no `'`); `canonicalizeScalar` always emits double-quotes. Both forms are valid YAML and round-trip to the same value; the discrepancy only matters for byte-identical comparison on values containing literal `"`, which do not appear in normal vault frontmatter (wikilinks, URNs, emails carry none).

### Empty values

`key:` with no value parses as null. `convertToProperty` at `properties.logic.ts:65-67` coerces null/undefined to `{ type: 'text', value: '' }`, which the serializer emits as `key: ""`. An empty list is emitted as `key: []`. The Properties type system (`_system/types/*.md`) is UI-side only and does not influence disk form.

### Lists

Always flow-style: `key: [a, b, c]`. The separator is comma + space; no padding inside the brackets. Each item is requoted by the same scalar rules as above, but in flow-item context (so `foo, bar` items would quote where they would not as a mapping value). A single-item list also uses flow style: `key: [only]`. List items are coerced to strings: numbers, booleans, dates, and objects all become strings via `String(item)` / `JSON.stringify(item)` at `properties.logic.ts:46-55`.

### Key order

Input order is preserved. `serializeProperties` iterates the Property[] in array order and emits one `doc.set(key, value)` per iteration; JS preserves Object insertion order, so a key inserted between `_archived` and `created` stays there round-trip.

### Aliases

Every key is passed through `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts:30`) on both the parse path (`properties.logic.ts:135`) and the write path (`properties.logic.ts:208`). External producers writing alias keys (`favorite`, `icon`, `type`, …) see them normalised to canonical (`_favorite`, `_icon`, `_type`, …) on the next disk round-trip.

### Drops

Nested mapping values are not representable in the Properties panel and are dropped during parse at `properties.logic.ts:132-145`. The drop is logged through the properties diagnostics sink (`configurePropertiesDiagnostics`, wired to `appendLog('PROPERTIES', …)` by `src/routes/(app)/+layout.svelte`) so the data loss is traceable in the session log; the behaviour is preserved (no throw, no UI surface).

YAML comments are dropped on round-trip — yaml@2.9.1 with our options does not preserve them through `Document.toString`. This is a known limitation of the library, not a Kokobrain decision; treat frontmatter as machine-managed and put long-form prose in the body.

### Framing

`rebuildContent` at `properties.logic.ts:218-225` wraps the serializer output as `---\n${yaml}\n---\n${body}`. Line endings are LF only; the parser accepts `\r?\n` but the writer always emits LF. No BOM, no trailing whitespace per line.

### Trigger window

Normalization does NOT fire on open (`editor.service.ts:58-119` reads the file verbatim) and does NOT fire on save (`editor.service.ts:133-155` writes verbatim). It fires only on UI mutations that re-serialize via `rebuildContent`: Properties panel commit, lifecycle service, frontmatter-icon service, deep-link writers, type-definitions view editor, meta-bind input widgets. A file written by an external producer and never touched through the UI keeps its bytes intact.

### Version pinning

The `yaml` dependency is pinned to exact `2.9.1` in `package.json` (no caret). Any future upgrade must be an explicit edit accompanied by a re-run of the canonical-form snapshot tests and a sync with the external Python generator. The 130 parity tests at `src/tests/lib/core/frontmatter/yaml-quoting.logic.test.ts` catch drift.

Amendment 2026-10-29: pin moved from 2.9.0 to 2.9.1. The snapshot and parity tests pass unchanged, and the maintainer confirmed the external generator needs no change.

## Alternatives considered

- **Use the predicate to actually emit, replacing yaml.Document**. Strictly safer but doubles the surface area: we would own both the predicate and the emitter and would have to keep the predicate in sync with itself across mapping and flow contexts, escape sequences, block scalars, etc. The current split (predicate documents + parity-tests yaml's behaviour, yaml emits) keeps the implementation small.
- **Sort keys alphabetically on write**. Considered briefly; rejected because deterministic order ranks alpha over semantic grouping (`type` -> `_organized` -> `_archived` -> `_favorite` -> `created` -> domain fields is the human-friendly order; alphabetisation would scatter system flags into the middle of domain fields).
- **Allow yaml's single-quote choice through**. Rejected for the Python generator side: Python emits double-quotes uniformly, and matching yaml's edge-case single-quote pick would force the generator to embed yaml-policy state. The Python side is the source of truth for these rare cases; if yaml emits `'foo'` and Python emits `"foo"`, the next UI touch re-canonicalises to whatever yaml picks.
- **Preserve YAML comments**. Not feasible with yaml@2.9.1 + `Document.toString` for our shape; would require a different library or a manual emitter.

## Consequences

- The Python generator at `koko.brain-os/vault/work/people/_generate.py` is rewritten in lockstep with this ADR to replicate these rules. Other external producers must do the same.
- The machine-readable spec at `docs/specs/frontmatter-canonical-form.md` is the consumable contract; this ADR is the rationale.
- Any future `yaml` upgrade is an intentional canonical-form change that must update the snapshot tests, the predicate, the spec, and the Python generator together.
- Nested mappings stay dropped (with a session-log breadcrumb). YAML comments stay dropped. Both are limitations callers must accept.
- Amendment 2026-10-28 (calendar-feature issue 35, [0032](0032-calendar-events-are-event-typed-notes.md)): two write paths now refuse instead of dropping. `updateNoteFrontmatter` (`src/lib/core/frontmatter/frontmatter-write.service.ts`) runs `detectLossyFrontmatter` (`properties.logic.ts`) on the current content and throws `FrontmatterWriteError` with the reason (`unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`) without writing; the calendar's event creation refuses a lossy type template with `EventCalendarError('template-lossy')` before any note is written. Every other writer listed under Trigger window keeps the drop behaviour above. The canonical form itself is unchanged: a write that does go through still emits exactly the bytes this ADR defines.
- Amendment 2026-10-28 (calendar-feature issue 55): the frontmatter-icon service (`setFrontmatterIcon`, `removeFrontmatterIcon` in `src/lib/features/file-icons/frontmatter-icon.service.ts`) and `toggleFavoriteForPath` (`src/lib/features/properties/lifecycle.service.ts`) write through `updateNoteFrontmatter`, so they refuse lossy frontmatter too and report the reason in an error toast (`toastFrontmatterWriteError`) instead of dropping comments or nested values.
- Amendment 2026-11-01 (sidebar-redesign issue 26): the Rust read path accepts the whole canonical form. `parse_frontmatter` and `parse_frontmatter_raw_yaml` (`src-tauri/src/vault/parsing.rs`) read frontmatter with `yaml-rust2`'s event parser instead of the line-based subset [0025](0025-rust-vault-index.md) scoped, so `|-` block scalars, quoted list items containing commas and double-quoted escapes read the same in the Rust index as in the Properties panel. The projection is unchanged: keys go through `canonicalize_key` ([0027](0027-frontmatter-system-metadata-underscore-prefix.md)) and are last-wins, plain scalars resolve through `parse_scalar`, nested maps (also inside lists) become null. Comments are now stripped and anchors / aliases resolve. Known divergences from yaml@2.9.1, pinned in `src/tests/fixtures/frontmatter-parity.fixture.json`: `: orphan value` is skipped (yaml keeps it under the empty key), `null: z` keeps the key `null` (yaml uses the empty key), `[[[A]], [[B]]]` and `[[A]]` project to `"[[A]]"` strings, and so does a block list whose only item is a one-item flow list (`items:\n  - [a]` gives `"[[a]]"`; yaml returns nested arrays), `!!str 42` is the number 42 (tags are ignored), `0x1F`, `0o14` and `.inf` stay strings (yaml reads numbers), and integers above 2^53 stay exact. Fallback: when yaml-rust2 rejects the block or yields more than one document (`title: foo: bar`, `tags: [a, b`, `tags: [#foo, #bar]`, tab indentation, a second document after `...`, or after a `---` line in a `.view` file, which TS `parseCollectionYaml` rejects instead; nesting deeper than 128 sequences and maps, the root map included, added by sidebar-redesign issue 30 so a compact `- - - …` list cannot overflow the stack, where yaml@2.9.1 has no limit; an alias whose anchored subtree would end deeper than that limit resolves to null instead, like one past the alias budget, so a chain of aliases cannot nest the projected value past it either), the whole block goes through the old subset parser with its previous values, `|-` values and comma lists included, and a `FRONTMATTER` debug log is the only signal. `INDEX_SCHEMA_VERSION` went to 4 so cached entries are parsed again.
- Amendment 2026-11-01 (architecture-stability issue 39): the TS read path now matches Rust on the nested `[[X]]` shape. `parseFrontmatterProperties` (`foldUnquotedWikilinks` in `properties.logic.ts`) reads a list holding a one-item list of a scalar as the string `"[[X]]"`, built from X's source text (`[[007]]` stays `[[007]]`, `[[~]]` stays `[[~]]`), so an unquoted `key: [[X]]` is a text value and `- [[X]]` block items are `"[[X]]"` list items; the raw yaml@2.9.1 divergence above still holds outside that function. The Rust NoteRecord (`project_note_record`, `src-tauri/src/commands/vault.rs`) writes `_type: ""` for a bare `type:` when no `is_a` is derived, matching the null-to-`""` coercion under Empty values. Both rules are pinned by `src-tauri/tests/fixtures/note-record-projection.json`, which the Rust and TS projection tests share.
- Amendment 2026-11-01 (architecture-stability issue 41): like Rust, the TS fold resolves aliases first. An alias whose target is a scalar or a chain of one-item lists ending in a scalar is replaced by a copy of that target before the fold, so `[[*x]]` and `[*l]` fold to `"[[X]]"`, and an alias to a folded node (`a: &x [[X]]` + `b: *x` gives `"[[X]]"`; `a: [[&x X]]` + `b: *x` gives `"X"`) still resolves; the four inputs are pinned in `src/tests/fixtures/frontmatter-parity.fixture.json`. Anchors inside a copy are cleared, so a later alias still resolves to the latest anchor of that name. Because those aliases become copies, yaml's `maxAliasCount` (100) no longer counts them, so the pass has its own cap (architecture-stability issue 43): at most 10,000 copied nodes per block (`ALIAS_COPY_BUDGET`). A block with more than 100 aliases to one scalar, which threw and parsed to no properties, now parses while its copies stay under that cap. Past it the parse throws and the block reads as unparseable (no properties, panel edits refused), as before: without the cap, N aliases to one scalar or a chain of `l_i: &l_i [*l_{i-1}]` lines cost quadratic time (tens of seconds for an 11 KB block) on every save and watcher event. Anchors are looked up in one pass over the document, not one per alias. Properties panel edits (`commitChanges` in `properties.service.ts`) now refuse when the frontmatter does not parse (`isFrontmatterUnparseable`: a YAML error, an unresolvable alias, a root that is not a mapping) instead of rewriting the block from the empty property list; every other panel edit keeps the drop behaviour above.
- Amendment 2026-11-02 (file-io-audit issue 17): the Properties panel (`commitChanges` in `src/lib/features/properties/properties.service.ts`) and every meta-bind writer (`dispatchMetaBindUpdate` in `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`) now run `detectLossyFrontmatter` instead of `isFrontmatterUnparseable` and refuse any reason it reports (a comment-only block included) with the `LOSSY_FRONTMATTER_MESSAGES` toast, bytes unchanged; since the detector reports integers beyond 2^53 as `unparseable`, those keep their digits too. The capture action (`executeCaptureAction` in `src/lib/app/deep-link-actions.ts`) skips the title and tags injection when the detector flags the rendered template block, writes that block as the template made it and shows the same toast. The drop behaviour above still holds for the remaining writers under Trigger window.

## Citation map

- Serializer entry: `src/lib/core/frontmatter/properties.logic.ts:202` (`serializeProperties`).
- Frame wrapper: `:218` (`rebuildContent`).
- Predicate: `src/lib/core/frontmatter/yaml-quoting.logic.ts` (`shouldQuoteScalar`, `canonicalizeScalar`).
- Parse-time alias resolution: `properties.logic.ts:135`.
- Write-time alias resolution: `properties.logic.ts:208`.
- Empty-value coercion: `properties.logic.ts:65-67`.
- Nested-object drop + warn: `properties.logic.ts:132-145`.
- Snapshot tests: `src/tests/lib/core/frontmatter/properties.logic.test.ts` describe `canonical form snapshot (serializeProperties)`.
- Predicate + parity tests: `src/tests/lib/core/frontmatter/yaml-quoting.logic.test.ts`.
- Pinned yaml version: `package.json:74`.
