<script lang="ts">
	interface Props {
		/** Whether the dialog is open */
		open: boolean;
		/** Callback when a URL is submitted */
		onSubmit: (url: string, label?: string) => void;
		/** Callback to close the dialog */
		onClose: () => void;
	}

	let { open, onSubmit, onClose }: Props = $props();

	let url = $state('');
	let label = $state('');
	let urlInputEl: HTMLInputElement | undefined = $state();

	function handleSubmit() {
		const trimmed = url.trim();
		if (!trimmed) return;
		// Auto-add https:// if no protocol (case-insensitive check)
		const finalUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
		onSubmit(finalUrl, label.trim() || undefined);
		url = '';
		label = '';
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			url = '';
			label = '';
			onClose();
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
	}

	$effect(() => {
		if (open) {
			requestAnimationFrame(() => urlInputEl?.focus());
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="link-backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={handleKeydown}>
		<div class="link-dialog">
			<div class="link-title">Add link</div>
			<input
				bind:this={urlInputEl}
				bind:value={url}
				onkeydown={handleKeydown}
				class="link-input"
				placeholder="https://example.com"
			/>
			<input
				bind:value={label}
				onkeydown={handleKeydown}
				class="link-input label-input"
				placeholder="Title (optional)"
			/>
			<div class="link-actions">
				<button class="btn-cancel" onclick={onClose}>Cancel</button>
				<button class="btn-ok" onclick={handleSubmit} disabled={!url.trim()}>Add</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.link-backdrop {
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
		padding-top: 20vh;
	}

	.link-dialog {
		background: var(--background);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		width: 360px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		padding: 16px;
	}

	.link-title {
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 12px;
		color: var(--foreground);
	}

	.link-input {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--foreground);
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
	}

	.link-input:focus {
		border-color: var(--primary);
	}

	.link-input.label-input {
		margin-top: 8px;
	}

	.link-input::placeholder {
		color: var(--muted-foreground);
	}

	.link-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 12px;
	}

	.btn-cancel,
	.btn-ok {
		padding: 6px 14px;
		border-radius: 6px;
		font-size: 12px;
		cursor: pointer;
		border: none;
	}

	.btn-cancel {
		background: transparent;
		color: var(--muted-foreground);
	}

	.btn-cancel:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.btn-ok {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-ok:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
