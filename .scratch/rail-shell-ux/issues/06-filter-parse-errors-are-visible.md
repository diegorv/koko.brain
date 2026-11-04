# 06: A filter that does not parse shows an error instead of an empty (or full) list

**What to build:** A filter expression that fails to parse (`status = 'active'` with a single `=`, an unclosed quote, an unknown function) is reported, not evaluated as false. The collection editor, the inline collection block and the note list's view lens show a short error naming the bad expression; the filter row in the toolbar marks its input as invalid while the text does not parse. A parse failure inside a NOT group no longer turns into "every note matches". Two smaller cases in the same area: a formula with a parse error or an empty name cannot be confirmed, and an unknown view `type` is a parse error naming the three accepted values.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a `.view` whose filter is `status = 'active'` yields a query result that carries a filter error, not an empty row set (logic test, real parser and evaluator)
- [ ] The same expression inside `not:` yields the error too, not every record (logic test)
- [ ] `FilterRow` marks the input invalid (`aria-invalid` and a message) while the typed text does not parse, and stops marking it once it does (component test)
- [ ] The collection editor and the inline block show the error text; the rail's view lens result carries the error, which Issue 10 renders (component tests for the editor and the block; logic test for the lens result)
- [ ] `FormulaRow`: Check is disabled while the formula does not parse or the name is blank, and the error stays visible (component test)
- [ ] A view with `type: tabel` fails to parse with a message listing `table`, `calendar`, `linear-calendar`; a view with no `type` keeps today's behaviour, and help 12 says which (logic test plus help line)

## Notes

- **Cause (traced):** filter strings are parsed at evaluation time and a parse failure returns `false` (`features/collection/collection.logic.ts:199-255`); a NOT around it inverts that to `true`. `yaml-parser.ts:95-96` keeps filter strings unvalidated; `FilterRow.svelte:91` writes every keystroke. Formula: `toolbar/FormulaRow.svelte:34-58`, `formula.logic.ts:31-41,80-91`. View type: `yaml-parser.ts:47-49`, `help/documentation/12-collection.md:35`.
- **Main-session decision:** an expression that does not parse makes the whole query report the error (no partial result), so a typo never looks like "no data".
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F66, F89, F91.
- **Size:** S.

## Comments
