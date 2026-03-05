<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { settingsStore } from '../settings.store.svelte';
	import {
		clampHeadingFontSize,
		clampHeadingLineHeight,
		clampHeadingLetterSpacing,
	} from '../settings.logic';
	import type { HeadingTypography, HeadingFontWeight } from '../settings.types';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
	const LEVEL_LABELS: Record<string, string> = {
		h1: 'Heading 1',
		h2: 'Heading 2',
		h3: 'Heading 3',
		h4: 'Heading 4',
		h5: 'Heading 5',
		h6: 'Heading 6',
	};

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	function updateLevel(level: keyof HeadingTypography, prop: string, value: number | string) {
		const current = settingsStore.editor.headingTypography;
		settingsStore.updateEditor({
			headingTypography: {
				...current,
				[level]: { ...current[level], [prop]: value },
			},
		});
		onchange();
	}
</script>

<div class="mt-4 flex flex-col gap-2">
	<h3 class="mb-1 text-sm font-semibold text-primary">Heading Typography</h3>

	{#each LEVELS as level}
		{@const settings = settingsStore.editor.headingTypography[level]}
		<details class="group rounded-lg bg-setting-item-bg">
			<summary class="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium text-settings-text">
				<span>{LEVEL_LABELS[level]}</span>
				<span class="text-xs text-muted-foreground">
					{settings.fontSize}em, {settings.fontWeight}
				</span>
			</summary>
			<div class="flex flex-col gap-1.5 px-4 pb-3">
				<SettingItem label="Font size" description="Size in em (0.5–5.0)">
					<Input
						type="number"
						class="w-24"
						min={0.5}
						max={5}
						step={0.05}
						value={String(settings.fontSize)}
						oninput={(e) => updateLevel(level, 'fontSize', Number(inputValue(e)))}
						onblur={(e) => updateLevel(level, 'fontSize', clampHeadingFontSize(Number(inputValue(e))))}
					/>
				</SettingItem>

				<SettingItem label="Line height" description="Multiplier (1.0–3.0)">
					<Input
						type="number"
						class="w-24"
						min={1}
						max={3}
						step={0.1}
						value={String(settings.lineHeight)}
						oninput={(e) => updateLevel(level, 'lineHeight', Number(inputValue(e)))}
						onblur={(e) => updateLevel(level, 'lineHeight', clampHeadingLineHeight(Number(inputValue(e))))}
					/>
				</SettingItem>

				<SettingItem label="Font weight">
					<select
						class="h-9 w-24 rounded-md border border-input bg-input-bg px-2 text-sm text-settings-text"
						value={settings.fontWeight}
						onchange={(e) => updateLevel(level, 'fontWeight', (e.currentTarget as HTMLSelectElement).value as HeadingFontWeight)}
					>
						<option value="bold">Bold</option>
						<option value="semibold">Semibold</option>
						<option value="normal">Normal</option>
					</select>
				</SettingItem>

				<SettingItem label="Letter spacing" description="In em (-0.1 to 0.1)">
					<Input
						type="number"
						class="w-24"
						min={-0.1}
						max={0.1}
						step={0.005}
						value={String(settings.letterSpacing)}
						oninput={(e) => updateLevel(level, 'letterSpacing', Number(inputValue(e)))}
						onblur={(e) => updateLevel(level, 'letterSpacing', clampHeadingLetterSpacing(Number(inputValue(e))))}
					/>
				</SettingItem>
			</div>
		</details>
	{/each}
</div>
