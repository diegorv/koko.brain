<script lang="ts">
	import { Handle, Position, NodeResizer, useSvelteFlow, type Node, type NodeProps } from '@xyflow/svelte';
	import { ExternalLink, Pencil } from 'lucide-svelte';
	import { resolveColor } from './canvas.logic';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { isSafeUrl } from '$lib/utils/sanitize-url';
	import type { CanvasColor } from './canvas.types';

	interface LinkNodeData extends Record<string, unknown> {
		url?: string;
		label?: string;
		color?: CanvasColor;
		editing?: boolean;
	}

	let { id, data, selected }: NodeProps<Node<LinkNodeData>> = $props();
	let { updateNodeData } = useSvelteFlow();
	let bgColor = $derived(resolveColor(data.color));
	let editing = $state(false);
	let editUrl = $state('');
	let editLabel = $state('');
	let urlInputEl: HTMLInputElement | undefined = $state();

	/** Display name: label if set, otherwise hostname */
	let displayName = $derived(() => {
		if (data.label) return data.label;
		try {
			return new URL(data.url!).hostname;
		} catch {
			return data.url ?? 'Unknown URL';
		}
	});

	/** React to external edit trigger (context menu "Edit" button) */
	$effect(() => {
		if (data.editing) {
			startEditing();
			updateNodeData(id, { ...data, editing: undefined });
		}
	});

	/** Enter edit mode */
	function startEditing() {
		editUrl = data.url ?? '';
		editLabel = data.label ?? '';
		editing = true;
		requestAnimationFrame(() => urlInputEl?.focus());
	}

	/** Save edits and exit edit mode */
	function stopEditing() {
		const trimmedUrl = editUrl.trim();
		if (trimmedUrl) {
			const finalUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`; // privacy-ok
			updateNodeData(id, { ...data, url: finalUrl, label: editLabel.trim() || undefined });
		}
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			editing = false;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			stopEditing();
		}
		e.stopPropagation();
	}

	/** Only close edit mode when focus leaves the entire form */
	function handleBlur(e: FocusEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		if (related?.closest('.link-edit-form')) return;
		stopEditing();
	}

	/** Open the URL in the default browser */
	async function handleClick() {
		if (data.url && isSafeUrl(data.url)) {
			try {
				await openUrl(data.url);
			} catch {
				/* ignore — may fail outside Tauri */
			}
		}
	}
</script>

<NodeResizer minWidth={200} minHeight={60} isVisible={selected} />
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="canvas-node canvas-link-node"
	style:background-color={bgColor ? `${bgColor}20` : undefined}
	style:border-color={bgColor ?? undefined}
	ondblclick={startEditing}
>
	{#if editing}
		<div class="link-edit-form nodrag nowheel">
			<input
				bind:this={urlInputEl}
				bind:value={editUrl}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				class="link-edit-input"
				placeholder="https://example.com"
			/>
			<input
				bind:value={editLabel}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				class="link-edit-input"
				placeholder="Title (optional)"
			/>
		</div>
	{:else}
		<button type="button" class="link-header" onclick={handleClick}>
			<ExternalLink class="size-4 shrink-0 opacity-60" />
			<span class="link-display-name">{displayName()}</span>
		</button>
		{#if data.url}
			<span class="link-full-url">{data.url}</span>
		{/if}
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

	.link-header {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		border-radius: 4px;
		padding: 2px 4px;
		margin: -2px -4px;
		transition: background 0.15s;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		width: calc(100% + 8px);
		text-align: left;
	}

	.link-header:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.link-display-name {
		color: var(--primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.link-header:hover .link-display-name {
		text-decoration: underline;
	}

	.link-full-url {
		display: block;
		margin-top: 4px;
		font-size: 11px;
		opacity: 0.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.link-edit-form {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.link-edit-input {
		width: 100%;
		padding: 4px 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--foreground);
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
	}

	.link-edit-input:focus {
		border-color: var(--primary);
	}

	.link-edit-input::placeholder {
		color: var(--muted-foreground);
		opacity: 0.5;
	}
</style>
