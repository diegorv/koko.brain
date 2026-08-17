# Issue 08: Wire the six dead inline decorator toggles

Status: ready-for-agent
Phase: P1.1 (conflict C01)
Source: arch 1.1 plumbing slice; supersedes PONY #64 (dropped) — plan-2026-08-12.md §Conflicts resolved (C01) and §P1 — Conflict decisions that unblock everything
Blocked by: none

## What

Six Troubleshooting decorator kill-switches are dead UI: toggling them disables nothing, because the inline extension assembly ignores `disabledDecorators`. Goal: the user can isolate a misbehaving live-preview feature from the Troubleshooting pane, and all 12 documented toggle names become true.

## How

- Ship `inlineExtensions(disabledDecorators)` plumbing: a name to handlers table plus two array filters, roughly 15 lines. Call it from `live-preview.ts:64`.
- Every one of the six "dead" names already maps onto handlers in the registry at `inline-extensions.ts:25-47,57`. Filter those registries; keep `metaBindInput` wired.
- One small commit, with a test asserting a disabled name removes its handler and leaves the others intact.
- C01 resolution rationale (record it in the commit message): WIRE wins over delete. CLAUDE.md:241, the ADR-0008 Consequences bullet, and the open freeze hunt (`tasks/todo/audit-vault-and-freeze.md:9-10`, candidate causes a/e are inline-handler paths) all depend on inline isolation. After the wire, all 12 names in `help/documentation/19-settings.md:245` are true, so #64's "mandatory doc edit" inverts into "no doc edit needed", and #64 is DROPPED as refuted by construction.
- Keep #64's two corrections: stale persisted keys are harmless via `settings.service.ts:143-146`; a pre-wire toggle silently becomes honored. State that in one line of the commit message.
- This plumbing is deliberately split out of arch 1.1 because it is NOT gated on the freeze investigation. Do not pull the fold in.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

2026-08-17 (agent): Done.

- Red-green: new tests written first against the unmodified code — 11 failed for the right reasons (`productionHandlers` not a function, i.e. the plumbing did not exist, and `inlineExtensions({ markdownStyle: true })` returned 2 entries, i.e. the argument was ignored — the exact bug). Green after the fix.
- Mapping verified against the legacy per-plugin toggles deleted in 4696d4c (not just the commit message — the legacy plugin sources): `heading`→headingHandlers (8 node types), `blockquote`→blockquoteHandler, `simpleWidget`→simpleWidgetHandlers, `link`→linkHandler+linkReferenceHandler+autolinkHandler+extendedAutolinkHandler+wikilinkHandler (legacy linkPlugin covered markdown links, autolinks, extended autolinks, wikilinks), `inlineMarks`→markHandlers+escapeHandler, `markdownStyle`→highlightHandler + dropping inlineHighlightExtension (legacy markdownStylePlugin = content styles + highlight background). inlineComment/blockReference handlers stay always-on, as in legacy.
- Adversarial review (presumed-flawed stance): could not refute correctness or parity; verified set-identity filtering, no other `inlineExtensions()` call sites, name/type parity with `DECORATOR_NAMES`, and that stale persisted keys are no-ops. Two findings, both remediated: (MEDIUM) the wiring line in live-preview.ts was untestable-by-revert → added 2 DOM tests in pipeline-dom.test.ts going real settingsStore → livePreviewExtensions() → class assertions, proven red with the wiring line temporarily reverted (mutation check: exactly those 2 fail); (LOW) count-only markdownStyle test → the `cm-formatting-inline` pin proves the surviving extension is the formatting plugin. Delta re-review: could not refute, no objection to commit.
- Gate: `pnpm check` 0 errors, `pnpm vitest run` 6716 passed, `pnpm build` OK.
