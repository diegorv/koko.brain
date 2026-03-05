<script lang="ts">
	import { Type, FileText, ExternalLink, ImageIcon, Square, Copy, Trash2, Pencil, MousePointer2, Maximize2, Tag, Palette, CircleArrowLeft, CircleArrowRight } from 'lucide-svelte';
	import ColorPicker from './ColorPicker.svelte';
	import type { CanvasColor } from './canvas.types';

	interface Props {
		/** Menu type: pane (canvas bg), node, or edge */
		type: 'pane' | 'node' | 'edge';
		/** Target node/edge ID */
		targetId?: string;
		/** Node type when type is 'node' */
		nodeType?: string;
		/** Positioning (smart edge detection) */
		top?: number;
		left?: number;
		right?: number;
		bottom?: number;
		/** Action callbacks */
		onaddtext: () => void;
		onaddfile: () => void;
		onaddlink: () => void;
		onaddimage: () => void;
		onaddgroup: () => void;
		onselectall: () => void;
		onzoomtofit: () => void;
		onedit: () => void;
		onduplicate: () => void;
		ondelete: () => void;
		onopenfile?: () => void;
		onopenurl?: () => void;
		oneditlabel?: () => void;
		ongotosource?: () => void;
		ongototarget?: () => void;
		onsetcolor?: (color: CanvasColor | undefined) => void;
		/** Current color of the target node/edge */
		currentColor?: CanvasColor;
		onclose: () => void;
	}

	let {
		type,
		targetId,
		nodeType,
		top,
		left,
		right,
		bottom,
		onaddtext,
		onaddfile,
		onaddlink,
		onaddimage,
		onaddgroup,
		onselectall,
		onzoomtofit,
		onedit,
		onduplicate,
		ondelete,
		onopenfile,
		onopenurl,
		oneditlabel,
		ongotosource,
		ongototarget,
		onsetcolor,
		currentColor,
		onclose,
	}: Props = $props();

	function handle(action: () => void) {
		action();
		onclose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="context-menu"
	style:top={top != null ? `${top}px` : undefined}
	style:left={left != null ? `${left}px` : undefined}
	style:right={right != null ? `${right}px` : undefined}
	style:bottom={bottom != null ? `${bottom}px` : undefined}
	onpointerdown={(e) => e.stopPropagation()}
>
	{#if type === 'pane'}
		<button class="menu-item" onclick={() => handle(onaddtext)}>
			<Type class="size-3.5" /> Add text card
		</button>
		<button class="menu-item" onclick={() => handle(onaddfile)}>
			<FileText class="size-3.5" /> Add note from vault
		</button>
		<button class="menu-item" onclick={() => handle(onaddlink)}>
			<ExternalLink class="size-3.5" /> Add link
		</button>
		<button class="menu-item" onclick={() => handle(onaddimage)}>
			<ImageIcon class="size-3.5" /> Add image
		</button>
		<button class="menu-item" onclick={() => handle(onaddgroup)}>
			<Square class="size-3.5" /> Create group
		</button>
		<div class="separator"></div>
		<button class="menu-item" onclick={() => handle(onselectall)}>
			<MousePointer2 class="size-3.5" /> Select all
			<span class="shortcut">Ctrl+A</span>
		</button>
		<button class="menu-item" onclick={() => handle(onzoomtofit)}>
			<Maximize2 class="size-3.5" /> Zoom to fit
			<span class="shortcut">Shift+1</span>
		</button>
	{:else if type === 'node'}
		{#if nodeType === 'text' || nodeType === 'link'}
			<button class="menu-item" onclick={() => handle(onedit)}>
				<Pencil class="size-3.5" /> Edit
			</button>
		{/if}
		{#if nodeType === 'file' && onopenfile}
			<button class="menu-item" onclick={() => handle(onopenfile)}>
				<FileText class="size-3.5" /> Open in editor
			</button>
		{/if}
		{#if nodeType === 'link' && onopenurl}
			<button class="menu-item" onclick={() => handle(onopenurl)}>
				<ExternalLink class="size-3.5" /> Open URL
			</button>
		{/if}
		{#if onsetcolor}
			<div class="separator"></div>
			<div class="menu-label"><Palette class="size-3.5" /> Color</div>
			<ColorPicker {currentColor} onSelect={(c) => { onsetcolor(c); onclose(); }} />
		{/if}
		<div class="separator"></div>
		<button class="menu-item" onclick={() => handle(onduplicate)}>
			<Copy class="size-3.5" /> Duplicate
		</button>
		<button class="menu-item danger" onclick={() => handle(ondelete)}>
			<Trash2 class="size-3.5" /> Delete
		</button>
	{:else if type === 'edge'}
		{#if oneditlabel}
			<button class="menu-item" onclick={() => handle(oneditlabel)}>
				<Tag class="size-3.5" /> Edit label
			</button>
		{/if}
		{#if onsetcolor}
			<div class="separator"></div>
			<div class="menu-label"><Palette class="size-3.5" /> Color</div>
			<ColorPicker {currentColor} onSelect={(c) => { onsetcolor(c); onclose(); }} />
		{/if}
		<div class="separator"></div>
		{#if ongotosource}
			<button class="menu-item" onclick={() => handle(ongotosource)}>
				<CircleArrowLeft class="size-3.5" /> Go to source
			</button>
		{/if}
		{#if ongototarget}
			<button class="menu-item" onclick={() => handle(ongototarget)}>
				<CircleArrowRight class="size-3.5" /> Go to target
			</button>
		{/if}
		<div class="separator"></div>
		<button class="menu-item danger" onclick={() => handle(ondelete)}>
			<Trash2 class="size-3.5" /> Delete
		</button>
	{/if}
</div>

<style>
	.context-menu {
		position: absolute;
		z-index: 10;
		background: var(--background);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 4px;
		min-width: 180px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 10px;
		border: none;
		background: transparent;
		color: var(--foreground);
		font-size: 12px;
		cursor: pointer;
		border-radius: 4px;
		text-align: left;
	}

	.menu-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.menu-item.danger:hover {
		background: rgba(251, 70, 76, 0.15);
		color: #fb464c;
	}

	.menu-label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px 2px;
		font-size: 11px;
		color: var(--muted-foreground);
	}

	.shortcut {
		margin-left: auto;
		font-size: 11px;
		opacity: 0.4;
	}

	.separator {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 4px 0;
	}
</style>
