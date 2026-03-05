<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import ImageIcon from '@lucide/svelte/icons/image';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import type { AutoMoveRule } from './auto-move.types';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { validateExpression } from './auto-move.logic';

	let {
		rule,
		isFirst,
		isLast,
		onupdate,
		onremove,
		onmoveup,
		onmovedown,
	}: {
		rule: AutoMoveRule;
		isFirst: boolean;
		isLast: boolean;
		onupdate: (id: string, updates: Partial<AutoMoveRule>) => void;
		onremove: (id: string) => void;
		onmoveup: (id: string) => void;
		onmovedown: (id: string) => void;
	} = $props();

	let expressionError = $state<string | null>(null);
	let iconPickerOpen = $state(false);

	function handleExpressionChange(value: string) {
		expressionError = validateExpression(value);
		onupdate(rule.id, { expression: value });
	}

	function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		onupdate(rule.id, { icon: { iconPack: pack, iconName: name, color, textColor } });
		iconPickerOpen = false;
	}

	function handleIconRemove() {
		onupdate(rule.id, { icon: undefined });
		iconPickerOpen = false;
	}

	/** Resolve the icon for rendering (sync lookup from cache) */
	function getResolvedIcon() {
		if (!rule.icon) return null;
		return getIconSync(rule.icon.iconPack, rule.icon.iconName) ?? null;
	}
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-setting-item-bg p-3">
	<!-- Header row: name + enable toggle + move + delete -->
	<div class="flex items-center gap-2">
		<Input
			class="flex-1 text-sm font-medium"
			value={rule.name}
			placeholder="Rule name"
			oninput={(e) => onupdate(rule.id, { name: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Switch
			checked={rule.enabled}
			onCheckedChange={(enabled) => onupdate(rule.id, { enabled })}
		/>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isFirst}
			onclick={() => onmoveup(rule.id)}
		>
			<ChevronUpIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isLast}
			onclick={() => onmovedown(rule.id)}
		>
			<ChevronDownIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7 text-destructive hover:text-destructive"
			onclick={() => onremove(rule.id)}
		>
			<TrashIcon class="size-3.5" />
		</Button>
	</div>

	<!-- Expression input -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-2">
			<span class="text-xs text-muted-foreground w-20 shrink-0">Expression</span>
			<div class="relative flex-1">
				<Input
					class="pr-7 text-xs font-mono {expressionError ? 'border-destructive' : ''}"
					value={rule.expression}
					placeholder="file.hasTag('archive') && status == 'done'"
					oninput={(e) => handleExpressionChange((e.currentTarget as HTMLInputElement).value)}
				/>
				{#if rule.expression.trim()}
					<div class="absolute right-2 top-1/2 -translate-y-1/2">
						{#if expressionError}
							<CircleXIcon class="size-3.5 text-destructive" />
						{:else}
							<CircleCheckIcon class="size-3.5 text-green-500" />
						{/if}
					</div>
				{/if}
			</div>
		</div>
		{#if expressionError && rule.expression.trim()}
			<p class="ml-[5.5rem] text-xs text-destructive">{expressionError}</p>
		{/if}
	</div>

	<!-- Destination folder + icon row -->
	<div class="flex items-center gap-2">
		<span class="text-xs text-muted-foreground w-20 shrink-0">Destination</span>
		<Input
			class="flex-1 text-xs"
			value={rule.destination}
			placeholder="Archive/done"
			oninput={(e) => onupdate(rule.id, { destination: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Button
			variant="outline"
			size="icon"
			class="size-7 shrink-0"
			title={rule.icon ? `Icon: ${rule.icon.iconPack}:${rule.icon.iconName}` : 'Set file icon'}
			onclick={() => iconPickerOpen = true}
		>
			{@const resolvedIcon = getResolvedIcon()}
			{#if resolvedIcon}
				<IconRenderer icon={resolvedIcon} class="size-3.5" color={rule.icon?.color} />
			{:else}
				<ImageIcon class="size-3.5 text-muted-foreground" />
			{/if}
		</Button>
	</div>
</div>

<IconPicker
	bind:open={iconPickerOpen}
	currentPack={rule.icon?.iconPack}
	currentName={rule.icon?.iconName}
	currentColor={rule.icon?.color}
	currentTextColor={rule.icon?.textColor}
	onSelect={handleIconSelect}
	onRemove={handleIconRemove}
	onClose={() => iconPickerOpen = false}
/>
