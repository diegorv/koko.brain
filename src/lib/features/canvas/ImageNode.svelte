<script lang="ts">
	import { Handle, Position, NodeResizer, type Node, type NodeProps } from '@xyflow/svelte';
	import { ImageIcon } from 'lucide-svelte';
	import { resolveColor } from './canvas.logic';
	import { resolveImageSrc } from './canvas-image.logic';
	import type { CanvasColor } from './canvas.types';

	interface ImageNodeData extends Record<string, unknown> {
		file?: string;
		color?: CanvasColor;
	}

	let { data, selected }: NodeProps<Node<ImageNodeData>> = $props();
	let bgColor = $derived(resolveColor(data.color));
	let imageSrc = $state<string | null>(null);
	let error = $state(false);

	$effect(() => {
		const file = data.file;
		if (!file) return;
		imageSrc = null;
		error = false;
		let currentSrc: string | null = null;
		resolveImageSrc(file)
			.then((src) => {
				currentSrc = src;
				imageSrc = src;
			})
			.catch(() => {
				error = true;
			});
		return () => {
			if (currentSrc && currentSrc.startsWith('blob:')) {
				URL.revokeObjectURL(currentSrc);
			}
		};
	});
</script>

<NodeResizer minWidth={100} minHeight={100} isVisible={selected} />
<div
	class="canvas-node canvas-image-node"
	style:border-color={bgColor ? `${bgColor}60` : undefined}
>
	{#if error || !imageSrc}
		<div class="image-placeholder">
			<ImageIcon class="size-8 opacity-30" />
			<span class="image-path">{data.file ?? ''}</span>
		</div>
	{:else}
		<img src={imageSrc} alt={data.file ?? ''} class="canvas-image" />
	{/if}
</div>
<Handle type="target" position={Position.Top} id="top-target" />
<Handle type="source" position={Position.Bottom} id="bottom-source" />
<Handle type="target" position={Position.Left} id="left-target" />
<Handle type="source" position={Position.Right} id="right-source" />

<style>
	.canvas-image-node {
		background: var(--card);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px;
		color: var(--muted-foreground);
	}

	.image-path {
		font-size: 11px;
		opacity: 0.5;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.canvas-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
