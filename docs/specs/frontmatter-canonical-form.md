# Frontmatter Canonical Form Spec (machine-readable)

This file is the contract any external producer of Kokobrain frontmatter must implement. The rationale, alternatives, and citation map live in [ADR 0029](../adr/0029-frontmatter-yaml-canonical-form.md). This file is the consumable spec.

The canonical form is what `serializeProperties` at `src/lib/features/properties/properties.logic.ts:202` emits when fed a `Property[]`. Producers that match this form keep the "re-run = zero diff" idempotence guarantee. Producers that diverge will see their files silently rewritten on the first UI mutation.

## Producer checklist

1. Apply `aliases` map to every input key BEFORE emitting.
2. For each key/value, decide bare vs double-quoted via the predicate below.
3. Emit empty values as `key: ""`.
4. Emit lists as flow style `key: [a, b, c]`, comma+space separator, no inner padding, items requoted in flow-item context.
5. Preserve input key order. No sort.
6. Drop nested mapping values. Warn / log.
7. Wrap the block as `---\n…\n---\n${body}`. LF line endings only. No BOM. Strip trailing whitespace from each emitted line.
8. UTF-8.

## Rules (JSON)

The block below is normative. Drop into a JSON parser and consume directly.

```json
{
  "yamlLibraryVersion": "2.9.0",
  "encoding": "utf-8",
  "lineEnding": "\n",
  "bom": false,
  "framing": {
    "open": "---\n",
    "close": "\n---\n"
  },
  "yamlOptions": {
    "lineWidth": 0,
    "flowCollectionPadding": false
  },
  "aliases": {
    "is_a": "type",
    "is a": "type",
    "organized": "_organized",
    "archived": "_archived",
    "favorite": "_favorite",
    "order": "_order",
    "favorite_index": "_favorite_index",
    "sort": "_sort",
    "icon": "_icon",
    "sidebar_label": "_sidebar_label",
    "sidebar label": "_sidebar_label",
    "color": "_color",
    "title_color": "_title_color",
    "template": "_template",
    "view": "_view",
    "visible": "_visible",
    "list_properties_display": "_list_properties_display"
  },
  "keyOrder": "preserve-input",
  "scalar": {
    "quoteStyle": "double",
    "emptyValue": "\"\"",
    "mustQuoteIf": {
      "isEmpty": true,
      "leadingChars": ["[", "]", "{", "}", "!", "&", "*", ">", "|", "@", "`", "'", "\"", "#", "%", ","],
      "leadingIndicatorPlusSpace": ["? ", "?\t", "- ", "-\t"],
      "loneTilde": true,
      "leadingWhitespace": [" ", "\t"],
      "trailingWhitespaceOrColon": [" ", "\t", ":"],
      "substringsAnywhere": [": ", ":\t", " #", "\t#"],
      "reservedLiterals": ["true", "false", "null", "Null", "NULL", "True", "False", "TRUE", "FALSE", "~"],
      "numericLikeRegex": "^[-+]?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][-+]?[0-9]+)?$|^[-+]?\\.(?:inf|nan)$|^[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?$|^0x[0-9a-fA-F]+$|^0o[0-7]+$",
      "controlCharsRegex": "[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]",
      "newline": true
    },
    "bareAlwaysAllowedFor": {
      "midStringColonNoSpace": "URN-style values like urn:example:identity:uuid:abc stay bare",
      "midStringAt": "Emails like foo@bar.com stay bare; only leading @ quotes",
      "trailingAt": "foo@ stays bare",
      "isoDateLikeRegex": "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})?)?$",
      "informalBools": ["yes", "no", "on", "off", "Yes", "No", "Off", "On"],
      "midStringTab": "Tabs mid-string do not quote",
      "midOrTrailingPercent": "100% and foo%bar stay bare; only leading % quotes",
      "indicatorWithoutSpace": "?nospace and -nospace stay bare",
      "tildeNotAlone": "~tilde and foo~ stay bare; only lone ~ quotes"
    },
    "quoteEscaping": {
      "double": {
        "backslash": "\\\\",
        "doubleQuote": "\\\"",
        "note": "Producers should always emit double-quoted form. yaml@2.9.0 sometimes picks single-quotes (for values containing \" but no '); producers that always emit double-quotes will diverge only on values that contain a literal \", which do not appear in normal vault frontmatter (wikilinks, URNs, emails carry none)."
      }
    }
  },
  "flowItem": {
    "additionalMustQuoteSubstrings": [","],
    "note": "Inside [a, b], any comma forces quoting because comma is the flow-sequence separator. So foo,bar quotes in flow context but stays bare in mapping context."
  },
  "list": {
    "style": "flow",
    "open": "[",
    "close": "]",
    "separator": ", ",
    "innerPadding": false,
    "empty": "[]",
    "itemCoercion": "string",
    "itemQuotingContext": "flow-item"
  },
  "nestedMappings": {
    "behavior": "drop",
    "warn": true,
    "warnTag": "PROPERTIES"
  },
  "yamlComments": {
    "behavior": "drop",
    "reason": "yaml@2.9.0 with our options does not round-trip comments through Document.toString"
  },
  "triggerWindow": "ui-mutation-only",
  "openNormalizes": false,
  "saveNormalizes": false
}
```

## Predicate pseudocode (mapping-value context)

```
function shouldQuote(value):
    if value == "":                                       return true
    if value in RESERVED_LITERALS:                        return true
    if matches NUMERIC_LIKE_REGEX:                        return true
    if matches ISO_DATE_LIKE_REGEX:                       return false
    if value[0] in MUST_QUOTE_LEADING_CHARS:              return true
    if (value[0] == '?' or value[0] == '-')
        and len(value) > 1
        and value[1] in (' ', '\t'):                      return true
    if value[0] == '~' and len(value) == 1:               return true
    if value[0] in (' ', '\t'):                           return true
    if value[-1] in (' ', '\t', ':'):                     return true
    for sub in [': ', ':\t', ' #', '\t#']:
        if sub in value:                                  return true
    if matches CONTROL_CHAR_REGEX:                        return true
    if '\n' in value or '\r' in value:                    return true
    return false
