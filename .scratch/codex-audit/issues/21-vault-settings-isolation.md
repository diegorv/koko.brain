# 21: Keep settings isolated when vault initialization is superseded

**What to build:** Superseded vault initialization cannot publish obsolete settings or start persistence against the wrong vault.

**Blocked by:** none
**Files:** src/lib/app/lifecycle/app-lifecycle.service.ts, src/lib/core/settings/settings.service.ts, src/lib/core/settings/settings.store.svelte.ts, src/lib/core/settings/settings-persistence.svelte.ts, src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts, src/tests/lib/core/settings/settings.service.test.ts, src/tests/lib/core/settings/settings-persistence.test.ts, src/tests/lib/core/settings/
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with real initialization, settings loading, and persistence.

## Acceptance criteria

- [ ] Delay A's settings read, finish B initialization, then release A: neither B's store nor its settings file receives A's settings.
- [ ] Delay monitoring configuration after A's load, initialize B, then release A: A's persistence cannot write B's settings into A.
- [ ] Superseded loads cannot apply obsolete appearance or establish an obsolete persistence session.
- [ ] Cover missing, blank, unreadable, and malformed settings, including delayed backup/write-back.
- [ ] Retain existing protections for unreadable files and failed backups.
- [ ] Ordinary load, edit, switch, and exit persistence remains functional.
- [ ] Use real loaders, stores, persistence effects, and initialization with controlled external I/O; assert serialized destination/content in both corruption directions.
- [ ] Do not assume an in-app vault picker is required: external deep links already provide the overlapping initialization path.

## Provenance

Supersedes the settings section of [open-itens 105](../../open-itens/issues/105-minor-write-races-are-closed-autosave-during.md). The original post-monitoring gap and newly reproduced stale-loader direction both belong here. Remaining 105 claims are tracked in [deferred findings](../deferred.md). [Evidence](../evidence.md#vault-settings).

## Comments
