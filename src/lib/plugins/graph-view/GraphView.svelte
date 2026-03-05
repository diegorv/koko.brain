<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide,
		forceRadial,
		type Simulation,
		type SimulationNodeDatum,
		type SimulationLinkDatum,
	} from 'd3-force';
	import { select } from 'd3-selection';
	import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
	import { drag as d3Drag } from 'd3-drag';
	import { graphViewStore } from './graph-view.store.svelte';
	import { buildGraph } from './graph-view.service';
	import { filterGraphData, getLocalGraph, getNodeRadius } from './graph-view.logic';
	import type { GraphNode, GraphLink } from './graph-view.types';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import GraphControls from './GraphControls.svelte';

	type SimNode = GraphNode & SimulationNodeDatum;
	type SimLink = SimulationLinkDatum<SimNode> & { source: SimNode; target: SimNode; bidirectional?: boolean };

	let canvasEl: HTMLCanvasElement;
	let containerEl: HTMLDivElement;
	let simulation: Simulation<SimNode, SimLink> | null = null;
	let zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> | null = null;
	let currentTransform: ZoomTransform = zoomIdentity;
	let simNodes = $state<SimNode[]>([]);
	let simLinks = $state<SimLink[]>([]);
	let hoveredNode: SimNode | null = null;
	let width = 0;
	let height = 0;

	const NODE_COLOR = '#8b8b8b';
	const NODE_ACTIVE_COLOR = '#c084fc';
	const EDGE_COLOR = 'rgba(160, 160, 180, 0.6)';
	const EDGE_HIGHLIGHT_COLOR = 'rgba(192, 132, 252, 0.5)';
	const LABEL_COLOR = '#a1a1aa';
	const BG_COLOR = '#1a1a1e';

	function getDisplayData() {
		const fullData = buildGraph();

		let data = graphViewStore.mode === 'local' && editorStore.activeTabPath
			? getLocalGraph(fullData, editorStore.activeTabPath, 1)
			: fullData;

		const { tag, folder, searchQuery, showOrphans } = graphViewStore.filters;
		if (tag || folder || searchQuery || !showOrphans) {
			data = filterGraphData(data, graphViewStore.filters);
		}

		return data;
	}

	function initSimulation() {
		if (simulation) simulation.stop();

		const data = getDisplayData();

		// Create sim nodes with copies so d3 can mutate x/y
		simNodes = data.nodes.map((n) => ({ ...n }));
		const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

		simLinks = data.links
			.map((l) => {
				const source = nodeMap.get(l.source);
				const target = nodeMap.get(l.target);
				if (!source || !target) return null;
				return { source, target, bidirectional: l.bidirectional } as SimLink;
			})
			.filter((l): l is SimLink => l !== null);

		const nodeCount = simNodes.length;
		const chargeStrength = nodeCount > 200 ? -30 : nodeCount > 50 ? -60 : -100;
		const linkDistance = nodeCount > 200 ? 30 : nodeCount > 50 ? 50 : 80;
		const orbitRadius = Math.min(width, height) * 0.2;

		simulation = forceSimulation<SimNode>(simNodes)
			.force(
				'link',
				forceLink<SimNode, SimLink>(simLinks)
					.id((d) => d.id)
					.distance(linkDistance),
			)
			.force('charge', forceManyBody().strength((d) => {
				const node = d as SimNode;
				return node.linkCount === 0 ? chargeStrength * 0.3 : chargeStrength;
			}))
			.force('center', forceCenter(width / 2, height / 2))
			.force('collide', forceCollide<SimNode>().radius((d) => getNodeRadius(d.linkCount) + 2))
			// Gently push orphans outward, keep connected nodes near center
			.force('radial', forceRadial<SimNode>(
				(d) => d.linkCount === 0 ? orbitRadius : 0,
				width / 2,
				height / 2,
			).strength((d) => d.linkCount === 0 ? 0.08 : 0))
			.on('tick', render);

		simulation.alpha(1).restart();
	}

	function render() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		ctx.save();
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		ctx.scale(dpr, dpr);

		// Apply zoom transform
		ctx.translate(currentTransform.x, currentTransform.y);
		ctx.scale(currentTransform.k, currentTransform.k);

		const highlightedId = hoveredNode?.id ?? graphViewStore.highlightedNodeId;
		const connectedIds = new Set<string>();
		if (highlightedId) {
			for (const link of simLinks) {
				if (link.source.id === highlightedId) connectedIds.add(link.target.id);
				if (link.target.id === highlightedId) connectedIds.add(link.source.id);
			}
			connectedIds.add(highlightedId);
		}

		// Draw edges
		const drawArrows = graphViewStore.display.showArrows;
		for (const link of simLinks) {
			const isHighlighted = highlightedId && (
				link.source.id === highlightedId || link.target.id === highlightedId
			);
			const sx = link.source.x!;
			const sy = link.source.y!;
			const tx = link.target.x!;
			const ty = link.target.y!;
			const dx = tx - sx;
			const dy = ty - sy;
			const len = Math.sqrt(dx * dx + dy * dy);

			ctx.strokeStyle = isHighlighted ? EDGE_HIGHLIGHT_COLOR : EDGE_COLOR;
			ctx.lineWidth = isHighlighted ? 1.5 : 0.5;

			if (drawArrows && len > 0) {
				const ux = dx / len;
				const uy = dy / len;
				const targetR = getNodeRadius(link.target.linkCount);
				const sourceR = getNodeRadius(link.source.linkCount);
				const arrowSize = isHighlighted ? 5 : 3.5;
				const color = isHighlighted ? EDGE_HIGHLIGHT_COLOR : EDGE_COLOR;

				// Target arrow: tip at target node edge
				const tipX = tx - ux * targetR;
				const tipY = ty - uy * targetR;
				const baseX = tipX - ux * arrowSize;
				const baseY = tipY - uy * arrowSize;

				// Source arrow (for bidirectional): tip at source node edge
				let lineStartX = sx;
				let lineStartY = sy;
				if (link.bidirectional) {
					lineStartX = sx + ux * (sourceR + arrowSize);
					lineStartY = sy + uy * (sourceR + arrowSize);
				}

				ctx.beginPath();
				ctx.moveTo(lineStartX, lineStartY);
				ctx.lineTo(baseX, baseY);
				ctx.stroke();

				// Draw target arrowhead
				ctx.beginPath();
				ctx.moveTo(tipX, tipY);
				ctx.lineTo(baseX + uy * arrowSize * 0.5, baseY - ux * arrowSize * 0.5);
				ctx.lineTo(baseX - uy * arrowSize * 0.5, baseY + ux * arrowSize * 0.5);
				ctx.closePath();
				ctx.fillStyle = color;
				ctx.fill();

				// Draw source arrowhead (bidirectional)
				if (link.bidirectional) {
					const sTipX = sx + ux * sourceR;
					const sTipY = sy + uy * sourceR;
					const sBaseX = sTipX + ux * arrowSize;
					const sBaseY = sTipY + uy * arrowSize;

					ctx.beginPath();
					ctx.moveTo(sTipX, sTipY);
					ctx.lineTo(sBaseX + uy * arrowSize * 0.5, sBaseY - ux * arrowSize * 0.5);
					ctx.lineTo(sBaseX - uy * arrowSize * 0.5, sBaseY + ux * arrowSize * 0.5);
					ctx.closePath();
					ctx.fillStyle = color;
					ctx.fill();
				}
			} else {
				ctx.beginPath();
				ctx.moveTo(sx, sy);
				ctx.lineTo(tx, ty);
				ctx.stroke();
			}
		}

		// Draw nodes
		const activeTabPath = editorStore.activeTabPath;
		for (const node of simNodes) {
			const r = getNodeRadius(node.linkCount);
			const isActive = node.id === activeTabPath;
			const isConnected = connectedIds.has(node.id);
			const isDimmed = highlightedId && !isConnected;

			ctx.beginPath();
			ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);

			if (isActive) {
				ctx.fillStyle = NODE_ACTIVE_COLOR;
			} else if (isDimmed) {
				ctx.fillStyle = 'rgba(139, 139, 139, 0.2)';
			} else {
				ctx.fillStyle = NODE_COLOR;
			}
			ctx.fill();

			// Draw label when zoomed in enough or when highlighted
			if (currentTransform.k > 0.8 || isConnected || isActive) {
				ctx.fillStyle = isDimmed ? 'rgba(161, 161, 170, 0.3)' : LABEL_COLOR;
				ctx.font = `${Math.max(10, 11 / currentTransform.k)}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.fillText(node.name, node.x!, node.y! + r + 3);
			}
		}

		ctx.restore();
	}

	function resizeCanvas() {
		if (!containerEl || !canvasEl) return;
		const rect = containerEl.getBoundingClientRect();
		width = rect.width;
		height = rect.height;

		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = width * dpr;
		canvasEl.height = height * dpr;
		canvasEl.style.width = `${width}px`;
		canvasEl.style.height = `${height}px`;

		render();
	}

	function findNodeAt(x: number, y: number): SimNode | null {
		// Transform screen coords to simulation coords
		const [sx, sy] = currentTransform.invert([x, y]);

		for (let i = simNodes.length - 1; i >= 0; i--) {
			const node = simNodes[i];
			const r = getNodeRadius(node.linkCount);
			const dx = sx - node.x!;
			const dy = sy - node.y!;
			if (dx * dx + dy * dy < (r + 4) * (r + 4)) {
				return node;
			}
		}
		return null;
	}

	function setupInteractions() {
		if (!canvasEl) return;

		const canvasSel = select<HTMLCanvasElement, unknown>(canvasEl);

		// Zoom + pan
		zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([0.1, 8])
			.on('zoom', (event) => {
				currentTransform = event.transform;
				render();
			});
		canvasSel.call(zoomBehavior);

		// Drag
		const dragBehavior = d3Drag<HTMLCanvasElement, unknown>()
			.subject((event) => {
				const node = findNodeAt(event.x, event.y);
				if (node) return { x: node.x, y: node.y, node };
				return null;
			})
			.on('start', (event) => {
				const node = event.subject?.node as SimNode | undefined;
				if (!node || !simulation) return;
				if (!event.active) simulation.alphaTarget(0.3).restart();
				node.fx = node.x;
				node.fy = node.y;
			})
			.on('drag', (event) => {
				const node = event.subject?.node as SimNode | undefined;
				if (!node) return;
				const [sx, sy] = currentTransform.invert([event.x, event.y]);
				node.fx = sx;
				node.fy = sy;
			})
			.on('end', (event) => {
				const node = event.subject?.node as SimNode | undefined;
				if (!node || !simulation) return;
				if (!event.active) simulation.alphaTarget(0);
				node.fx = null;
				node.fy = null;
			});
		canvasSel.call(dragBehavior);

		// Click and hover via native events
		canvasEl.addEventListener('click', handleClick);
		canvasEl.addEventListener('mousemove', handleMouseMove);
	}

	function handleClick(e: MouseEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const node = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);
		if (node) {
			openFileInEditor(node.id);
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const node = findNodeAt(e.clientX - rect.left, e.clientY - rect.top);

		if (node !== hoveredNode) {
			hoveredNode = node;
			canvasEl.style.cursor = node ? 'pointer' : 'default';
			render();
		}
	}

	function handleZoomIn() {
		if (!zoomBehavior || !canvasEl) return;
		const canvasSel = select<HTMLCanvasElement, unknown>(canvasEl);
		zoomBehavior.scaleBy(canvasSel, 1.4);
	}

	function handleZoomOut() {
		if (!zoomBehavior || !canvasEl) return;
		const canvasSel = select<HTMLCanvasElement, unknown>(canvasEl);
		zoomBehavior.scaleBy(canvasSel, 1 / 1.4);
	}

	// Reinitialize simulation when mode, filters, or backlinks change
	$effect(() => {
		// Track dependencies
		graphViewStore.mode;
		graphViewStore.filters;
		editorStore.activeTabPath;
		noteIndexStore.noteIndex;

		untrack(() => {
			if (canvasEl && width > 0) {
				initSimulation();
			}
		});
	});

	onMount(() => {
		resizeCanvas();
		setupInteractions();
		initSimulation();

		// Apply a default zoom level slightly zoomed in
		if (zoomBehavior && canvasEl) {
			const canvasSel = select<HTMLCanvasElement, unknown>(canvasEl);
			zoomBehavior.scaleTo(canvasSel, 1.3);
		}

		const observer = new ResizeObserver(() => {
			resizeCanvas();
			if (simulation) {
				simulation.force('center', forceCenter(width / 2, height / 2));
				simulation.alpha(0.3).restart();
			}
		});
		observer.observe(containerEl);

		return () => {
			observer.disconnect();
			if (simulation) simulation.stop();
			canvasEl?.removeEventListener('click', handleClick);
			canvasEl?.removeEventListener('mousemove', handleMouseMove);
		};
	});
</script>

<div bind:this={containerEl} class="relative h-full w-full overflow-hidden" style="background: {BG_COLOR};">
	<canvas bind:this={canvasEl}></canvas>
	{#if graphViewStore.mode === 'local' && !editorStore.activeTabPath}
		<div class="absolute inset-0 flex items-center justify-center">
			<p class="text-sm text-muted-foreground">Open a note to see its local graph</p>
		</div>
	{/if}
	<GraphControls
		nodes={simNodes}
		onZoomIn={handleZoomIn}
		onZoomOut={handleZoomOut}
	/>
	<div class="absolute bottom-3 right-3 rounded border border-border bg-background/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
		{simNodes.length} notes &middot; {simLinks.length} links
	</div>
</div>
