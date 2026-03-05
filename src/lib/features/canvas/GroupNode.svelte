<script lang="ts">
	import { NodeResizer, type Node, type NodeProps } from '@xyflow/svelte';
	import { resolveColor } from './canvas.logic';
	import type { CanvasColor } from './canvas.types';

	interface GroupNodeData extends Record<string, unknown> {
		label?: string;
		color?: CanvasColor;
	}

	let { data, selected }: NodeProps<Node<GroupNodeData>> = $props();
	let bgColor = $derived(resolveColor(data.color));
</script>

<NodeResizer minWidth={200} minHeight={100} isVisible={selected} />
<div
	class="canvas-group-node"
	style:background-color={bgColor ? `${bgColor}10` : undefined}
	style:border-color={bgColor ? `${bgColor}60` : undefined}
>
	{#if data.label}
		<span class="group-label">{data.label}</span>
	{/if}
</div>

<style>
	.canvas-group-node {
		width: 100%;
		height: 100%;
		border-radius: 8px;
		border: 1px dashed rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.03);
		position: relative;
	}

	.group-label {
		position: absolute;
		top: -20px;
		left: 8px;
		font-size: 12px;
		font-weight: 500;
		color: var(--muted-foreground);
		white-space: nowrap;
	}
</style>
