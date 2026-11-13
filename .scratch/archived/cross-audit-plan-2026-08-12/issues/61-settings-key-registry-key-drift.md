# Issue 61: `settingsKey` is a write-only field, so the block-decorator registry has no drift guard

Status: ready-for-agent
Phase: P5 (follow-up)
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage
Blocked by: none

## What

### The claim, and what survives verification

Claim as reported: "a block decorator's `settingsKey` can drift from the key it is registered under,
silently breaking its Troubleshooting kill-switch."

**The harm half is refuted. The drift half is confirmed but is not the one that hurts.**

Causal chain, by file:symbol:

1. `live-preview/core/block-decorator.ts::blockDecorator` opens with
   `const { profileLabel, compute, rebuildOn, gate } = spec;`. **`settingsKey` is not destructured
   and is never read anywhere in the function body.** `grep -rn settingsKey src/` returns four kinds
   of hit: the type declaration in `BlockDecoratorSpec`, one literal per plugin module, the
   placeholder in `core/block-decorator.test.ts::mount`, and a doc comment above `BlockDecoratorName`
   in `core/decorator-names.ts`. **No code reads the field.**
2. `live-preview/live-preview.ts::livePreviewExtensions` gates decorators by looping
   `BLOCK_DECORATOR_NAMES` and pushing `BLOCK_EXTENSIONS[name]` when `isDisabled(name)` is false.
   The gate reads the **record key**, never the spec field.
3. `settings/sections/TroubleshootingSection.svelte` renders one switch per `DECORATOR_NAMES` entry
   and writes `settingsStore.toggleDecorator(name, ...)` into `disabledDecorators`. Also key-only.

So a decorator whose `settingsKey` disagrees with its `BLOCK_EXTENSIONS` key still has a fully
working kill-switch. The field is documentation that the compiler spell-checks (the closed
`BlockDecoratorName` union makes it typo-proof) and nothing else. Commit 98b07714's message asserts
the field is "now load-bearing and typo-proof" - the second adjective is true, the first is not, and
that sentence is the likely origin of the reviewer's claim.

### There is no drift today

Full inventory, verified by reading every plugin module and `BLOCK_EXTENSIONS`. Twelve names in
`core/decorator-names.ts::BLOCK_DECORATOR_NAMES`, eleven factory products plus the documented
exception:

| `BLOCK_EXTENSIONS` key | extension value | module | its `settingsKey` | agrees |
| --- | --- | --- | --- | --- |
| `frontmatter` | `[frontmatterField, frontmatterGutter]` | `plugins/frontmatter-field.ts` | none (hand-written `StateField`, not a `blockDecorator` product) | n/a |
| `codeBlock` | `codeBlockField` | `plugins/code-block-field.ts` | `codeBlock` | yes |
| `blockComment` | `blockCommentField` | `plugins/block-comment-field.ts` | `blockComment` | yes |
| `table` | `tableField` | `plugins/table-field.ts` | `table` | yes |
| `callout` | `calloutField` | `plugins/callout-field.ts` | `callout` | yes |
| `collectionBlock` | `collectionBlockField` | `plugins/collection-block-field.ts` | `collectionBlock` | yes |
| `queryjs` | `queryjsBlockField` | `plugins/queryjs-block-field.ts` | `queryjs` | yes |
| `metaBindButton` | `metaBindButtonField` | `plugins/meta-bind-button-field.ts` | `metaBindButton` | yes |
| `mermaid` | `mermaidField` | `plugins/mermaid-field.ts` | `mermaid` | yes |
| `blockMath` | `blockMathField` | `plugins/block-math-field.ts` | `blockMath` | yes |
| `audio` | `audioPlugin` | `plugins/audio-plugin.ts` | `audio` | yes |
| `video` | `videoPlugin` | `plugins/video-plugin.ts` | `video` | yes |

Inline side, checked as instructed: `INLINE_PLUGIN_EXTENSIONS` in `live-preview.ts` maps
`image`/`footnote`/`wikilinkEmbed`/`metaBindInput` onto `imagePlugin`/`footnotePlugin`/
`wikilinkEmbedPlugin`/`metaBindInputPlugin`, all four correct; and
`inline/inline-extensions.ts::TOGGLEABLE_HANDLERS` keys handler groups directly with no
`settingsKey` indirection at all, so the inline pipeline has no equivalent drift surface.
`frontmatter` behaves exactly as the root CLAUDE.md describes: no factory, no `settingsKey`, still
wired in `BLOCK_EXTENSIONS`.

