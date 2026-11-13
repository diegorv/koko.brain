# 03: QueryJS results dropped on every save

**Origin:** brain-os-vault (`diegorv/koko.brain-os`) `.scratch/vault-organization-v2/issues/05-queryjs-results-dropped-on-every-save.md`, moved here on 2026-11-13. The vault layout it serves is `docs/vault-organization.md` in that repo.

**What to build:** Step 0 (vault, no code): set `queryjs.autoRunQueries: "always"` in the live settings and check whether chart-heavy periodic notes stay fast. If not: invalidate only blocks whose inputs changed, or re-run blocks that were already on screen, or allow a per-block auto-run override.

**Blocked by:** none

**Status:** needs-info

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, reproducing the problem; it passes after the change.
- [ ] Returning to a hub after editing another note shows its list without a click, with no visible slowdown elsewhere.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Problem

Every save anywhere clears every cached QueryJS result. Under the default `first-open` policy a hub that already ran shows a **Run** button instead of its list when it is re-mounted, so "open Person, write the 1:1, come back" costs a click and the hub looks empty.

## Evidence

- `src/lib/core/filesystem/note-change.service.ts:154-162` (`clearResults()` on save).
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:32-34,60-68,136-153`; `queryjs-session.store.svelte.ts:115-125`.
- `.kokobrain/settings.json` `queryjs.autoRunQueries` is `first-open`.

## Comments

- 2026-11-13, triage: needs-info. First try `queryjs.autoRunQueries: "always"` in the live settings of the work machine and report whether hubs and chart-heavy notes behave. App work only if that fails.
