# 04: `ctx.ui.pick`

**What to build:** the plan's EP-04. A fuzzy list dialog in the existing dialog queue, added to contract v1.

```ts
pick: <T extends { id: string; title: string; description?: string }>(o: { title: string; placeholder?: string; items: T[] }) => Promise<T | null>;
```

Touch the contract's `ModUiV1`, `plugins/mods/mod-dialogs.store.svelte.ts` (`CANCELLED` needs `pick: null`), the host's `ui` block and `ModDialogHost.svelte` (a branch on `components/ui/command`). Filter all items and render at most 100. Reject duplicate ids. No mod code runs per keystroke.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first: 1000 items render at most 100 and the filter reaches item 900; Esc and unload give `null`; the mod's own object returns; duplicate ids reject.
- [ ] `mod-api-contract.test.ts` freezes the new member. `help/documentation/28-mods.md` documents it.
