<script lang="ts">
	import { Type, FileText, ExternalLink, ImageIcon, Square } from 'lucide-svelte';

	interface Props {
		/** Callback to create a text card */
		oncreatetext: () => void;
		/** Callback to open file picker */
		oncreatefile: () => void;
		/** Callback to open URL input */
		oncreatelink: () => void;
		/** Callback to open image picker */
		oncreateimage: () => void;
		/** Callback to create a group */
		oncreategroup: () => void;
	}

	let { oncreatetext, oncreatefile, oncreatelink, oncreateimage, oncreategroup }: Props = $props();
</script>

<div class="canvas-toolbar">
	<button class="toolbar-btn" onclick={oncreatetext} title="Add text card">
		<Type class="size-4" />
	</button>
	<button class="toolbar-btn" onclick={oncreatefile} title="Add note from vault">
		<FileText class="size-4" />
	</button>
	<button class="toolbar-btn" onclick={oncreatelink} title="Add link">
		<ExternalLink class="size-4" />
	</button>
	<button class="toolbar-btn" onclick={oncreateimage} title="Add image">
		<ImageIcon class="size-4" />
	</button>
	<button class="toolbar-btn" onclick={oncreategroup} title="Create group">
		<Square class="size-4" />
	</button>
</div>

<style>
	.canvas-toolbar {
		position: absolute;
		bottom: 118px;
		left: 10px;
		z-index: 5;
		display: flex;
		flex-direction: column;
	}

	.toolbar-btn {
		width: 28px;
		height: 28px;
		border: 1px solid var(--xy-controls-button-border-color, rgba(255, 255, 255, 0.15));
		background: var(--xy-controls-button-background-color, var(--background));
		color: var(--xy-controls-button-color, var(--foreground));
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		padding: 0;
		margin-bottom: -1px;
	}

	.toolbar-btn:first-child {
		border-radius: 0;
	}

	.toolbar-btn:last-child {
		border-radius: 0;
	}

	.toolbar-btn:hover {
		background: var(--muted);
	}
</style>
