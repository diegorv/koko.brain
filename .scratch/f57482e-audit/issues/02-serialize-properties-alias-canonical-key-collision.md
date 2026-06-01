Status: ready-for-agent

# serializeProperties canonicalize-on-write collapses alias + canonical twin keys (silent data loss)

Severity: high. Found in the f57482e6 blast-radius audit.

## What to build

Commit f57482e6 made `serializeProperties` run `canonicalizeKey` on every key before
`doc.set`. `doc.set` is last-wins on duplicate keys.

Bug at `src/lib/features/properties/properties.logic.ts:219`:

```js
for (const p of properties) {
    const key = canonicalizeKey(p.key);   // alias and canonical twin map to same key
    ...
    doc.set(key, p.value);                // last write wins -> earlier value destroyed
}
```

If a `Property[]` holds both an alias (`color`, `icon`, `favorite`, `is_a`, ...) and its
canonical twin (`_color`, `_icon`, `_favorite`, `type`, ...), both collapse to the
canonical key and only the last survives.

Reachable trigger — `addNewProperty` dedupes on the LITERAL key, not canonical, at
`src/lib/features/properties/properties.service.ts:102`:

```js
if (propertiesStore.properties.some((p) => p.key === trimmed)) return false;
```

Flow: color picker writes `_color` -> user adds a property literally named `color` ->
guard checks literal `color`, finds only `_color`, ALLOWS it -> on save serialize
canonicalizes `color`->`_color`, collides -> emits `_color: ""`, real color gone. Same
class via the meta-bind bindTarget lookup (also keyed by raw key).

Verified: collision confirmed against yaml@2.9.0; guard gap at service.ts:102.
Regression nuance: pre-commit serialize emitted both keys, deferring loss to the next
parse round-trip; post-commit loss is immediate on first save. Root cause either way:
dedup guard compares literal, not canonical.

Fix direction: dedupe `addNewProperty` against `canonicalizeKey(p.key)`; apply the same
to the meta-bind existing-property lookup. Optionally have `serializeProperties` detect
colliding canonical keys and merge/throw instead of last-winning.

## Acceptance criteria

- [ ] Adding an alias-named property when the canonical twin exists is rejected (or merged), no data loss
- [ ] meta-bind alias write does not overwrite the canonical value
- [ ] Test: `serializeProperties([{key:'_color',...},{key:'color',...}])` outcome
- [ ] Test: `addNewProperty`-with-alias-name integration
- [ ] `pnpm check` + `pnpm vitest run` green

## Blocked by

None. Audit ruled OUT a save-loop from this change (open/save verbatim, serialize idempotent).

## Comments

- Resolved in commit 4a0831b. Canonicalized the dedup guards in addNewProperty +
  renameProperty; added a dedupeCanonicalKeys backstop to serializeProperties
  (populated value beats empty placeholder, two-populated keeps first + logs);
  extracted setPropertyByBindTarget (canonical-match, update-in-place) and routed
  all three meta-bind write sites through it. `pnpm check` + properties/meta-bind
  suites (209 tests across the touched files) green.
- Out of scope (cosmetic, not data loss): meta-bind currentValue *read* lookups
  (widgets.ts ~283, meta-bind-input-plugin.ts ~78) still match the raw bind
  target, so an alias-bound control may render a stale value. Worth a follow-up.
