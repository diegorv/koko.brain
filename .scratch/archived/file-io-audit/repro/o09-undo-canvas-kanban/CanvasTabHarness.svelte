<script lang="ts">
	// Mirrors src/lib/app/EditorView.svelte lines 64-86: the canvas branch is
	// mounted only while the active tab is a canvas and is fed the active
	// tab's content, with onJsonChange = the real editor.service onContentChange.
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { onContentChange } from '#lib/core/editor/editor.service.js';
	import CanvasView from '#lib/features/canvas/CanvasView.svelte';

	let isCanvasTab = $derived(editorStore.activeTab?.fileType === 'canvas');
</script>

{#if editorStore.activeTab}
	{#if isCanvasTab}
		<CanvasView jsonContent={editorStore.activeTab.content} onJsonChange={onContentChange} />
	{:else}
		<div class="markdown-placeholder">{editorStore.activeTab.content}</div>
	{/if}
{/if}
