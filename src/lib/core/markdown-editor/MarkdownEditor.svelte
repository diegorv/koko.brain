<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
	import { EditorState, EditorSelection, Compartment, Transaction } from '@codemirror/state';
	import { Link, FileSymlink } from 'lucide-svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { findTabIndex, getPositionAfterFrontmatter } from '$lib/core/editor/editor.logic';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { applyHeadingTypography } from '$lib/core/settings/settings.service';
	import { onContentChange, openFileInEditor } from '$lib/core/editor/editor.service';
	import { isBinaryFile } from '$lib/core/filesystem/fs.logic';
	import { findWikilinkInfoAtPosition, findHeadingPosition, findBlockIdPosition } from './extensions/wikilink';
	import { livePreviewCompartment, livePreviewExtensions, forceDecorationRebuild } from './extensions/live-preview';
	import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { copyBlockLinkToClipboard, copyBlockEmbedToClipboard } from '$lib/features/copy-block-link/copy-block-link.service';
	import { createFile } from '$lib/core/filesystem/fs.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { detectPeriodicNoteType } from '$lib/plugins/periodic-notes/periodic-notes.logic';
	import { openOrCreatePeriodicNoteForDate } from '$lib/plugins/periodic-notes/periodic-notes.service';
	import { debug, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
	import { getLanguageEffects, getLanguageEffectsSync } from './highlight-styles';
	import { saveTabViewState, getTabViewState, deleteTabViewState } from './tab-view-state';
	import { buildEditorTheme, createExtensions } from './setup';
	import { findWikilinkElement } from './wikilink-click-target';

	let container: HTMLDivElement;
	let view: EditorView | undefined;
	let lastTabPath: string | undefined;
	/** Whether a tab switch is in progress (suppresses onContentChange from the doc replace) */
	let isTabSwitching = false;
	/**
	 * AbortController for the rAF chain queued at the end of the tab-switch
	 * effect. When the user switches tabs faster than the rAF can fire, the
	 * prior chain is aborted so a stale `forceDecorationRebuild` does not
	 * land on the new tab's view (Phase 4.4).
	 */
	let tabSwitchRafAbort: AbortController | null = null;
	const lineNumbersCompartment = new Compartment();
	const editorThemeCompartment = new Compartment();
	const languageCompartment = new Compartment();
	const highlightStyleCompartment = new Compartment();

	/** Reconfigures language parser and highlight style based on the active tab's file extension */
	async function applyLanguageForTab(tabName: string) {
		if (!view) return;
		const effects = await getLanguageEffects(tabName, languageCompartment, highlightStyleCompartment);
		view.dispatch({ effects });
	}

	async function handleEditorClick(e: MouseEvent) {
		if (!view) return;
		const el = findWikilinkElement(e.target);
		if (!el) return;

		// Capture-phase interception: this listener is registered with
		// `{ capture: true }` on the container, so it runs before any handler
		// inside `cm-editor`. `stopImmediatePropagation` prevents CodeMirror's
		// internal mousedown handler from firing — without that, CM would arm
		// its drag-select state machine, and the mouseup that lands AFTER the
		// async tab switch would commit a multi-line selection in the new doc
		// (which `shouldShowSource` then expands to source across blocks).
		e.preventDefault();
		e.stopImmediatePropagation();

		try {
			const pos = view.posAtDOM(el);
			const line = view.state.doc.lineAt(pos);
			const info = findWikilinkInfoAtPosition(line.text, line.from, pos);
			if (!info) return;

			const hasAnchor = info.heading !== null || info.blockId !== null;

			if (!info.target) {
				// Same-note reference: [[#heading]] or [[#^block-id]]
				if (!hasAnchor) return;
				const content = view.state.doc.toString();
				const anchorPos = info.heading
					? findHeadingPosition(content, info.heading)
					: findBlockIdPosition(content, info.blockId!);
				if (anchorPos !== null) {
					view.dispatch({
						selection: EditorSelection.cursor(anchorPos),
						scrollIntoView: true,
					});
					view.focus();
				}
				return;
			}

			// Image / audio / video / pdf wikilinks (`![[image.png]]`) — clicking
			// them in source view used to call `openFileInEditor` on the binary
			// path, which loaded the bytes as UTF-8 text and crashed the renderer.
			// The embed widget renders the asset; the click in source mode is a
			// no-op. (Defensive guard against the same crash also lives in
			// `openFileInEditor`, but that path would surface a toast — silent
			// is the better UX here since the user is just editing the source.)
			if (isBinaryFile(info.target)) return;

			// Cross-note reference
			const files = flattenFileTree(fsStore.fileTree);
			const allPaths = files.map((f) => f.path);
			let resolved = resolveWikilink(info.target, allPaths);

			// Create non-existent note on click (with template if it matches a periodic note)
			if (!resolved && vaultStore.path) {
				const periodicMatch = detectPeriodicNoteType(info.target, settingsStore.periodicNotes);
				if (periodicMatch) {
					// openOrCreatePeriodicNoteForDate already opens the file in the editor,
					// so skip the openFileInEditor call below to avoid a double-open error
					// when the periodic note folder differs from the vault root.
					await openOrCreatePeriodicNoteForDate(periodicMatch.periodType, periodicMatch.date);
				} else {
					const newPath = await createFile(vaultStore.path, `${info.target}.md`);
					if (!newPath) return;
					resolved = newPath;
				}
			}
			if (!resolved) {
				// Periodic notes are already open — skip to anchor check
				if (hasAnchor) {
					const tab = editorStore.activeTab;
					if (tab) {
						const anchorPos = info.heading
							? findHeadingPosition(tab.content, info.heading)
							: findBlockIdPosition(tab.content, info.blockId!);
						if (anchorPos !== null) {
							editorStore.setPendingScrollPosition(anchorPos);
						}
					}
				}
				return;
			}

			await openFileInEditor(resolved);

			if (hasAnchor) {
				const tab = editorStore.activeTab;
				if (tab) {
					const anchorPos = info.heading
						? findHeadingPosition(tab.content, info.heading)
						: findBlockIdPosition(tab.content, info.blockId!);
					if (anchorPos !== null) {
						editorStore.setPendingScrollPosition(anchorPos);
					}
				}
			}
		} catch (err) {
			console.error('Failed to handle wikilink click:', err);
		}
	}

	/** Moves the cursor to the right-click position so copy-block-link operates on the correct line */
	function handleContextMenu(e: MouseEvent) {
		if (!view) return;
		const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
		if (pos === null) return;
		view.dispatch({ selection: EditorSelection.cursor(pos) });
	}

	async function handleCopyBlockLink() {
		if (view) await copyBlockLinkToClipboard(view);
	}

	async function handleCopyBlockEmbed() {
		if (view) await copyBlockEmbedToClipboard(view);
	}

	onMount(() => {
		const tab = editorStore.activeTab;
		if (!tab) return;

		// Restore cursor from saved view state if available (e.g. after remount from collection/canvas tab)
		const saved = getTabViewState(tab.path);
		const cursorPos = saved ? Math.min(saved.cursorPos, tab.content.length) : getPositionAfterFrontmatter(tab.content);

		const state = EditorState.create({
			doc: tab.content,
			extensions: createExtensions({
				isLivePreview: editorStore.isLivePreview,
				fontFamily: settingsStore.editor.fontFamily,
				fontSize: settingsStore.editor.fontSize,
				lineHeight: settingsStore.editor.lineHeight,
				contentWidth: settingsStore.editor.contentWidth,
				paragraphSpacing: settingsStore.editor.paragraphSpacing,
				lineNumbersCompartment,
				editorThemeCompartment,
				languageCompartment,
				highlightStyleCompartment,
				onDocChanged: (content) => onContentChange(content),
				isTabSwitching: () => isTabSwitching,
			}),
			selection: EditorSelection.cursor(cursorPos),
		});

		view = new EditorView({ state, parent: container });
		editorStore.setEditorView(view);
		applyLanguageForTab(tab.name);
		view.focus();

		// Restore scroll position after the view has rendered
		if (saved) {
			requestAnimationFrame(() => {
				view?.scrollDOM.scrollTo(saved.scrollLeft, saved.scrollTop);
			});
		}

		lastTabPath = tab.path;
		container.addEventListener('mousedown', handleEditorClick, { capture: true });
	});

	onDestroy(() => {
		editorStore.setEditorView(null);
		container?.removeEventListener('mousedown', handleEditorClick, { capture: true });
		// Abort any pending tab-switch rAF chain so it does not fire on a
		// destroyed view.
		tabSwitchRafAbort?.abort();
		tabSwitchRafAbort = null;
		if (view) {
			const path = lastTabPath;
			if (path) {
				saveTabViewState(path, {
					scrollTop: view.scrollDOM.scrollTop,
					scrollLeft: view.scrollDOM.scrollLeft,
					cursorPos: view.state.selection.main.head,
				});
			}
			view.destroy();
		}
	});

	// IMPORTANT: This effect MUST be defined before the content-sync effect below.
	// Both fire on tab switch; this one replaces the CM document first, so the
	// content-sync effect sees CM already has the right content and skips.
	$effect(() => {
		const path = editorStore.activeTabPath;

		untrack(() => {
			if (!view || path === lastTabPath || !path) return;

			// Detect rename: the old path no longer exists in tabs but the CM doc
			// matches the new tab content — this is a path change, not a tab switch.
			// Migrate view state to the new path and skip the doc replace / scroll reset.
			if (lastTabPath) {
				const tab = editorStore.activeTab;
				if (
					tab &&
					findTabIndex(editorStore.tabs, lastTabPath) < 0 &&
					view.state.doc.toString() === tab.content
				) {
					const oldState = getTabViewState(lastTabPath);
					if (oldState) {
						saveTabViewState(path, oldState);
					}
					deleteTabViewState(lastTabPath);
					lastTabPath = path;
					return;
				}
			}

			// Save old tab's view state
			if (lastTabPath) {
				// Clean up stale entry if the previous tab was closed
				if (findTabIndex(editorStore.tabs, lastTabPath) < 0) {
					deleteTabViewState(lastTabPath);
				} else {
					saveTabViewState(lastTabPath, {
						scrollTop: view.scrollDOM.scrollTop,
						scrollLeft: view.scrollDOM.scrollLeft,
						cursorPos: view.state.selection.main.head,
					});
				}
			}

			// Get new tab content
			const tab = editorStore.activeTab;
			if (!tab) return;

			// Restore cursor position for the new tab (clamped to new doc length)
			const saved = getTabViewState(path);
			const cursorPos = saved ? Math.min(saved.cursorPos, tab.content.length) : getPositionAfterFrontmatter(tab.content);

			// Phase 4.3: bundle the language reconfigure into the same dispatch
			// as the doc replace when possible. Markdown / kanban resolve
			// synchronously via `getLanguageEffectsSync`; code files (.ts,
			// .py, …) need an async parser load — for those we keep the
			// prior 2-dispatch path via `applyLanguageForTab`.
			const langEffects = getLanguageEffectsSync(tab.name, languageCompartment, highlightStyleCompartment);

			// Suppress onContentChange during the doc replace — this is a tab switch,
			// not a user edit, so we don't want to trigger a debounced auto-save.
			isTabSwitching = true;
			debug('TAB_SWITCH', 'dispatching doc replace, path:', path, 'contentLen:', tab.content.length);
			const t0 = perfStart();
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: tab.content },
				selection: EditorSelection.cursor(cursorPos),
				annotations: Transaction.addToHistory.of(false),
				effects: langEffects ?? [],
			});
			perfEnd('TAB_SWITCH', 'docReplace', t0);
			isTabSwitching = false;

			// Async language load for code files only — markdown/kanban already
			// reconfigured via the inline `effects` above.
			if (langEffects === null) {
				applyLanguageForTab(tab.name);
			}

			// Restore focus so the caret renders
			view.focus();

			// Phase 4.4: cancel the prior pending rAF chain so a rapid tab
			// switch (A → B before A's rAF fires) does not land A's
			// `forceDecorationRebuild` on B's view.
			tabSwitchRafAbort?.abort();
			tabSwitchRafAbort = new AbortController();
			const rafSignal = tabSwitchRafAbort.signal;

			// Restore scroll position, then force decoration rebuild once viewport is stable
			requestAnimationFrame(() => {
				if (rafSignal.aborted) return;
				debug('TAB_SWITCH', 'restoring scroll, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
				if (saved) {
					view?.scrollDOM.scrollTo(saved.scrollLeft, saved.scrollTop);
				} else {
					view?.scrollDOM.scrollTo(0, 0);
				}
				requestAnimationFrame(() => {
					if (rafSignal.aborted) return;
					debug('TAB_SWITCH', 'dispatching forceDecorationRebuild, visibleRanges:', view?.visibleRanges?.map(r => `${r.from}-${r.to}`));
					const t1 = perfStart();
					view?.dispatch({ effects: forceDecorationRebuild.of(null) });
					perfEnd('TAB_SWITCH', 'decorationRebuild', t1);
				});
			});

			lastTabPath = path;
		});
	});

	$effect(() => {
		const pos = editorStore.pendingScrollPosition;

		untrack(() => {
			if (pos === null || !view) return;

			editorStore.setPendingScrollPosition(null);

			// Double-rAF ensures this runs after the tab-switch effect's scroll restore
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (!view) return;
					const clampedPos = Math.min(pos, view.state.doc.length);
					view.dispatch({
						selection: EditorSelection.cursor(clampedPos),
						effects: EditorView.scrollIntoView(clampedPos, { y: 'center' }),
					});
					view.focus();
				});
			});
		});
	});

	// Line-precision jump (RAG citation jumps + any caller that has a line number
	// but not a char offset). Same double-rAF guard as `pendingScrollPosition`
	// so it lands after the tab-switch scroll-restore.
	$effect(() => {
		const line = editorStore.pendingScrollLine;

		untrack(() => {
			if (line === null || !view) return;

			editorStore.setPendingScrollLine(null);

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (!view) return;
					const totalLines = view.state.doc.lines;
					const clampedLine = Math.min(Math.max(1, line), totalLines);
					const pos = view.state.doc.line(clampedLine).from;
					view.dispatch({
						selection: EditorSelection.cursor(pos),
						effects: EditorView.scrollIntoView(pos, { y: 'center' }),
					});
					view.focus();
				});
			});
		});
	});

	// Sync external content changes (Properties panel, task toggle, link
	// rename, watcher reload) into CodeMirror. Phase 5 of the perf refactor:
	// driven by `editorStore.externalContentSignal` (a counter bumped only by
	// `syncExternalContentToEditor`), NOT by `activeTab.content`. Keystrokes
	// don't bump the signal, so this effect doesn't re-run on every keystroke
	// and the per-keystroke `view.state.doc.toString()` round-trip is gone.
	//
	// `lastSeenSignal` skips the dispatch on first mount (signal === 0) — the
	// editor view was constructed with the initial content already; we only
	// dispatch on EXTERNAL bumps that follow.
	let lastSeenSignal = 0;
	$effect(() => {
		const signal = editorStore.externalContentSignal;

		untrack(() => {
			if (signal === lastSeenSignal) return;
			lastSeenSignal = signal;
			if (!view) return;
			const content = editorStore.activeTab?.content;
			if (content === undefined) return;

			const tBaseline = perfStart();
			const cursorPos = Math.min(view.state.selection.main.head, content.length);
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: content },
				selection: EditorSelection.cursor(cursorPos),
				annotations: Transaction.addToHistory.of(false),
			});
			perfBaseline('contentSyncEffect:dispatched', tBaseline);
		});
	});

	$effect(() => {
		const enabled = editorStore.isLivePreview;

		untrack(() => {
			if (!view) return;
			view.dispatch({
				effects: [
					livePreviewCompartment.reconfigure(
						enabled ? livePreviewExtensions() : []
					),
					lineNumbersCompartment.reconfigure(
						enabled ? [] : [lineNumbers(), highlightActiveLineGutter()]
					),
				],
			});
		});
	});

	// Rebuild frontmatter widget when tag colors change
	$effect(() => {
		settingsStore.tagColors.colors;

		untrack(() => {
			if (!view) return;
			view.dispatch({ effects: forceDecorationRebuild.of(null) });
		});
	});

	// Reactively update editor theme when settings change
	$effect(() => {
		const { fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing } = settingsStore.editor;

		untrack(() => {
			if (!view) return;
			view.dispatch({
				effects: editorThemeCompartment.reconfigure(
					buildEditorTheme(fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing)
				),
			});
		});
	});

	// Reactively update heading typography CSS variables when settings change
	$effect(() => {
		const _typography = settingsStore.editor.headingTypography;

		untrack(() => {
			applyHeadingTypography();
		});
	});
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet children()}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div bind:this={container} class="absolute inset-0" oncontextmenu={handleContextMenu}></div>
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Content class="w-56">
		<ContextMenu.Item onclick={handleCopyBlockLink}>
			<Link class="mr-2 size-4" />
			Copy link to block
			<ContextMenu.Shortcut>⌘⇧L</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleCopyBlockEmbed}>
			<FileSymlink class="mr-2 size-4" />
			Copy block embed
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
