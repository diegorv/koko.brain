<script lang="ts">
	import { Handle, Position, NodeResizer, useSvelteFlow, type Node, type NodeProps } from '@xyflow/svelte';
	import { resolveColor } from './canvas.logic';
	import { renderCanvasMarkdown } from './canvas-markdown.logic';
	import type { CanvasColor } from './canvas.types';

	interface TextNodeData extends Record<string, unknown> {
		text?: string;
		color?: CanvasColor;
		editing?: boolean;
	}

	let { id, data, selected }: NodeProps<Node<TextNodeData>> = $props();
	let { updateNodeData } = useSvelteFlow();
	let bgColor = $derived(resolveColor(data.color));
	let editing = $state(false);
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	/** React to external edit trigger (context menu "Edit" button) */
	$effect(() => {
		if (data.editing) {
			editing = true;
			updateNodeData(id, { ...data, editing: undefined });
			requestAnimationFrame(() => textareaEl?.focus());
		}
	});

	function startEditing() {
		editing = true;
		// Focus after DOM update
		requestAnimationFrame(() => textareaEl?.focus());
	}

	function stopEditing() {
		editing = false;
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLTextAreaElement).value;
		updateNodeData(id, { ...data, text: value });
	}

	function handleKeydown(e: KeyboardEvent) {
		// Escape exits editing
		if (e.key === 'Escape') {
			stopEditing();
		}
		// Prevent node deletion while typing
		e.stopPropagation();
	}
</script>

<NodeResizer minWidth={200} minHeight={60} isVisible={selected} />
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="canvas-node canvas-text-node"
	style:background-color={bgColor ? `${bgColor}20` : undefined}
	style:border-color={bgColor ?? undefined}
	ondblclick={startEditing}
>
	{#if editing}
		<textarea
			bind:this={textareaEl}
			value={data.text ?? ''}
			oninput={handleInput}
			onblur={stopEditing}
			onkeydown={handleKeydown}
			class="canvas-textarea nodrag nowheel"
			placeholder="Type something..."
		></textarea>
	{:else}
		<div class="canvas-node-content markdown-preview nowheel">
			{#if data.text}
				{@html renderCanvasMarkdown(data.text)}
			{:else}
				<p class="placeholder">Double-click to edit</p>
			{/if}
		</div>
	{/if}
</div>
<Handle type="target" position={Position.Top} id="top-target" />
<Handle type="source" position={Position.Top} id="top-source" />
<Handle type="target" position={Position.Bottom} id="bottom-target" />
<Handle type="source" position={Position.Bottom} id="bottom-source" />
<Handle type="target" position={Position.Left} id="left-target" />
<Handle type="source" position={Position.Left} id="left-source" />
<Handle type="target" position={Position.Right} id="right-target" />
<Handle type="source" position={Position.Right} id="right-source" />

<style>
	.canvas-node {
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: var(--card);
		color: var(--foreground);
		font-size: 13px;
		line-height: 1.5;
		overflow: hidden;
	}

	.canvas-node-content {
		overflow-y: auto;
		max-height: 100%;
	}

	.placeholder {
		opacity: 0.4;
		font-style: italic;
	}

	.canvas-textarea {
		width: 100%;
		min-height: 40px;
		background: transparent;
		border: none;
		outline: none;
		color: var(--foreground);
		font-size: 13px;
		line-height: 1.5;
		font-family: inherit;
		resize: vertical;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.canvas-textarea::placeholder {
		color: var(--muted-foreground);
		opacity: 0.5;
	}
</style>
