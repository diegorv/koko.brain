# Svelte 5 & UI Patterns

Technical patterns and gotchas specific to this project's Svelte 5 + PaneForge stack.

## Store Pattern (Svelte 5 Runes)

Stores use `$state` in `.svelte.ts` files. They hold **only reactive state** — no business logic.

**Important: Use getters instead of `$derived` for computed values.** `$derived` values don't propagate synchronously in vitest — reads return stale values after mutations. Getters reading `$state` still track reactively in Svelte components because Svelte 5 tracks fine-grained reads through property accessors.

```typescript
// example.store.svelte.ts
let items = $state<string[]>([]);

export const exampleStore = {
  get items() { return items; },
  // CORRECT — computed as getter, works in both Svelte and vitest
  get count() { return items.length; },
  get isEmpty() { return items.length === 0; },
  setItems(v: string[]) { items = v; },
};

// WRONG — $derived doesn't update synchronously in vitest
// let count = $derived(items.length);
```

Services are functions that call Tauri APIs and update stores.

## `$effect` + `untrack()` Pattern

When an `$effect` calls service functions (like `initializeVault`), Svelte 5 tracks **all** reactive reads that happen synchronously inside those functions — not just the ones you intend as dependencies. This silently creates unwanted dependencies that can cause infinite re-execution loops.

**Rule:** Read the intended dependencies first, then wrap service calls in `untrack()`:

```typescript
// WRONG — initializeVault internally reads settingsStore, backlinksStore, etc.
// which become unintended dependencies → infinite loop
$effect(() => {
  if (vaultStore.isOpen && vaultStore.path) {
    initializeVault(vaultStore.path);
  }
});

// CORRECT — only vaultStore.isOpen and vaultStore.path are tracked
$effect(() => {
  const isOpen = vaultStore.isOpen;
  const path = vaultStore.path;
  untrack(() => {
    if (isOpen && path) {
      initializeVault(path);
    }
  });
});
```

## PaneForge Conditional Panes

**Never use PaneForge's collapsible API (`collapse()`/`expand()` via `PaneAPI`) with `$effect` to toggle pane visibility.** It causes either infinite loops (without `untrack()`, since `isCollapsed()`/`expand()` read and write the same reactive state) or missed reactivity (with `untrack()` wrapping the pane API ref).

**Rule:** Use `{#if}` to conditionally render `<Resizable.Handle />` + `<Resizable.Pane>` based on a settings flag:

```svelte
{#if settingsStore.layout.rightSidebarVisible}
  <Resizable.Handle />
  <Resizable.Pane defaultSize={25} minSize={15} maxSize={30}>
    <SidebarContent />
  </Resizable.Pane>
{/if}
```

**When multiple conditional panes exist in the same direction**, use nested `PaneGroup`s to isolate them. Otherwise, toggling one pane causes PaneForge to recalculate all siblings and breaks the others:

```svelte
<!-- Outer PaneGroup: isolates terminal from sidebar -->
<Resizable.PaneGroup direction="horizontal">
  <Resizable.Pane>
    <!-- Inner PaneGroup: file explorer + editor + sidebar -->
    <Resizable.PaneGroup direction="horizontal">
      <Resizable.Pane>...</Resizable.Pane>
      <Resizable.Handle />
      <Resizable.Pane>...</Resizable.Pane>
      {#if settingsStore.layout.rightSidebarVisible}
        <Resizable.Handle />
        <Resizable.Pane>...</Resizable.Pane>
      {/if}
    </Resizable.PaneGroup>
  </Resizable.Pane>
  {#if settingsStore.layout.terminalVisible}
    <Resizable.Handle />
    <Resizable.Pane>...</Resizable.Pane>
  {/if}
</Resizable.PaneGroup>
```

**Visibility defaults:** Store defaults for visibility flags (e.g., `rightSidebarVisible`, `terminalVisible`) should be `false`. This prevents flash-of-content on startup — the pane stays hidden until `loadSettings()` applies the user's saved preference.