```

For flow-item context: add `if ',' in value: return true` at the end (before the final `return false`).

## Worked examples

| Input value (string) | Mapping emit | Flow-item emit |
| --- | --- | --- |
| `foo@bar.com` | `foo@bar.com` | `foo@bar.com` |
| `urn:example:identity:uuid:abc` | `urn:example:identity:uuid:abc` | `urn:example:identity:uuid:abc` |
| `[[Foo-Bar]]` | `"[[Foo-Bar]]"` | `"[[Foo-Bar]]"` |
| `` `` (empty) | `""` | `""` |
| `42` (string) | `"42"` | `"42"` |
| `42` (number) | `42` | `42` |
| `true` (string) | `"true"` | `"true"` |
| `true` (boolean) | `true` | `true` |
| `2026-05-31` | `2026-05-31` | `2026-05-31` |
| `yes` | `yes` | `yes` |
| `foo: bar` | `"foo: bar"` | `"foo: bar"` |
| `foo, bar` | `foo, bar` | `"foo, bar"` |
| `foo,bar` | `foo,bar` | `"foo,bar"` |
| `100%` | `100%` | `100%` |
| `~tilde` | `~tilde` | `~tilde` |
| `~` | `"~"` | `"~"` |

## Realistic person-note snapshot

```
---
type: person
_organized: "true"
_archived: "false"
created: 2026-05-31
name: Jane Doe
email: jane.doe@example.com
ident_id: urn:example:identity:uuid:00000000-0000-0000-0000-000000000000
end_at: ""
expire_at: ""
_belongs_to: "[[Some-Team]]"
_reports_to: "[[John-Smith]]"
---
```

This is the exact expected output of `serializeProperties` for the corresponding `Property[]` and is pinned as a snapshot test in `src/tests/lib/features/properties/properties.logic.test.ts` (`canonical form snapshot` describe block, last case).
