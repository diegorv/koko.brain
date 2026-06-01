---
type: ADR
id: "0029"
title: "Canonical YAML form for frontmatter on the write path"
status: active
date: 2026-05-31
---

## Context

Every UI mutation that touches frontmatter (Properties panel, lifecycle toggles, meta-bind widgets, frontmatter-icon picker, deep-link writers, type-definitions service) eventually re-serializes the whole frontmatter block via `serializeProperties` + `rebuildContent` (`src/lib/features/properties/properties.logic.ts:202` and `:218`). The serializer delegates the per-scalar quoting decision to `yaml@2.9.0` with `{ lineWidth: 0, flowCollectionPadding: false }`. ADR 0027 already covers the underscore-prefix + alias convention for keys, but not the value-side rules — quoting, empty handling, list flow style, key order, drops.

External producers also write frontmatter directly. The motivating case is `koko.brain-os/vault/work/people/_generate.py`, a Python script that materialises 105 person notes from a JSON source. Its hand-rolled quoting heuristic disagreed with yaml@2.9.0 (it over-quoted `@` and `:` inside strings), guaranteeing a one-shot diff against any file the app had touched, and breaking the "re-run generator = zero diff" idempotence we depend on for safe regeneration.

We need: a documented contract for the canonical form, codified in tests, locked against silent yaml-version drift, exported in a form a non-TypeScript producer can read.

## Decision

**The canonical frontmatter byte sequence emitted by Kokobrain is defined by `serializeProperties` at `src/lib/features/properties/properties.logic.ts:202` running against yaml@2.9.0 (pinned, no caret) with `{ lineWidth: 0, flowCollectionPadding: false }`. The exact rules below are reproduced as a pure pre-emission predicate at `src/lib/features/properties/yaml-quoting.logic.ts` (`shouldQuoteScalar`) and pinned by 12 byte-level snapshot tests + 130 predicate parity tests.**

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

Quote style: always **double-quoted**. yaml@2.9.0 sometimes picks single-quotes (for values containing `"` but no `'`); `canonicalizeScalar` always emits double-quotes. Both forms are valid YAML and round-trip to the same value; the discrepancy only matters for byte-identical comparison on values containing literal `"`, which do not appear in normal vault frontmatter (wikilinks, URNs, emails carry none).

### Empty values

`key:` with no value parses as null. `convertToProperty` at `properties.logic.ts:65-67` coerces null/undefined to `{ type: 'text', value: '' }`, which the serializer emits as `key: ""`. An empty list is emitted as `key: []`. The Properties type system (`_system/types/*.md`) is UI-side only and does not influence disk form.

### Lists

Always flow-style: `key: [a, b, c]`. The separator is comma + space; no padding inside the brackets. Each item is requoted by the same scalar rules as above, but in flow-item context (so `foo, bar` items would quote where they would not as a mapping value). A single-item list also uses flow style: `key: [only]`. List items are coerced to strings: numbers, booleans, dates, and objects all become strings via `String(item)` / `JSON.stringify(item)` at `properties.logic.ts:46-55`.

### Key order

Input order is preserved. `serializeProperties` iterates the Property[] in array order and emits one `doc.set(key, value)` per iteration; JS preserves Object insertion order, so a key inserted between `_archived` and `created` stays there round-trip.

### Aliases

Every key is passed through `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts:30`) on both the parse path (`properties.logic.ts:135`) and the write path (`properties.logic.ts:208`). External producers writing alias keys (`favorite`, `icon`, `type`, …) see them normalised to canonical (`_favorite`, `_icon`, `_type`, …) on the next disk round-trip.

### Drops

Nested mapping values are not representable in the Properties panel and are dropped during parse at `properties.logic.ts:132-145`. The drop is logged via `appendLog('PROPERTIES', …)` so the data loss is traceable in the session log; the behaviour is preserved (no throw, no UI surface).

YAML comments are dropped on round-trip — yaml@2.9.0 with our options does not preserve them through `Document.toString`. This is a known limitation of the library, not a Kokobrain decision; treat frontmatter as machine-managed and put long-form prose in the body.

### Framing

`rebuildContent` at `properties.logic.ts:218-225` wraps the serializer output as `---\n${yaml}\n---\n${body}`. Line endings are LF only; the parser accepts `\r?\n` but the writer always emits LF. No BOM, no trailing whitespace per line.

### Trigger window

Normalization does NOT fire on open (`editor.service.ts:58-119` reads the file verbatim) and does NOT fire on save (`editor.service.ts:133-155` writes verbatim). It fires only on UI mutations that re-serialize via `rebuildContent`: Properties panel commit, lifecycle service, frontmatter-icon service, deep-link writers, type-definitions view editor, meta-bind input widgets. A file written by an external producer and never touched through the UI keeps its bytes intact.

### Version pinning

The `yaml` dependency is pinned to exact `2.9.0` in `package.json` (no caret). Any future upgrade must be an explicit edit accompanied by a re-run of the canonical-form snapshot tests and a sync with the external Python generator. The 130 parity tests at `src/tests/lib/features/properties/yaml-quoting.logic.test.ts` catch drift.

## Alternatives considered

- **Use the predicate to actually emit, replacing yaml.Document**. Strictly safer but doubles the surface area: we would own both the predicate and the emitter and would have to keep the predicate in sync with itself across mapping and flow contexts, escape sequences, block scalars, etc. The current split (predicate documents + parity-tests yaml's behaviour, yaml emits) keeps the implementation small.
- **Sort keys alphabetically on write**. Considered briefly; rejected because deterministic order ranks alpha over semantic grouping (`type` -> `_organized` -> `_archived` -> `_favorite` -> `created` -> domain fields is the human-friendly order; alphabetisation would scatter system flags into the middle of domain fields).
- **Allow yaml's single-quote choice through**. Rejected for the Python generator side: Python emits double-quotes uniformly, and matching yaml's edge-case single-quote pick would force the generator to embed yaml-policy state. The Python side is the source of truth for these rare cases; if yaml emits `'foo'` and Python emits `"foo"`, the next UI touch re-canonicalises to whatever yaml picks.
- **Preserve YAML comments**. Not feasible with yaml@2.9.0 + `Document.toString` for our shape; would require a different library or a manual emitter.

## Consequences

- The Python generator at `koko.brain-os/vault/work/people/_generate.py` is rewritten in lockstep with this ADR to replicate these rules. Other external producers must do the same.
- The machine-readable spec at `docs/specs/frontmatter-canonical-form.md` is the consumable contract; this ADR is the rationale.
- Any future `yaml` upgrade is an intentional canonical-form change that must update the snapshot tests, the predicate, the spec, and the Python generator together.
- Nested mappings stay dropped (with a session-log breadcrumb). YAML comments stay dropped. Both are limitations callers must accept.

## Citation map

- Serializer entry: `src/lib/features/properties/properties.logic.ts:202` (`serializeProperties`).
- Frame wrapper: `:218` (`rebuildContent`).
- Predicate: `src/lib/features/properties/yaml-quoting.logic.ts` (`shouldQuoteScalar`, `canonicalizeScalar`).
- Parse-time alias resolution: `properties.logic.ts:135`.
- Write-time alias resolution: `properties.logic.ts:208`.
- Empty-value coercion: `properties.logic.ts:65-67`.
- Nested-object drop + warn: `properties.logic.ts:132-145`.
- Snapshot tests: `src/tests/lib/features/properties/properties.logic.test.ts` describe `canonical form snapshot (serializeProperties)`.
- Predicate + parity tests: `src/tests/lib/features/properties/yaml-quoting.logic.test.ts`.
- Pinned yaml version: `package.json:74`.
