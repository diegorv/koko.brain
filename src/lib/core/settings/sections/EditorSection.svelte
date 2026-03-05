<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { settingsStore } from '../settings.store.svelte';
	import { clampFontSize, clampLineHeight, clampContentWidth, clampParagraphSpacing } from '../settings.logic';
	import SettingItem from './SettingItem.svelte';
	import HeadingTypographyEditor from './HeadingTypographyEditor.svelte';

	let { onchange }: { onchange: () => void } = $props();

	let fontPickerOpen = $state(false);
	let systemFonts = $state<string[]>([]);
	let fontSearch = $state('');

	onMount(async () => {
		try {
			systemFonts = await invoke<string[]>('list_system_fonts');
		} catch {
			systemFonts = [];
		}
	});

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	function selectFont(font: string) {
		settingsStore.updateEditor({ fontFamily: font });
		onchange();
		fontPickerOpen = false;
		fontSearch = '';
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Editor</h2>

	<SettingItem
		label="Font family"
		description="CSS font-family value for the editor"
	>
		<div class="flex gap-1">
			<Input
				value={settingsStore.editor.fontFamily}
				oninput={(e) => {
					settingsStore.updateEditor({ fontFamily: inputValue(e) });
					onchange();
				}}
			/>
			{#if systemFonts.length > 0}
				<Popover.Root bind:open={fontPickerOpen}>
					<Popover.Trigger
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
					>
						Browse
					</Popover.Trigger>
					<Popover.Content class="w-64 p-0" align="end">
						<Command.Root>
							<Command.Input
								bind:value={fontSearch}
								placeholder="Search fonts..."
							/>
							<Command.List class="max-h-64 overflow-y-auto">
								<Command.Empty>No fonts found.</Command.Empty>
								<Command.Group>
									{#each systemFonts.filter(f =>
										fontSearch.length === 0 || f.toLowerCase().includes(fontSearch.toLowerCase())
									).slice(0, 100) as font (font)}
										<Command.Item
											value={font}
											onSelect={() => selectFont(font)}
											class="font-[{font}]"
										>
											{font}
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>
	</SettingItem>

	<SettingItem
		label="Font size"
		description="Font size in pixels (8–32)"
	>
		<Input
			type="number"
			class="w-24"
			min={8}
			max={32}
			value={String(settingsStore.editor.fontSize)}
			oninput={(e) => {
				settingsStore.updateEditor({ fontSize: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampFontSize(Number(inputValue(e)));
				settingsStore.updateEditor({ fontSize: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Line height"
		description="Line height multiplier (1.0–3.0)"
	>
		<Input
			type="number"
			class="w-24"
			min={1}
			max={3}
			step={0.1}
			value={String(settingsStore.editor.lineHeight)}
			oninput={(e) => {
				settingsStore.updateEditor({ lineHeight: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampLineHeight(Number(inputValue(e)));
				settingsStore.updateEditor({ lineHeight: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Content width"
		description="Maximum content width in pixels (0 = no limit)"
	>
		<Input
			type="number"
			class="w-24"
			min={0}
			max={2000}
			step={10}
			value={String(settingsStore.editor.contentWidth)}
			oninput={(e) => {
				settingsStore.updateEditor({ contentWidth: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampContentWidth(Number(inputValue(e)));
				settingsStore.updateEditor({ contentWidth: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Paragraph spacing"
		description="Extra space after each line, in em (0 = none, e.g. 0.5)"
	>
		<Input
			type="number"
			class="w-24"
			min={0}
			max={2}
			step={0.1}
			value={String(settingsStore.editor.paragraphSpacing)}
			oninput={(e) => {
				settingsStore.updateEditor({ paragraphSpacing: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampParagraphSpacing(Number(inputValue(e)));
				settingsStore.updateEditor({ paragraphSpacing: val });
				onchange();
			}}
		/>
	</SettingItem>

	<HeadingTypographyEditor {onchange} />
</div>
