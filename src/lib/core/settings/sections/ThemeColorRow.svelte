<script lang="ts">
	import { isValidHex, normalizeHex, hexToColorInputValue } from '../theme-editor.logic';

	let { label, value, onchange }: { label: string; value: string; onchange: (v: string) => void } = $props();

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

<div class="flex items-center justify-between gap-3 py-1.5">
	<span class="min-w-0 flex-1 truncate text-sm text-settings-text">{label}</span>
	<div class="flex shrink-0 items-center gap-2">
		<!-- Color swatch with hidden native picker -->
		<label
			class="relative size-7 cursor-pointer overflow-hidden rounded border border-border"
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
		<input
			type="text"
			class="h-7 w-[5.5rem] rounded border border-input bg-input-bg px-2 font-mono text-xs text-settings-text"
			value={textValue}
			oninput={handleTextInput}
			onblur={handleTextBlur}
			onkeydown={handleTextKeydown}
			maxlength={9}
		/>
	</div>
</div>
