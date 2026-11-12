---
summary: "Status bar widget showing word, character and reading-time counts for the active Markdown tab."
---

## Responsibility

Owns the word, character and reading-time figures in the status bar for the active Markdown editor tab. word-count.logic.ts holds the pure counting functions. WordCount.svelte reads the active tab from the editor store, debounces recounts by 500 ms and renders nothing unless the active tab is a non-virtual .md or .markdown file. It persists nothing and invokes no IPC. It does not own the word count stored in the vault index, which Rust computes separately.

## Key files

- `src/lib/plugins/word-count/word-count.logic.ts`: countWords and countCharacters (both strip YAML frontmatter first) and estimateReadingTime (200 words per minute, minimum 1).
- `src/lib/plugins/word-count/WordCount.svelte`: Status bar component: gates on the Markdown extension and isVirtualTab, debounces the recount in an $effect and renders the stats.

## State

- No persistent state. The component holds local $state for words, characters and readingTime.
- The active tab content is read from editorStore (owned by core/editor).

## Collaborators

- `src/lib/core/editor`: editorStore.activeTab supplies the text and isVirtualTab from editor.logic.ts excludes virtual tabs.
- `src/lib/app`: AppShell.svelte mounts WordCount inside the core StatusBar. It is the only importer.

## Gotchas

- The widget renders only when the active tab is non-virtual and its path ends in .md or .markdown.
- Recounts are debounced by 500 ms, so figures lag the editor by up to half a second. Before the first debounced run the display shows the initial state of 0 words, 0 characters and 1 min read.
- countCharacters returns the length of the frontmatter-stripped body including whitespace and newlines, so it is not a visible-character count.
- The frontend regex and the Rust compute_word_count in src-tauri/src/vault/entry.rs are independent implementations and can disagree on edge cases.
- AppShell.svelte mounts the widget directly, so it cannot be removed without editing the shell even though it lives under plugins/.
