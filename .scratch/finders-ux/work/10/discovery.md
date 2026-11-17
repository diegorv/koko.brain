# 10 discovery: Tags rows align, chevron and colour controls have names, Tags tab icon

No `spec.md` in `.scratch/finders-ux/` (same as 08 and 09); the Issue and `research/verdict-tags.md` (T2, T3) are the spec.

## Files that change

- `src/lib/features/tags/TagItem.svelte:30`: chevron `Collapsible.Trigger` gains `w-5 justify-center` (p-1 + size-3 is already 20px; the class makes the width explicit and shared with the leaf slot), plus static `aria-label` and `title` "Subtags of {node.fullPath}". bits-ui keeps emitting `aria-expanded`.
- `TagItem.svelte:33,57`: both `TagColorPicker` calls pass `label="Color of {node.fullPath}"`.
- `TagItem.svelte:56-70`: the leaf row takes the parent row's structure: outer `flex items-center`, a `<span class="w-5 shrink-0" aria-hidden="true">` slot, the picker, then a name button with the parent's exact classes (`px-1 py-1`, own `hover:bg-accent`). Name at 20+16+4 = 40px in both rows; count 4px from the right edge in both.
- `src/lib/features/tags/TagColorPicker.svelte:8-17,32`: required `label: string` prop, applied to `Popover.Trigger` as `aria-label` and `title`. Swatches untouched.
- `src/lib/core/markdown-editor/EditorTabs.svelte:2-9,69-83`: import `@lucide/svelte/icons/tag`, add `{:else if tab.fileType === 'tags'}` with `<Tag class="size-3.5 shrink-0 text-muted-foreground" />` before the `tabIcon` branch.

## Tests (test-first)

- New `src/tests/lib/features/tags/TagItem.test.ts` (jsdom, real `settingsStore`, `setupLocalStorage` as in `TagsView.test.ts:4-6`, mount/flushSync pattern from `TagsView.test.ts:27-52`). Mount a parent (`work` with child `work/project`) and a leaf (`home`) into one container.
  - Row order: leading element, dot trigger, name button. Leading element of both rows carries `w-5` and `shrink-0`; name buttons share the same className; name and count spans share classes.
  - Chevron: accessible name (`aria-label`) contains `work`; `aria-expanded` "false" then "true" after click; label unchanged.
  - Every dot trigger has `aria-label` containing its `fullPath` (parent, leaf and, once expanded, the child).
- `EditorTabs.test.ts`: new describe. A `fileType: 'tags'` tab at `TAGS_VIRTUAL_PATH` renders an svg with class `lucide-tag` and no `lucide-file-text`; a markdown tab still renders `lucide-file-text` without `tabIcon`, and the snippet's output with one (snippet via `createRawSnippet`).
- `TagsView.test.ts:55-61` (tag click opens Search with `tag:work`) runs unchanged.

## Defaults taken

- The leaf hover background moves from the whole row to the name button, as on parents; identical name classes require it.
- Leading-slot width is asserted by the shared `w-5` class (jsdom has no layout), per T3's "the same width class".

## Risks

- `TagsView.test.ts` `listedTags()` reads `span.truncate`; the name span keeps `truncate`.
- `clickTag` in `TagsView.test.ts` finds the first button whose text includes the name; the dot trigger has no text (label is an attribute), so it still finds the name button.