### The hole that is real

`BLOCK_EXTENSIONS` is a total `Record<BlockDecoratorName, Extension>`, so a **missing** name fails
`pnpm check`. Nothing checks the **value**. Writing `audio: videoPlugin` and `video: audioPlugin`
type-checks (both are `Extension`) and ships a genuinely broken pair of kill-switches: the
Troubleshooting "audio" switch removes video previews and leaves audio previews alive. That is the
user-visible defect the claim was groping at, and the only independent source of truth in the repo
that could catch it is the very `settingsKey` field that nothing reads.

The existing test cannot catch it. `src/tests/.../live-preview/decorator-toggles.test.ts` asserts
`installedCount(livePreviewExtensions())` is `toBeLessThan(baseline)` after each toggle - a
count-only probe. A swapped pair still removes exactly one extension per toggle, so the suite stays
green. No other test imports `BLOCK_EXTENSIONS` (it is module-private today).

### Repro path

None exists at HEAD, and the issue says so plainly: every entry agrees, so no user can reach a
broken kill-switch. This is a guard issue, not a fix issue. It still matters because ADR-0008 tells
the next contributor that adding a block construct means "a `blockDecorator({ settingsKey, ... })`
spec, a name in `BLOCK_DECORATOR_NAMES`, and the matching entry in `BLOCK_EXTENSIONS`", and
promises "a half-finished registration fails `pnpm check`". A *mis-finished* one does not.

## How

Make `settingsKey` load-bearing. Do not delete it: it is the only per-module statement of "which
switch owns me", and deleting it forfeits the one thing that can close the value hole.

**Preferred, zero-runtime-cost: a phantom type brand.**

- `live-preview/core/block-decorator.ts::blockDecorator` becomes generic over its key and returns a
  branded type:

	```ts
	export function blockDecorator<N extends BlockDecoratorName>(
		spec: Omit<BlockDecoratorSpec, 'settingsKey'> & { settingsKey: N },
	): ViewPlugin<BlockDecoratorValue> & { readonly __settingsKey?: N } {
	```

	The body is unchanged; the return value is the same `ViewPlugin.fromClass(...)`, cast once at the
	`return`. `__settingsKey` is optional and never assigned, so nothing exists at runtime.
- `live-preview/live-preview.ts::BLOCK_EXTENSIONS` narrows its annotation to a mapped type that
  pins each slot to its own key:

	```ts
	type BlockRegistry = { [N in BlockDecoratorName]: Extension & { readonly __settingsKey?: N } };
	```

	`frontmatter`'s `[frontmatterField, frontmatterGutter]` still satisfies its slot because the brand
	is optional and those two values carry no brand at all.
- **Fallback if the brand does not compile** (for instance if `Extension`'s union shape defeats the
  intersection): switch to the runtime form instead - `blockDecorator` does
  `return Object.assign(plugin, { settingsKey });`, `BLOCK_EXTENSIONS` gains an `export`, and the new
  assertion below reads the property. Pick whichever compiles; this is a mechanical choice, not a
  design one. Do not ship both.

**Red-first strategy.**

- The brand variant is not vitest-observable, so the red proof is a compile failure, not a failing
  test: temporarily swap the `audio` and `video` entries in `BLOCK_EXTENSIONS`, run `pnpm check`,
  confirm it reports the mismatch on both slots, then revert the swap. Record that transcript in the
  closing `## Comments`. A green `pnpm check` on the swapped tree means the brand is not biting and
  the fallback is required.
- **Test-gate resolution for the brand variant.** It produces a source-only commit with no test-file
  diff, which collides head-on with Quick Reference rule 11 and `docs/TESTING.md` Task Completion
  Gate. Do not invent a test to satisfy the letter of the rule: the brand is deliberately not
  vitest-observable. The gate is met by the recorded red/green `pnpm check` transcript plus
  `core/block-decorator.test.ts`, which is unchanged but is recompiled against the new generic
  signature (its `settingsKey: 'table'` placeholder is exactly what exercises it). Say this in the
  commit message so a reviewer does not read the absent test diff as an oversight.
