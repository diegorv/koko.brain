<script lang="ts">
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { ReadabilityFailure } from '../theme-builder.logic';
	import { camelCaseToLabel, isValidHex, normalizeHex, hexToColorInputValue } from '../theme-editor.logic';

	let {
		label,
		value,
		onchange,
		failure,
	}: {
		label: string;
		value: string;
		onchange: (v: string) => void;
		/** The worst readability pair this token fails, if any */
		failure?: ReadabilityFailure;
	} = $props();

	/** Id of the readability warning, which describes the hex input */
	const warningId = $props.id();

	/** The ratio floored to two decimals, so a value just under the minimum never reads as reaching it. */
	const shownRatio = $derived(failure ? (Math.floor(failure.ratio * 100) / 100).toFixed(2) : '');

	let textValue = $state('');
	let isEditing = $state(false);

	/** Keep text field in sync when the value prop changes externally (unless user is typing) */
	$effect(() => {
		if (!isEditing) {
			textValue = value;
		}
	});

	function handleColorPickerInput(e: Event) {
		const newValue = (e.currentTarget as HTMLInputElement).value;
		textValue = newValue;
		onchange(newValue);
	}

	function handleTextInput(e: Event) {
		isEditing = true;
		textValue = (e.currentTarget as HTMLInputElement).value;
	}

	function handleTextBlur() {
		isEditing = false;
		if (isValidHex(textValue)) {
			const normalized = normalizeHex(textValue);
			textValue = normalized;
			onchange(normalized);
		} else {
			// Revert to current value on invalid input
			textValue = value;
		}
	}

	function handleTextKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.currentTarget as HTMLInputElement).blur();
		}
	}
</script>

<div class="py-1.5" data-theme-color-row>
	<div class="flex items-center justify-between gap-3">
		<span class="min-w-0 flex-1 truncate text-row text-settings-text">{label}</span>
		<div class="flex shrink-0 items-center gap-2">
			<!-- Color swatch with hidden native picker; its settings-text edge stays visible on the dialog -->
			<label
				class="relative size-7 cursor-pointer overflow-hidden rounded-xs border border-settings-text"
				style="background-color: {value}"
			>
				<input
					type="color"
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					value={hexToColorInputValue(value)}
					oninput={handleColorPickerInput}
				/>
			</label>
			<!-- Hex text input -->
			<Input
				type="text"
				class="h-7 w-[5.5rem] px-2 font-mono text-meta md:text-meta"
				value={textValue}
				oninput={handleTextInput}
				onblur={handleTextBlur}
				onkeydown={handleTextKeydown}
				maxlength={9}
				aria-describedby={failure ? warningId : undefined}
			/>
		</div>
	</div>
	{#if failure}
		<p id={warningId} class="mt-1 flex items-center gap-1.5 text-meta text-muted-foreground" data-contrast-warning>
			<TriangleAlertIcon class="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
			{shownRatio}:1 on {camelCaseToLabel(failure.bgKey)}, needs {failure.min}:1. The app shows it lifted.
		</p>
	{/if}
</div>
