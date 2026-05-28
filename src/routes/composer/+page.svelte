<script lang="ts">
	let text = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		textareaEl?.focus();
	});
</script>

<div class="composer-root">
	<textarea
		bind:this={textareaEl}
		bind:value={text}
		placeholder="Quick capture..."
		spellcheck="false"
		aria-label="Quick capture composer"
	></textarea>
</div>

<style>
	:global(html, body) {
		background: transparent;
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}

	.composer-root {
		display: flex;
		width: 100vw;
		height: 100vh;
		padding: 12px;
		box-sizing: border-box;
		background: rgba(30, 30, 32, 0.92);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 12px;
	}

	textarea {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		color: rgba(255, 255, 255, 0.92);
		font-family: -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 14px;
		line-height: 1.5;
	}

	textarea::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}
</style>
