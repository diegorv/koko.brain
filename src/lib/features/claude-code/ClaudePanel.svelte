<script lang="ts">
	import { tick, untrack } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '#lib/components/ui/button/index.js';
	import { filterAndRank, flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
	import { relativePath } from '#lib/utils/path.js';
	import { error } from '#lib/utils/debug.js';
	import { checkClaudeStatus } from './claude-code.service';
	import { claudeStatusStore } from './claude-status.store.svelte';
	import { filterSlashCommands, renderReplyHtml, replyLinkAction, slashQuery } from './claude.logic';
	import { newChat, sendPrompt, stop, STOP_FAILED } from './claude.service';
	import { claudeStore } from './claude.store.svelte';

	interface Props {
		/** Opens a wikilink target from a reply, the way a click in the editor does. */
		onOpenWikilink: (target: string) => void | Promise<void>;
		/** Opens a web link from a reply in the browser. */
		onOpenExternal: (url: string) => void | Promise<void>;
	}

	let { onOpenWikilink, onOpenExternal }: Props = $props();

	/** Most note picker results shown at once. */
	const MAX_PICKER_RESULTS = 8;
	/** Distance in px from the bottom of the message list within which it follows new content. */
	const FOLLOW_THRESHOLD = 32;

	let prompt = $state('');
	let promptEl = $state<HTMLTextAreaElement | null>(null);
	let slashMenuEl = $state<HTMLDivElement | null>(null);
	let messagesEl = $state<HTMLDivElement | null>(null);
	/**
	 * Whether the message list was near its bottom, and not moving up, at the user's last scroll.
	 * Growing content fires no scroll event, so this is the position before an
	 * update. Not reactive: only the follow effect reads it.
	 */
	let following = true;
	/**
	 * `scrollTop` at the last scroll event or follow. A scroll up from it leaves
	 * the bottom even within the threshold: a slow trackpad scroll moves a few
	 * px per event, and each streamed delta would snap it back.
	 */
	let lastScrollTop = 0;
	/** The prompt had focus when the running turn was sent, so it gets it back when the turn ends. */
	let refocusPrompt = false;
	/** Highlighted row of the slash menu. */
	let slashIndex = $state(0);
	/** Escape closes the slash menu until the prompt changes. */
	let slashDismissed = $state(false);
	let pickerOpen = $state(false);
	let pickerQuery = $state('');

	const query = $derived(slashDismissed ? null : slashQuery(prompt));
	const slashMatches = $derived(query === null ? [] : filterSlashCommands(query, claudeStore.slashCommands));
	const pickerResults = $derived.by(() => {
		if (!pickerOpen) return [];
		const notes = flattenFileTree(fsStore.fileTree).filter((f) => /\.md$/i.test(f.path));
		return filterAndRank(pickerQuery, notes, quickSwitcherStore.recentPaths).slice(0, MAX_PICKER_RESULTS);
	});

	// Checks for claude once per mount, without recapturing the login shell env:
	// the panel remounts when a canvas, kanban or view tab hides the right
	// sidebar. The status is shared, so a check from Settings updates the open
	// panel. Attaching the active note on open is AppShell's, so a remount does
	// not bring back a chip the user removed.
	$effect(() => {
		untrack(() => {
			// The store marks a failed check; the unavailable block shows it.
			checkClaudeStatus(settingsStore.claudeCode.binaryPath, false).catch(() => {});
		});
	});

	// Follows the chat: every event replaces the messages, so a new message,
	// a tool card and each streamed delta re-run this.
	$effect(() => {
		void claudeStore.messages;
		untrack(() => {
			void tick().then(() => {
				if (!following || !messagesEl) return;
				messagesEl.scrollTop = messagesEl.scrollHeight;
				lastScrollTop = messagesEl.scrollTop;
			});
		});
	});

	// The prompt is disabled while a turn runs, and WKWebView drops its focus.
	// When the turn ends, the prompt gets it back unless the user moved focus
	// elsewhere meanwhile (a note they type in keeps its keystrokes).
	$effect(() => {
		const running = claudeStore.isRunning;
		untrack(() => {
			if (running || !refocusPrompt) return;
			refocusPrompt = false;
			void tick().then(() => {
				const active = document.activeElement;
				if (active === null || active === document.body || active === promptEl) promptEl?.focus();
			});
		});
	});

	function onMessagesScroll(): void {
		if (!messagesEl) return;
		const top = messagesEl.scrollTop;
		following = top >= lastScrollTop && messagesEl.scrollHeight - top - messagesEl.clientHeight <= FOLLOW_THRESHOLD;
		lastScrollTop = top;
	}

	function noteName(path: string): string {
		return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
	}

	function onPromptInput(): void {
		slashDismissed = false;
		slashIndex = 0;
	}

	async function pickSlashCommand(name: string): Promise<void> {
		prompt = `/${name} `;
		slashIndex = 0;
		await tick();
		promptEl?.focus();
	}

	/** Scrolls the highlighted slash command into the menu's view, so Enter never inserts a command the user did not see. */
	async function revealSlashOption(): Promise<void> {
		await tick();
		slashMenuEl?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
	}

	function onPromptKeydown(e: KeyboardEvent): void {
		// Keys of an IME composition belong to the IME. WebKit sends the
		// confirming Enter after compositionend, with isComposing false and keyCode 229.
		if (e.isComposing || e.keyCode === 229) return;
		if (query !== null && slashMatches.length > 0) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				const step = e.key === 'ArrowDown' ? 1 : -1;
				slashIndex = (slashIndex + step + slashMatches.length) % slashMatches.length;
				void revealSlashOption();
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				void pickSlashCommand(slashMatches[Math.min(slashIndex, slashMatches.length - 1)]);
				return;
			}
		}
		if (query !== null && e.key === 'Escape') {
			e.preventDefault();
			slashDismissed = true;
			return;
		}
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function send(): void {
		const text = prompt;
		if (claudeStore.isRunning || text.trim() === '') return;
		prompt = '';
		refocusPrompt = document.activeElement === promptEl;
		// The store shows the failure inline; nothing else to do here.
		sendPrompt(text).catch(() => {});
	}

	function onStop(): void {
		stop().catch(() => {
			claudeStore.showError(STOP_FAILED);
		});
	}

	function addNote(path: string): void {
		if (vaultStore.path) claudeStore.addContextNote(relativePath(vaultStore.path, path));
		pickerOpen = false;
		pickerQuery = '';
	}

	function onReplyClick(e: MouseEvent): void {
		const anchor = (e.target as Element | null)?.closest('a');
		if (!anchor) return;
		e.preventDefault();
		const action = replyLinkAction(anchor.getAttribute('href'));
		const opened = action?.kind === 'wikilink' ? onOpenWikilink(action.target) : action?.kind === 'external' ? onOpenExternal(action.url) : undefined;
		Promise.resolve(opened).catch((err) => error('CLAUDE', 'Failed to open a link from a reply:', err));
	}