- If the fallback is taken, add one case to `decorator-toggles.test.ts`:
  `it.each(BLOCK_DECORATOR_NAMES.filter((n) => n !== 'frontmatter'))` asserting
  `(BLOCK_EXTENSIONS[name] as { settingsKey?: string }).settingsKey === name`. Prove it red with the
  same audio/video swap before reverting.
- **Side channels that could fake a green.** (1) Asserting anything derived from `BLOCK_EXTENSIONS`
  alone is vacuous - a test written against the registry cannot detect that the registry holds the
  wrong value; the assertion must compare the registry key against the plugin module's own
  `settingsKey`. (2) Do not key the assertion on `profileLabel`: it deliberately diverges
  (`queryjs` vs `queryjs-block`, `codeBlock` vs `code-block`, `blockComment` vs `block-comment`), so
  a `profileLabel`-based probe would fail on correct code. (3) The existing count-only
  `toBeLessThan(baseline)` case must stay as-is and is not evidence of anything here; do not
  "strengthen" it into an identity diff, because `inlineExtensions()` allocates fresh plugin objects
  on every call and a naive set-difference over leaves reports those as removed.
- `decorator-toggles.test.ts` already carries `// @vitest-environment jsdom`; keep it.

**Must NOT change.**

- The twelve strings in `BLOCK_DECORATOR_NAMES`, or any name in `INLINE_PLUGIN_NAMES` /
  `INLINE_HANDLER_NAMES`. They are persisted user data in `settings.json -> disabledDecorators`;
  renaming one orphans every saved toggle.
- The install order of `BLOCK_DECORATOR_NAMES` - extension order is precedence order.
- `frontmatter`'s exception: it stays a hand-written `StateField` with no `settingsKey` and no
  viewport guard. Do not convert it to a `blockDecorator` product on the way past.
- `core/decorator-names.ts` must keep importing nothing (it is imported by
  `TroubleshootingSection.svelte`; pulling in the registry drags katex, mermaid and DOMPurify into
  the settings chunk).
- The inline side. `TOGGLEABLE_HANDLERS` and `productionHandlers` are already key-direct and need no
  brand.
- `blockDecorator`'s runtime behaviour: the perf-rule-4 viewport guard, the `gate`, the `rebuildOn`
  forced-rebuild branch and the `profileStart`/`profileEnd` wrapper are untouched.

**Documentation.** Root `CLAUDE.md` live-preview perf rule 4 says the `settingsKey` +
`BLOCK_EXTENSIONS` pair "is what gives the decorator its kill-switch". That sentence is false today
and becomes true only with this change; leave it alone if the change lands, correct it if this issue
is closed unfixed. `docs/adr/0008-codemirror-live-preview-architecture.md` makes the same claim in
its "adding a block construct" paragraph and may gain one clause noting that the pairing is now
enforced.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.

`pnpm check` is the load-bearing one here - it *is* the guard in the preferred variant, so the red
proof (swapped audio/video entries) and the green proof are both `pnpm check` runs. Stage only this
change's files (`git add <specific files>`), verify with `git diff --cached --stat`, and land one
commit in the full format (Context, Problem, Solution, Behavior, Files with line ranges) carrying
the source change, any test collateral, and the closing `## Comments` entry.

## Comments

### 2026-08-19 - triage revision after adversarial review

Three findings applied. Verdict unchanged: partially-confirmed, low, ready-for-agent.

- The grep claim was falsifiable as written. `grep -rn settingsKey src/` has a fourth kind of hit,
  the doc comment above `BlockDecoratorName` in `core/decorator-names.ts`. Restated as four kinds,
  with the operative conclusion sharpened to "no code reads the field".
- Added the test-gate resolution for the preferred brand variant, which produces a source-only
  commit and would otherwise collide with Quick Reference rule 11: the gate is met by the recorded
  red/green `pnpm check` transcript plus the unchanged-but-recompiled `block-decorator.test.ts`,
  and the commit message must say so.
- Style: 6 em-dashes replaced.

Metadata note for the orchestrator: the fix's file list must include this issue file, because the
Gate lands the closing `## Comments` entry in the fix commit.
