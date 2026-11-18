<script lang="ts">
	import { onMount } from 'svelte';
	import { call } from '#lib/contracts/ipc.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { quoteFontFamily } from '#lib/utils/font-stacks.js';
	import { settingsStore } from '../settings.store.svelte';
	import { clampFontSize, clampLineHeight, clampContentWidth, clampParagraphSpacing } from '../settings.logic';
	import SettingItem from './SettingItem.svelte';
	import HeadingTypographyEditor from './HeadingTypographyEditor.svelte';

	let fontPickerOpen = $state(false);
	let systemFonts = $state<string[]>([]);
	let fontSearch = $state('');

	onMount(async () => {
		try {
			systemFonts = await call('list_system_fonts');
		} catch {
			systemFonts = [];
		}
	});

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	/** The field's number, or `null` when it is empty or not a finite number (`Number('')` is 0). */
	function typedNumber(e: Event): number | null {
		const raw = inputValue(e);
		if (raw.trim() === '') return null;
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	}

	/**
	 * Live preview while typing: writes only a value its clamp leaves unchanged,
	 * so a half-typed or cleared field never reaches the editor.
	 */
	function writeInRange(e: Event, clampFn: (n: number) => number, write: (n: number) => void) {
		const n = typedNumber(e);
		if (n !== null && clampFn(n) === n) write(n);
	}

	/**
	 * On commit: writes the clamped value (nothing for an empty or non-numeric field),
	 * then shows the stored value. The field is set by hand because Svelte skips the
	 * DOM write when the bound value did not change.
	 */
	function commitClamped(e: Event, clampFn: (n: number) => number, write: (n: number) => void, stored: () => number) {
		const n = typedNumber(e);
		if (n !== null) write(clampFn(n));
		(e.currentTarget as HTMLInputElement).value = String(stored());
	}

	function selectFont(font: string) {
		settingsStore.updateEditor({ fontFamily: font });
		fontPickerOpen = false;
		fontSearch = '';
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Editor</h2>

	<h3 class="section-label mb-2">Text</h3>

	<SettingItem
		label="Font family"
		description="Fonts for the editor, comma-separated; the first one installed is used"
		layout="stacked"
	>
		<div class="flex gap-1">
			<Input
				value={settingsStore.editor.fontFamily}
				oninput={(e) => {
					settingsStore.updateEditor({ fontFamily: inputValue(e) });
				}}
			/>
			{#if systemFonts.length > 0}
				<Popover.Root bind:open={fontPickerOpen}>
					<Popover.Trigger class={buttonVariants({ variant: 'outline' })}>
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
											style="font-family: {quoteFontFamily(font)}"
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
			oninput={(e) => writeInRange(e, clampFontSize, (fontSize) => settingsStore.updateEditor({ fontSize }))}
			onchange={(e) => commitClamped(e, clampFontSize, (fontSize) => settingsStore.updateEditor({ fontSize }), () => settingsStore.editor.fontSize)}
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
			oninput={(e) => writeInRange(e, clampLineHeight, (lineHeight) => settingsStore.updateEditor({ lineHeight }))}
			onchange={(e) => commitClamped(e, clampLineHeight, (lineHeight) => settingsStore.updateEditor({ lineHeight }), () => settingsStore.editor.lineHeight)}
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
			oninput={(e) => writeInRange(e, clampParagraphSpacing, (paragraphSpacing) => settingsStore.updateEditor({ paragraphSpacing }))}
			onchange={(e) => commitClamped(e, clampParagraphSpacing, (paragraphSpacing) => settingsStore.updateEditor({ paragraphSpacing }), () => settingsStore.editor.paragraphSpacing)}
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Page</h3>

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
			oninput={(e) => writeInRange(e, clampContentWidth, (contentWidth) => settingsStore.updateEditor({ contentWidth }))}
			onchange={(e) => commitClamped(e, clampContentWidth, (contentWidth) => settingsStore.updateEditor({ contentWidth }), () => settingsStore.editor.contentWidth)}
		/>
	</SettingItem>

	<HeadingTypographyEditor />
</div>
