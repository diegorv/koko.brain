# 29: Meta-bind toggle, number and select write quoted strings

**Status:** resolved

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: fidelity-3

**How a user hits it.** Default settings. Any note using INPUT[toggle():archived], the documented example in help/documentation/24-meta-bind.md, or number() inputs. Happens on every interaction.

**Recoverable from.** The value is still present in the note. The user can retype it unquoted by hand.

**Root cause.** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:863 (toggle commits 'true'/'false' strings). The number input commits input.value. src/lib/core/frontmatter/properties.logic.ts:597-609 setPropertyByBindTarget stores the string.

**Evidence.** The serializer quotes the strings as "true" and "7". lifecycle.logic.ts:9 checks === true. Rust entry.rs:246-251 and :373-378 use as_bool(), and parsing.rs:809 projects a quoted scalar as a String, so organized falls back to unwrap_or(true). The existing meta-bind-writers.test.ts pins done: "true" and count: "7".

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/meta-bind-value-types.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: ---\n_archived: "true"\n---\n...: expected 'inbox' to be 'archived'. Also: expected { key: 'count', value: '7', type: 'text' } to deeply equal { key: 'count', value: 7, type: 'number' }
```

**Fix sketch.** Toggle passes a boolean. Number passes Number(value), with an empty string clearing the key. Widen setPropertyByBindTarget's value type and set type to match.

## Notes

- E2E: `e2e/specs/live-preview/click-reveal/meta-bind-toggle.spec.ts` "the checkbox zone: click writes flag as a YAML boolean" reproduces the toggle half in the browser and carries `test.fail()`; remove the marker when this is fixed. The click itself works (no reveal). Found by the live-preview click-reveal coverage push, 2026-11-03.

## Comments

- 2026-11-06: closed by audit 2026-11-05 at `5f8003d67` (resolved): Fixed by 575b84f2f ('fix: meta-bind writes typed values and reads alias keys'). The toggle passes cb.checked (widgets.ts:990), number uses Number() (:1063-1067), and select uses typedOptionValue (:784).
