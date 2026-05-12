<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Sparkles, Send, Loader2, FileText } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { ragStore } from './rag.store.svelte';
	import { fetchRagConfigStatus, startRagChat } from './rag.service';
	import type { RagConfigStatus, RetrievedChunk } from './rag.types';
	import type { UnlistenFn } from '@tauri-apps/api/event';

	let query = $state('');
	let configStatus = $state<RagConfigStatus | null>(null);
	let activeUnlisten: UnlistenFn | null = $state(null);

	// Refresh the config status when the vault path is known.
	$effect(() => {
		const path = vaultStore.path;
		if (!path) {
			configStatus = null;
			return;
		}
		fetchRagConfigStatus(path)
			.then((status) => { configStatus = status; })
			.catch(() => { configStatus = null; });
	});

	onDestroy(async () => {
		if (activeUnlisten) {
			await activeUnlisten();
			activeUnlisten = null;
		}
	});

	function buildAbsolutePath(chunk: RetrievedChunk): string {
		const base = vaultStore.path ?? '';
		// Chunks store vault-relative paths; absolute paths get used by
		// the editor service (path-traversal protection lives in Rust).
		// On Windows the path separator is `\`; the existing fs.service
		// normalizes either form, but be polite and use `/`.
		const separator = base.endsWith('/') || base.endsWith('\\') ? '' : '/';
		return `${base}${separator}${chunk.path}`;
	}

	async function handleSourceClick(chunk: RetrievedChunk) {
		const abs = buildAbsolutePath(chunk);
		await openFileInEditor(abs, chunk.lineStart);
	}

	async function handleAsk() {
		const trimmed = query.trim();
		const path = vaultStore.path;
		if (!trimmed || !path || ragStore.streaming) return;

		// Tear down any previous listeners before opening a new round.
		if (activeUnlisten) {
			await activeUnlisten();
			activeUnlisten = null;
		}

		activeUnlisten = await startRagChat(path, trimmed);
		query = '';
	}

	function handleKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleAsk();
		}
	}

	function snippet(text: string): string {
		const collapsed = text.replace(/\s+/g, ' ').trim();
		return collapsed.length > 220 ? `${collapsed.slice(0, 217)}…` : collapsed;
	}
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Chat</h2>
		<Sparkles class="size-3.5 ml-auto text-muted-foreground" />
	</div>
	<Separator />

	<div class="flex flex-col gap-2 p-2 max-h-[50vh] overflow-y-auto">
		{#if !vaultStore.isOpen}
			<p class="text-muted-foreground px-2 py-4 text-center">Open a vault to chat.</p>
		{:else if configStatus && !configStatus.configExists}
			<div class="text-muted-foreground px-2 py-4 text-sm">
				<p class="mb-2 font-medium">RAG not configured.</p>
				<p>
					Create <code class="text-xs">.kokobrain/rag.toml</code> in your vault.
					A sample is at <code class="text-xs">docs/rag.toml.example</code>.
				</p>
			</div>
		{:else if configStatus && !configStatus.configValid}
			<div class="text-muted-foreground px-2 py-4 text-sm">
				<p class="font-medium mb-2">RAG config error:</p>
				<p class="font-mono text-xs">{configStatus.error}</p>
			</div>
		{:else if configStatus && !configStatus.apiKeyResolved}
			<div class="text-muted-foreground px-2 py-4 text-sm">
				<p class="font-medium mb-2">API key missing.</p>
				<p class="text-xs">{configStatus.error}</p>
			</div>
		{:else}
			<div class="flex gap-2 items-end">
				<textarea
					class="flex-1 resize-none rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
					rows="2"
					placeholder="Ask about your notes…"
					bind:value={query}
					onkeydown={handleKey}
					disabled={ragStore.streaming}
				></textarea>
				<Button
					size="sm"
					variant="default"
					onclick={handleAsk}
					disabled={ragStore.streaming || query.trim().length === 0}
				>
					{#if ragStore.streaming}
						<Loader2 class="size-3.5 animate-spin" />
					{:else}
						<Send class="size-3.5" />
					{/if}
				</Button>
			</div>

			{#if ragStore.error}
				<div class="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
					{ragStore.error}
				</div>
			{/if}

			{#if ragStore.response.length > 0 || ragStore.streaming}
				<div class="rounded-md border border-border bg-tab-bar p-2 text-sm whitespace-pre-wrap">
					{ragStore.response}
					{#if ragStore.streaming}
						<span class="inline-block w-2 h-4 bg-foreground/40 align-middle animate-pulse ml-0.5"></span>
					{/if}
				</div>
			{/if}

			{#if ragStore.sources.length > 0}
				<div class="mt-1">
					<p class="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">Sources</p>
					<div class="flex flex-col gap-1">
						{#each ragStore.sources as src, i (src.path + i)}
							<button
								type="button"
								class="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors"
								onclick={() => handleSourceClick(src)}
							>
								<span class="flex items-center gap-1.5 text-xs font-medium">
									<FileText class="size-3 shrink-0 text-muted-foreground" />
									{src.path}
									{#if src.headingPath.length > 0 && src.headingPath[0]}
										<span class="text-muted-foreground">› {src.headingPath[0]}</span>
									{/if}
									<span class="text-muted-foreground ml-auto">L{src.lineStart}</span>
								</span>
								<span class="text-xs text-muted-foreground line-clamp-2">
									{snippet(src.text)}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
