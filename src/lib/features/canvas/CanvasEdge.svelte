<script lang="ts">
	import {
		BaseEdge,
		EdgeLabel,
		EdgeReconnectAnchor,
		getSmoothStepPath,
		type EdgeProps,
	} from '@xyflow/svelte';

	let {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		selected,
		label,
		style,
		markerStart,
		markerEnd,
	}: EdgeProps = $props();

	let reconnecting = $state(false);

	let [path, labelX, labelY] = $derived(
		getSmoothStepPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
		}),
	);
</script>

{#if !reconnecting}
	<BaseEdge {id} {path} {style} {markerStart} {markerEnd} />
	{#if label}
		<EdgeLabel x={labelX} y={labelY}>
			<span class="canvas-edge-label">{label}</span>
		</EdgeLabel>
	{/if}
{/if}
{#if selected}
	<EdgeReconnectAnchor
		bind:reconnecting
		type="source"
		position={{ x: sourceX, y: sourceY }}
		size={12}
		style="background: var(--primary); border-radius: 50%; width: 12px; height: 12px; border: 2px solid var(--background);"
	/>
	<EdgeReconnectAnchor
		bind:reconnecting
		type="target"
		position={{ x: targetX, y: targetY }}
		size={12}
		style="background: var(--primary); border-radius: 50%; width: 12px; height: 12px; border: 2px solid var(--background);"
	/>
{/if}

<style>
	.canvas-edge-label {
		background: var(--card, #2a2e3d);
		color: var(--foreground, #fff);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		border: 1px solid rgba(255, 255, 255, 0.15);
		pointer-events: all;
	}
</style>
