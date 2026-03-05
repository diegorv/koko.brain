<script lang="ts">
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { flattenFileTree, filterAndRank } from '$lib/features/quick-switcher/quick-switcher.logic';

	interface Props {
		/** Whether the picker is open */
		open: boolean;
		/** Callback when a file is selected */
		onSelect: (filePath: string) => void;
		/** Callback to close the picker */
		onClose: () => void;
		/** File extensions to show (default: ['.md']) */
		extensions?: string[];
	}

	let { open, onSelect, onClose, extensions = ['.md'] }: Props = $props();

	let query = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	let allFiles = $derived(flattenFileTree(fsStore.fileTree).filter((f) => {
		const lower = f.name.toLowerCase();
		return extensions.some((ext) => lower.endsWith(ext));
	}));
	let filtered = $derived(filterAndRank(query, allFiles, []));

	function handleSelect(filePath: string) {
		onSelect(filePath);
		query = '';
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			query = '';
			onClose();
		}
	}

	$effect(() => {
		if (open) {
			requestAnimationFrame(() => inputEl?.focus());
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="picker-backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={handleKeydown}>
		<div class="picker-dialog">
			<input
				bind:this={inputEl}
				bind:value={query}
				onkeydown={handleKeydown}
				class="picker-input"
				placeholder="Search vault files..."
			/>
			<div class="picker-list">
				{#each filtered.slice(0, 20) as file}
					<button class="picker-item" onclick={() => handleSelect(file.path)}>
						{file.nameWithoutExt}
						<span class="picker-path">{file.path}</span>
					</button>
				{/each}
				{#if filtered.length === 0}
					<div class="picker-empty">No files found</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.picker-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 50;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
	}

	.picker-dialog {
		background: var(--background);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		width: 400px;
		max-height: 350px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.picker-input {
		padding: 10px 14px;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: var(--foreground);
		font-size: 13px;
		outline: none;
	}

	.picker-input::placeholder {
		color: var(--muted-foreground);
	}

	.picker-list {
		overflow-y: auto;
		flex: 1;
		padding: 4px;
	}

	.picker-item {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 6px 10px;
		border: none;
		background: transparent;
		color: var(--foreground);
		font-size: 13px;
		cursor: pointer;
		border-radius: 4px;
		text-align: left;
	}

	.picker-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.picker-path {
		font-size: 11px;
		opacity: 0.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.picker-empty {
		padding: 16px;
		text-align: center;
		color: var(--muted-foreground);
		font-size: 13px;
	}
</style>
