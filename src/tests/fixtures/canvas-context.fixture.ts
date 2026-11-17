/**
 * A recording 2D canvas context for jsdom, which has no canvas. It records the
 * draw calls a test asserts on and ignores the rest of the state machine.
 */

/** One `fillText` call. */
export interface FillTextCall {
	/** The text drawn. */
	text: string;
	/** The x the text was drawn at. */
	x: number;
	/** The y the text was drawn at. */
	y: number;
	/** `ctx.font` at the time of the call. */
	font: string;
}

/** The calls recorded between two `clearRect` calls. */
export interface CanvasFrame {
	/** Circles drawn with `arc`. */
	arcs: number;
	/** Text drawn with `fillText`, in order. */
	fillTexts: FillTextCall[];
}

/** A recording context and what it saw. */
export interface RecordingContext {
	/** The object handed out as the canvas 2D context. */
	ctx: CanvasRenderingContext2D;
	/** Every frame so far; `clearRect` starts a new one. */
	frames: CanvasFrame[];
	/** The text of every `measureText` call, in order. */
	measured: string[];
}

/** The px size in a CSS font string such as `10px sans-serif`, or 10 when it has none. */
function fontPx(font: string): number {
	const match = font.match(/([\d.]+)px/);
	return match ? Number(match[1]) : 10;
}

/**
 * Creates a recording context. `measureText` returns a width of
 * `text.length * fontPx * 0.6`, a fixed stand-in for a sans-serif font.
 */
export function createRecordingContext(): RecordingContext {
	const frames: CanvasFrame[] = [];
	const measured: string[] = [];
	const frame = () => {
		if (frames.length === 0) frames.push({ arcs: 0, fillTexts: [] });
		return frames[frames.length - 1];
	};
	const noop = () => {};
	const ctx = {
		font: '10px sans-serif',
		fillStyle: '#000',
		strokeStyle: '#000',
		lineWidth: 1,
		textAlign: 'start',
		textBaseline: 'alphabetic',
		save: noop,
		restore: noop,
		scale: noop,
		translate: noop,
		beginPath: noop,
		closePath: noop,
		moveTo: noop,
		lineTo: noop,
		stroke: noop,
		fill: noop,
		clearRect() {
			frames.push({ arcs: 0, fillTexts: [] });
		},
		arc() {
			frame().arcs++;
		},
		fillText(text: string, x: number, y: number) {
			frame().fillTexts.push({ text, x, y, font: ctx.font });
		},
		measureText(text: string) {
			measured.push(text);
			return { width: text.length * fontPx(ctx.font) * 0.6 } as TextMetrics;
		},
	};
	return { ctx: ctx as unknown as CanvasRenderingContext2D, frames, measured };
}

/** Makes every canvas return `recording.ctx` from `getContext('2d')`, for the rest of the test file. */
export function installRecordingContext(recording: RecordingContext): void {
	HTMLCanvasElement.prototype.getContext = ((type: string) =>
		type === '2d' ? recording.ctx : null) as unknown as HTMLCanvasElement['getContext'];
}