</script>

<section class="flex h-full min-h-0 flex-col" data-claude-panel>
	<div class="pane-toolbar w-full justify-between">
		<h2 class="text-title text-right-sidebar-primary">Claude</h2>
		<Button variant="ghost" size="sm" disabled={claudeStore.isRunning} onclick={newChat}>New chat</Button>
	</div>

	{#if claudeStatusStore.unavailable}
		<div class="flex flex-col gap-2 p-3" data-claude-unavailable>
			<p class="text-right-sidebar-muted-fg">
				{claudeStatusStore.checkFailed
					? 'Could not check for the claude command. Try again from Settings, or restart Kokobrain.'
					: `Claude Code is not available: ${claudeStatusStore.status?.error ?? 'claude was not found.'}`}
			</p>
			<Button variant="outline" size="sm" onclick={() => settingsPanelStore.open('claude-code')}>Open Claude Code settings</Button>
		</div>
	{:else}
		<div bind:this={messagesEl} class="min-h-0 flex-1 overflow-y-auto p-3" onscroll={onMessagesScroll} data-claude-messages>
			{#if claudeStore.messages.length === 0}
				<p class="text-right-sidebar-muted-fg" data-claude-empty>
					Ask Claude about the attached notes, or about the whole vault when none are attached.
				</p>
			{/if}
			{#each claudeStore.messages as message, i (i)}
				{#if message.role === 'user'}
					<div class="mb-3 whitespace-pre-wrap rounded-md bg-right-sidebar-accent px-2 py-1.5" data-claude-message="user">{message.text}</div>
				{:else}
					<div class="mb-3 flex flex-col gap-1.5" data-claude-message="assistant">
						{#each message.parts as part, j (j)}
							{#if part.kind === 'text'}
								<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
								<div class="claude-reply" data-claude-text onclick={onReplyClick}>
									{@html renderReplyHtml(part.text)}
								</div>
							{:else}
								<details class="rounded-md border border-divider" data-claude-tool={part.status}>
									<summary class="flex cursor-default items-baseline gap-1.5 px-2 py-1">
										<span class="font-medium" data-claude-tool-name>{part.name}</span>
										<span class="min-w-0 truncate text-right-sidebar-muted-fg" data-claude-tool-target>{part.target}</span>
										<span class="ml-auto shrink-0 text-right-sidebar-muted-fg">
											{part.status === 'error' ? 'failed' : part.status}
										</span>
									</summary>
									{#if part.summary}
										<pre class="max-h-40 overflow-auto whitespace-pre-wrap px-2 py-1 text-meta">{part.summary}</pre>
									{/if}
								</details>
							{/if}
						{/each}
					</div>
				{/if}
			{/each}
			{#if claudeStore.error}
				<p class="text-destructive" role="alert" data-claude-error>{claudeStore.error}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-2 border-t border-divider p-3">
			<div class="flex flex-wrap items-center gap-1" data-claude-chips>
				{#each claudeStore.contextNotes as path (path)}
					<span class="inline-flex items-center gap-0.5 rounded-md bg-right-sidebar-accent px-1.5 py-0.5" title={path} data-claude-chip={path}>
						{noteName(path)}
						<button
							class="inline-flex size-4 items-center justify-center rounded-sm hover:bg-right-sidebar-accent/50"
							aria-label={`Remove ${noteName(path)}`}
							onclick={() => claudeStore.removeContextNote(path)}
						><X class="size-3" /></button>
					</span>
				{/each}
				<button
					class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-right-sidebar-muted-fg hover:bg-right-sidebar-accent/50"
					onclick={() => (pickerOpen = !pickerOpen)}
					data-claude-add-note
				><Plus class="size-3" />Add note</button>
			</div>

			{#if pickerOpen}
				<div class="flex flex-col gap-1" data-claude-note-picker>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						class="rounded-md border border-divider bg-transparent px-2 py-1"
						placeholder="Type a note name..."
						bind:value={pickerQuery}
						onkeydown={(e) => { if (e.key === 'Escape') pickerOpen = false; }}
						autofocus
					/>
					{#each pickerResults as file (file.path)}
						<button
							class="truncate rounded-md px-2 py-1 text-left hover:bg-right-sidebar-accent/50"
							title={file.path}
							onclick={() => addNote(file.path)}
							data-claude-note-option={file.path}
						>{file.nameWithoutExt}</button>
					{:else}
						<p class="px-2 text-right-sidebar-muted-fg">No notes found.</p>
					{/each}
				</div>
			{/if}

			{#if claudeStore.isRunning}
				<p class="text-meta text-right-sidebar-muted-fg" data-claude-running-notice>
					Claude is working. Editing a note Claude is changing can overwrite its edit.
				</p>
			{/if}

			<div class="relative">
				{#if query !== null}
					<div bind:this={slashMenuEl} class="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-divider bg-right-sidebar-bg shadow" role="listbox" data-claude-slash-menu>
						{#each slashMatches as name, k (name)}
							<button
								class="block w-full truncate px-2 py-1 text-left {k === slashIndex ? 'bg-right-sidebar-accent' : ''}"
								role="option"
								aria-selected={k === slashIndex}
								onmousedown={(e) => e.preventDefault()}
								onclick={() => void pickSlashCommand(name)}
								data-claude-slash-option={name}
							>/{name}</button>
						{:else}
							<p class="px-2 py-1 text-right-sidebar-muted-fg" data-claude-slash-empty>
								{claudeStore.slashCommands.length === 0 ? 'Slash commands load after the first message.' : 'No matching command.'}
							</p>
						{/each}
					</div>
				{/if}
				<textarea
					bind:this={promptEl}
					bind:value={prompt}
					class="block w-full resize-none rounded-md border border-divider bg-transparent px-2 py-1.5"
					rows="3"
					placeholder="Ask Claude, or type / for commands"
					disabled={claudeStore.isRunning}
					oninput={onPromptInput}
					onkeydown={onPromptKeydown}
					data-claude-prompt
				></textarea>
			</div>

			<div class="flex justify-end">
				{#if claudeStore.isRunning}
					<Button variant="outline" size="sm" onclick={onStop}>Stop</Button>
				{:else}
					<Button size="sm" disabled={prompt.trim() === ''} onclick={send}>Send</Button>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.claude-reply :global(p) { margin: 0 0 0.5em; }
	.claude-reply :global(p:last-child) { margin-bottom: 0; }
	.claude-reply :global(ul), .claude-reply :global(ol) { margin: 0 0 0.5em; padding-left: 1.25em; }
	.claude-reply :global(ul) { list-style: disc; }
	.claude-reply :global(ol) { list-style: decimal; }
	.claude-reply :global(pre) { overflow-x: auto; white-space: pre-wrap; }
	.claude-reply :global(a) { text-decoration: underline; cursor: pointer; }
</style>
