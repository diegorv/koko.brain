---
summary: "Bottom status bar shell with left and right slots, and the Saved or Modified indicator for the active tab."
---

## Responsibility

Owns the chrome of the bottom status bar: a full-width row with a left and a right group filled through Svelte snippets, with separators drawn between adjacent items (StatusBar.svelte). Also owns SaveStatus.svelte, which shows Modified or Saved for the active editor tab. It does not own the items shown in the bar (search, semantic index, Todoist sync, word count), which AppShell mounts into the slots, and it does not own the colour and height tokens defined in src/app.css and the theme files. It has no IPC.

## Key files

- `src/lib/core/status-bar/StatusBar.svelte`: Layout shell rendering the left and right snippets and the separators.
- `src/lib/core/status-bar/SaveStatus.svelte`: Derives modified, saved or nothing from the active editor tab.
- `src/lib/app/AppShell.svelte`: Only consumer: mounts StatusBar and fills its slots.
- `src/app.css`: Defines the status bar height and colour tokens.

## Collaborators

- `src/lib/app`: AppShell.svelte mounts StatusBar and SaveStatus; SettingsPanel.svelte uses the bar height token.
- `src/lib/core/editor`: SaveStatus reads editorStore.activeTab and uses isTabDirty and isVirtualTab.
- `src/lib/core/settings`: The theme types declare the status bar colour fields that feed the bar's CSS tokens.
- `src/lib/plugins`: The word-count item is mounted into the bar and uses the bar's foreground token.

## Gotchas

- StatusBar.svelte exposes a data-status-bar attribute on its root and a status-bar-group class on both groups. An e2e spec, the AppShell test and the status-chip example in the mods help tests depend on these hooks.
- StatusBar has no knowledge of what it shows. Adding an item means editing AppShell, not this folder.
- The separator is drawn with a global pseudo-element rule on every direct child of a group except the first.
- SaveStatus renders nothing when there is no active tab or the tab is virtual, and reflects in-memory dirty state only.
- Bar height and colours come from CSS tokens in src/app.css. Changing the look means changing the tokens.
