<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import {
		registerXtermInstance,
		unregisterXtermInstance,
		writeToTerminal,
		resizeTerminal,
	} from './terminal.service';

	let { sessionId }: { sessionId: string } = $props();

	let containerEl: HTMLDivElement;
	let resizeObserver: ResizeObserver | undefined;
	let terminal: import('@xterm/xterm').Terminal | undefined;

	onMount(() => {
		initTerminal();
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		unregisterXtermInstance(sessionId);
		terminal?.dispose();
	});

	async function initTerminal() {
		const { Terminal } = await import('@xterm/xterm');
		const { FitAddon } = await import('@xterm/addon-fit');
		const { WebLinksAddon } = await import('@xterm/addon-web-links');

		await import('@xterm/xterm/css/xterm.css');

		const { fontFamily, fontSize, lineHeight } = settingsStore.terminal;

		// Load bundled Nerd Fonts (local() doesn't work in Tauri's WKWebView)
		if (!document.getElementById('terminal-fonts')) {
			const style = document.createElement('style');
			style.id = 'terminal-fonts';
			style.textContent = `
				@font-face {
					font-family: 'FiraCode Nerd Font Mono';
					src: url('/fonts/FiraCodeNerdFontMono-Regular.ttf') format('truetype');
					font-weight: 400;
					font-style: normal;
				}
				@font-face {
					font-family: 'FiraCode Nerd Font Mono';
					src: url('/fonts/FiraCodeNerdFontMono-Medium.ttf') format('truetype');
					font-weight: 500;
					font-style: normal;
				}
				@font-face {
					font-family: 'FiraCode Nerd Font Mono';
					src: url('/fonts/FiraCodeNerdFontMono-Bold.ttf') format('truetype');
					font-weight: 700;
					font-style: normal;
				}
				@font-face {
					font-family: 'Symbols Nerd Font Mono';
					src: url('/fonts/SymbolsNerdFontMono-Regular.ttf') format('truetype');
					font-weight: normal;
					font-style: normal;
				}
			`;
			document.head.appendChild(style);
		}
		await Promise.all([
			document.fonts.load(`500 ${fontSize}px "FiraCode Nerd Font Mono"`),
			document.fonts.load(`${fontSize}px "Symbols Nerd Font Mono"`),
			document.fonts.ready,
		]);

		terminal = new Terminal({
			fontFamily,
			fontSize,
			fontWeight: '500',
			fontWeightBold: '700',
			lineHeight,
			letterSpacing: 0,
			cursorBlink: true,
			allowProposedApi: true,
			theme: {
				background: '#21222e',
				foreground: '#cdd6f4',
				cursor: '#bac5ee',
				selectionBackground: '#585b7066',
				black: '#45475a',
				red: '#f38ba8',
				green: '#a6e3a1',
				yellow: '#f9e2af',
				blue: '#89b4fa',
				magenta: '#cba6f7',
				cyan: '#94e2d5',
				white: '#bac2de',
				brightBlack: '#585b70',
				brightRed: '#f38ba8',
				brightGreen: '#a6e3a1',
				brightYellow: '#f9e2af',
				brightBlue: '#89b4fa',
				brightMagenta: '#cba6f7',
				brightCyan: '#94e2d5',
				brightWhite: '#a6adc8',
			},
		});

		const fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.loadAddon(new WebLinksAddon());

		// Unicode11 for proper Nerd Font glyph widths (Private Use Area)
		const { Unicode11Addon } = await import('@xterm/addon-unicode11');
		terminal.loadAddon(new Unicode11Addon());
		terminal.unicode.activeVersion = '11';

		terminal.open(containerEl);

		try {
			const { WebglAddon } = await import('@xterm/addon-webgl');
			terminal.loadAddon(new WebglAddon());
		} catch {
			// Canvas fallback is automatic
		}

		fitAddon.fit();

		registerXtermInstance(sessionId, terminal);

		terminal.onData((data) => writeToTerminal(sessionId, data));

		resizeObserver = new ResizeObserver(() => {
			fitAddon.fit();
			const dims = fitAddon.proposeDimensions();
			if (dims) {
				resizeTerminal(sessionId, dims.rows, dims.cols);
			}
		});
		resizeObserver.observe(containerEl);
	}
</script>

<div bind:this={containerEl} class="h-full w-full pl-2"></div>
