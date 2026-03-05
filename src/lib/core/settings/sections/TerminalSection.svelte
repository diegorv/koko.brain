<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { settingsStore } from '../settings.store.svelte';
	import { clampTerminalFontSize, clampTerminalLineHeight } from '../settings.logic';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Terminal</h2>

	<SettingItem
		label="Font family"
		description="CSS font-family value for the terminal"
	>
		<Input
			value={settingsStore.terminal.fontFamily}
			oninput={(e) => {
				settingsStore.updateTerminal({ fontFamily: inputValue(e) });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Font size"
		description="Font size in pixels (8–24)"
	>
		<Input
			type="number"
			class="w-24"
			min={8}
			max={24}
			value={String(settingsStore.terminal.fontSize)}
			oninput={(e) => {
				settingsStore.updateTerminal({ fontSize: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampTerminalFontSize(Number(inputValue(e)));
				settingsStore.updateTerminal({ fontSize: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Line height"
		description="Line height multiplier (1.0–2.0)"
	>
		<Input
			type="number"
			class="w-24"
			min={1}
			max={2}
			step={0.1}
			value={String(settingsStore.terminal.lineHeight)}
			oninput={(e) => {
				settingsStore.updateTerminal({ lineHeight: Number(inputValue(e)) });
				onchange();
			}}
			onblur={(e) => {
				const val = clampTerminalLineHeight(Number(inputValue(e)));
				settingsStore.updateTerminal({ lineHeight: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Shell"
		description="Shell executable path (leave empty for system default)"
	>
		<Input
			value={settingsStore.terminal.shell}
			placeholder="System default ($SHELL)"
			oninput={(e) => {
				settingsStore.updateTerminal({ shell: inputValue(e) });
				onchange();
			}}
		/>
	</SettingItem>
</div>
