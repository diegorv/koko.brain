<script lang="ts">
	import Plus from 'lucide-svelte/icons/plus';
	import FileText from 'lucide-svelte/icons/file-text';
	import * as Popover from '$lib/components/ui/popover';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { flattenFileTree, filterAndRank, getRelativePath } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
	import type { NormalizedIcon } from '$lib/features/file-icons/file-icons.types';

	interface Props {
		onSelect: (fileName: string) => void;
	}

	let { onSelect }: Props = $props();

	let open = $state(false);
	let query = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	let allFiles = $derived(flattenFileTree(fsStore.fileTree));
	let results = $derived(filterAndRank(query, allFiles, []).slice(0, 20));

	/** Map typeName -> type definition's icon ref (for fallback) */
	let typeDefIconMap = $derived.by(() => {
		const map = new Map<string, { icon: NormalizedIcon; color?: string }>();
		for (const entry of typeDefinitionsStore.entries) {
			if (entry.isA !== 'Type') continue;
			const ref = fileIconsStore.getFrontmatterIcon(entry.path);
			if (!ref) continue;
			const icon = getIconSync(ref.iconPack, ref.iconName);
			if (icon) map.set(entry.title, { icon, color: ref.color });
		}
		return map;
	});

	/** Map filePath -> typeName (for looking up type icon fallback) */
	let fileTypeMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const entry of typeDefinitionsStore.entries) {
			if (entry.isA && entry.isA !== 'Type') map.set(entry.path, entry.isA);
		}
		return map;
	});

	function getFileIcon(path: string): { icon: NormalizedIcon; color?: string } | undefined {
		const ref = fileIconsStore.getFrontmatterIcon(path);
		if (ref) {
			const icon = getIconSync(ref.iconPack, ref.iconName);
			if (icon) return { icon, color: ref.color };
		}
		const typeName = fileTypeMap.get(path);
		if (typeName) return typeDefIconMap.get(typeName);
		return undefined;
	}

	function handleSelect(fileName: string) {
		onSelect(fileName);
		open = false;
		query = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			query = '';
		}
	}
</script>

<Popover.Root bind:open onOpenChange={(v) => { if (v) queueMicrotask(() => inputRef?.focus()); }}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="p-0.5 rounded hover:bg-accent transition-colors cursor-pointer shrink-0"
				title="Add link"
			>
				<Plus class="size-3 text-muted-foreground" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-64 p-0" align="start" side="bottom" trapFocus={false}>
		<div class="flex flex-col">
			<input
				bind:this={inputRef}
				bind:value={query}
				onkeydown={handleKeydown}
				class="h-8 w-full border-b border-border bg-transparent px-3 text-[13px] outline-none placeholder:text-muted-foreground"
				placeholder="Search notes..."
			/>
			<div class="max-h-48 overflow-y-auto">
				{#if results.length > 0}
					{#each results as file (file.path)}
						{@const resolved = getFileIcon(file.path)}
						<button
							class="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors cursor-pointer"
							onmousedown={(e) => {
								e.preventDefault();
								handleSelect(file.nameWithoutExt);
							}}
						>
							{#if resolved}
								<IconRenderer icon={resolved.icon} class="size-3.5 shrink-0" color={resolved.color} />
							{:else}
								<FileText class="size-3.5 text-muted-foreground shrink-0" />
							{/if}
							<div class="flex flex-col min-w-0">
								<span class="text-[13px] truncate">{file.nameWithoutExt}</span>
								{#if vaultStore.path}
									<span class="text-[11px] text-muted-foreground truncate">
										{getRelativePath(file.path, vaultStore.path)}
									</span>
								{/if}
							</div>
						</button>
					{/each}
				{:else if query.trim()}
					<p class="py-4 text-center text-[13px] text-muted-foreground">No files found</p>
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
