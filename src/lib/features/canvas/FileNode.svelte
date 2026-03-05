<script lang="ts">
	import { Handle, Position, NodeResizer, type Node, type NodeProps } from '@xyflow/svelte';
	import { FileText, ExternalLink as OpenIcon, Loader2 } from 'lucide-svelte';
	import { readTextFile } from '@tauri-apps/plugin-fs';
	import { resolveColor } from './canvas.logic';
	import { renderCanvasMarkdown } from './canvas-markdown.logic';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import type { CanvasColor } from './canvas.types';

	interface FileNodeData extends Record<string, unknown> {
		file?: string;
		subpath?: string;
		color?: CanvasColor;
	}

	let { data, selected }: NodeProps<Node<FileNodeData>> = $props();
	let bgColor = $derived(resolveColor(data.color));

	/** Extracts just the file name from a path */
	let fileName = $derived(data.file?.split('/').pop() ?? data.file ?? 'Unknown file');

	/** File content state */
	let fileContent = $state<string | null>(null);
	let loading = $state(true);
	let error = $state(false);

	/** Load file content when file path changes */
	$effect(() => {
		const filePath = data.file;
		if (!filePath) return;

		loading = true;
		error = false;
		fileContent = null;

		const fullPath = vaultStore.path ? `${vaultStore.path}/${filePath}` : filePath;
		readTextFile(fullPath as string).then((content) => {
			fileContent = content;
			loading = false;
		}).catch(() => {
			error = true;
			loading = false;
		});
	});

	/** Open the referenced file in the editor */
	function handleClick() {
		if (data.file) openFileInEditor(data.file);
	}
</script>

<NodeResizer minWidth={200} minHeight={100} isVisible={selected} />
<div
	class="canvas-node canvas-file-node"
	style:background-color={bgColor ? `${bgColor}20` : undefined}
	style:border-color={bgColor ?? undefined}
>
	<button type="button" class="file-header" onclick={handleClick}>
		<FileText class="size-4 shrink-0 opacity-60" />
		<span class="file-name">{fileName}</span>
		<OpenIcon class="size-3 shrink-0 open-icon" />
	</button>
	{#if data.subpath}
		<span class="subpath">{data.subpath}</span>
	{/if}
	<div class="file-preview-separator"></div>
	<div class="canvas-node-content markdown-preview nowheel">
		{#if loading}
			<div class="loading-state">
				<Loader2 class="size-4 animate-spin opacity-30" />
			</div>
		{:else if error}
			<p class="error-state">Could not load file</p>
		{:else if fileContent}
			{@html renderCanvasMarkdown(fileContent)}
		{:else}
			<p class="empty-state">Empty file</p>
		{/if}
	</div>
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
		display: flex;
		flex-direction: column;
	}

	.file-header {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		border-radius: 4px;
		padding: 2px 4px;
		margin: -2px -4px;
		transition: background 0.15s;
		flex-shrink: 0;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		width: calc(100% + 8px);
		text-align: left;
	}

	.file-header:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.canvas-node :global(.open-icon) {
		opacity: 0;
		margin-left: auto;
		transition: opacity 0.15s;
	}

	.file-header:hover :global(.open-icon) {
		opacity: 0.5;
	}

	.file-name {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.subpath {
		display: block;
		margin-top: 4px;
		font-size: 11px;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.file-preview-separator {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 8px -16px;
		flex-shrink: 0;
	}

	.canvas-node-content {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.loading-state {
		display: flex;
		justify-content: center;
		padding: 12px 0;
	}

	.error-state {
		opacity: 0.4;
		font-style: italic;
		font-size: 12px;
	}

	.empty-state {
		opacity: 0.3;
		font-style: italic;
		font-size: 12px;
	}
</style>
