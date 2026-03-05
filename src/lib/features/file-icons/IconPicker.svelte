<script lang="ts">
	import type { IconPackId, NormalizedIcon } from './file-icons.types';
	import { getAllIconPacks, getIconsForPack, getIconSync } from './file-icons.icon-data';
	import { filterIcons } from './file-icons.logic';
	import { fileIconsStore } from './file-icons.store.svelte';
	import IconRenderer from './IconRenderer.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { X, RotateCcw } from 'lucide-svelte';

	/**
	 * Modal dialog for selecting an icon and color for a file/folder.
	 * Shows icons from multiple packs with search, pack filtering, and color picker.
	 */
	interface Props {
		/** Whether the dialog is open */
		open: boolean;
		/** Current icon pack (if editing existing icon) */
		currentPack?: IconPackId;
		/** Current icon name (if editing existing icon) */
		currentName?: string;
		/** Current color (if editing existing icon) */
		currentColor?: string;
		/** Current text color for the filename (if editing existing icon) */
		currentTextColor?: string;
		/** Called when an icon is selected */
		onSelect: (pack: IconPackId, name: string, color?: string, textColor?: string) => void;
		/** Called when the icon should be removed */
		onRemove: () => void;
		/** Called when the dialog closes */
		onClose: () => void;
	}

	let {
		open = $bindable(),
		currentPack,
		currentName,
		currentColor,
		currentTextColor,
		onSelect,
		onRemove,
		onClose,
	}: Props = $props();

	const packs = getAllIconPacks();
	const PRESET_COLORS = [
		{ name: 'Default', value: '' },
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Yellow', value: '#eab308' },
		{ name: 'Green', value: '#22c55e' },
		{ name: 'Cyan', value: '#06b6d4' },
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Purple', value: '#a855f7' },
		{ name: 'Pink', value: '#ec4899' },
	];

	let searchQuery = $state('');
	let selectedPackId = $state<IconPackId | 'all'>('all');
	let selectedColor = $state('');
	let selectedTextColor = $state('');
	let icons = $state<NormalizedIcon[]>([]);
	let loading = $state(false);

	/** Resolves recently used icons from store into NormalizedIcon objects */
	let recentNormalized = $derived.by(() => {
		const result: NormalizedIcon[] = [];
		for (const recent of fileIconsStore.recentIcons) {
			const icon = getIconSync(recent.iconPack, recent.iconName);
			if (icon) result.push(icon);
		}
		return result;
	});

	/** Version counter to discard stale async results on rapid pack switching */
	let loadVersion = 0;

	/** Loads icons when pack selection changes */
	async function loadIcons() {
		const version = ++loadVersion;
		loading = true;
		try {
			let results: NormalizedIcon[];
			if (selectedPackId === 'all') {
				const parts = await Promise.all(packs.map((p) => getIconsForPack(p.id)));
				results = parts.flat();
			} else {
				results = await getIconsForPack(selectedPackId);
			}
			if (version !== loadVersion) return;
			icons = results;
		} finally {
			if (version === loadVersion) {
				loading = false;
			}
		}
	}

	let filteredIcons = $derived(filterIcons(icons, searchQuery));

	// Load icons on mount and when pack changes
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		selectedPackId;
		loadIcons();
	});

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			searchQuery = '';
			selectedColor = currentColor ?? '';
			selectedTextColor = currentTextColor ?? '';
			selectedPackId = 'all';
		}
	});

	/** Handles icon selection */
	function handleSelect(icon: NormalizedIcon) {
		onSelect(icon.pack, icon.name, selectedColor || undefined, selectedTextColor || undefined);
		open = false;
	}

	/** Handles icon removal */
	function handleRemove() {
		onRemove();
		open = false;
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			onClose();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-[550px] p-0 gap-0" showCloseButton={false}>
		<div class="flex flex-col h-[480px] overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between border-b px-4 py-3">
				<Dialog.Title class="text-sm font-medium">Change icon</Dialog.Title>
				<Dialog.Close class="rounded-xs opacity-70 hover:opacity-100">
					<X class="size-4" />
				</Dialog.Close>
			</div>

			<!-- Search -->
			<div class="px-4 py-2 border-b">
				<Input
					bind:value={searchQuery}
					placeholder="Search icons..."
					class="h-8 text-sm"
				/>
			</div>

			<!-- Pack selector -->
			<div class="flex gap-1 px-4 py-2 border-b overflow-x-auto">
				<button
					class="shrink-0 rounded-md px-2 py-1 text-xs transition-colors
						{selectedPackId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}"
					onclick={() => selectedPackId = 'all'}
				>
					All
				</button>
				{#each packs as pack}
					<button
						class="shrink-0 rounded-md px-2 py-1 text-xs transition-colors
							{selectedPackId === pack.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}"
						onclick={() => selectedPackId = pack.id}
					>
						{pack.label}
					</button>
				{/each}
			</div>

			<!-- Icon grid -->
			<ScrollArea class="flex-1 min-h-0">
				<div class="p-3">
					{#if loading}
						<div class="flex items-center justify-center py-8 text-sm text-muted-foreground">
							Loading icons...
						</div>
					{:else if filteredIcons.length === 0 && recentNormalized.length === 0}
						<div class="flex items-center justify-center py-8 text-sm text-muted-foreground">
							No icons found
						</div>
					{:else}
						{#if recentNormalized.length > 0 && !searchQuery && selectedPackId === 'all'}
							<div class="mb-3">
								<p class="text-xs text-muted-foreground mb-1.5">Recently used</p>
								<div class="grid grid-cols-8 gap-1">
									{#each recentNormalized as icon (icon.pack + ':' + icon.name)}
										<button
											class="flex items-center justify-center size-9 rounded-md transition-colors hover:bg-accent
												{currentPack === icon.pack && currentName === icon.name ? 'bg-accent ring-1 ring-primary' : ''}"
											title="{icon.name} ({icon.pack})"
											onclick={() => handleSelect(icon)}
										>
											<IconRenderer {icon} class="size-5" color={selectedColor || undefined} />
										</button>
									{/each}
								</div>
							</div>
						{/if}
						{#if filteredIcons.length > 0}
							<div class="grid grid-cols-8 gap-1">
								{#each filteredIcons.slice(0, 500) as icon (icon.pack + ':' + icon.name)}
									<button
										class="flex items-center justify-center size-9 rounded-md transition-colors hover:bg-accent
											{currentPack === icon.pack && currentName === icon.name ? 'bg-accent ring-1 ring-primary' : ''}"
										title="{icon.name} ({icon.pack})"
										onclick={() => handleSelect(icon)}
									>
										<IconRenderer {icon} class="size-5" color={selectedColor || undefined} />
									</button>
								{/each}
							</div>
							{#if filteredIcons.length > 500}
								<p class="text-center text-xs text-muted-foreground mt-2">
									Showing 500 of {filteredIcons.length} icons. Use search to find more.
								</p>
							{/if}
						{/if}
					{/if}
				</div>
			</ScrollArea>

			<!-- Color picker + actions -->
			<div class="border-t px-4 py-3 space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground shrink-0 w-16">Icon:</span>
					<div class="flex gap-1.5 flex-wrap items-center">
						{#each PRESET_COLORS as preset}
							<button
								class="size-5 rounded-full border transition-transform hover:scale-110
									{selectedColor === preset.value ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}"
								style="background-color: {preset.value || 'currentColor'}"
								title={preset.name}
								onclick={() => selectedColor = preset.value}
							></button>
						{/each}
						<label
							class="size-5 rounded-full border cursor-pointer transition-transform hover:scale-110 overflow-hidden relative
								{selectedColor && !PRESET_COLORS.some(p => p.value === selectedColor) ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}"
							title="Custom color"
							style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
						>
							<input
								type="color"
								class="absolute inset-0 opacity-0 cursor-pointer"
								value={selectedColor || '#ffffff'}
								oninput={(e) => selectedColor = e.currentTarget.value}
							/>
						</label>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground shrink-0 w-16">Text:</span>
					<div class="flex gap-1.5 flex-wrap items-center">
						{#each PRESET_COLORS as preset}
							<button
								class="size-5 rounded-full border transition-transform hover:scale-110
									{selectedTextColor === preset.value ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}"
								style="background-color: {preset.value || 'currentColor'}"
								title={preset.name}
								onclick={() => selectedTextColor = preset.value}
							></button>
						{/each}
						<label
							class="size-5 rounded-full border cursor-pointer transition-transform hover:scale-110 overflow-hidden relative
								{selectedTextColor && !PRESET_COLORS.some(p => p.value === selectedTextColor) ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}"
							title="Custom text color"
							style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
						>
							<input
								type="color"
								class="absolute inset-0 opacity-0 cursor-pointer"
								value={selectedTextColor || '#ffffff'}
								oninput={(e) => selectedTextColor = e.currentTarget.value}
							/>
						</label>
					</div>
				</div>
				{#if currentPack}
					<button
						class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
						onclick={handleRemove}
					>
						<RotateCcw class="size-3" />
						Remove custom icon
					</button>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
