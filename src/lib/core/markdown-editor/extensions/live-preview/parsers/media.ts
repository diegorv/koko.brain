/** HTML media tag rendered by the live-preview media plugins */
export type MediaTag = 'audio' | 'video';

/** Information about an `<audio>` / `<video>` HTML block */
export interface MediaBlockInfo {
	/** Start of the opening `<audio` / `<video` line */
	openFrom: number;
	/** End of the opening `<audio` / `<video` line */
	openTo: number;
	/** Start of the closing tag line (same as openFrom for single-line) */
	closeFrom: number;
	/** End of the closing tag line (same as openTo for single-line) */
	closeTo: number;
	/** The media source URL */
	src: string;
}

/** Per-tag opening/closing matchers, precomputed so the scan builds no RegExp per line */
const TAG_PATTERNS: Record<MediaTag, { open: RegExp; close: RegExp }> = {
	audio: { open: /^<audio[\s>\/]/i, close: /<\/audio>/i },
	video: { open: /^<video[\s>\/]/i, close: /<\/video>/i },
};

/** Extracts the value of a `src="..."` or `src='...'` attribute from an HTML tag string */
function extractSrcAttr(text: string): string | null {
	const match = text.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/);
	return match ? (match[1] ?? match[2] ?? null) : null;
}

/**
 * Finds an `<audio>` / `<video>` HTML block starting at the given index in the lines array.
 * Supports single-line (`<video src="..."></video>`) and multi-line blocks
 * (with `<source>` children). Returns the block info and the index of the
 * closing line, or null if not found.
 */
export function findMediaBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
	tag: MediaTag,
): { block: MediaBlockInfo; endIdx: number } | null {
	const { open, close } = TAG_PATTERNS[tag];
	const firstLine = lines[startIdx];
	const trimmed = firstLine.text.trimStart();

	// Must start with the media tag (case-insensitive)
	if (!open.test(trimmed)) return null;

	// Try to extract src from the opening tag
	let src = extractSrcAttr(firstLine.text);

	// Single-line: self-closing or contains the closing tag
	if (/\/>\s*$/.test(trimmed) || close.test(firstLine.text)) {
		if (!src) return null;
		return {
			block: {
				openFrom: firstLine.from,
				openTo: firstLine.to,
				closeFrom: firstLine.from,
				closeTo: firstLine.to,
				src,
			},
			endIdx: startIdx,
		};
	}

	// Multi-line: scan forward for the closing tag
	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];

		// Extract src from <source> if we don't have one yet
		if (!src && /^\s*<source[\s>]/i.test(line.text)) {
			src = extractSrcAttr(line.text);
		}

		if (close.test(line.text)) {
			if (!src) return null;
			return {
				block: {
					openFrom: firstLine.from,
					openTo: firstLine.to,
					closeFrom: line.from,
					closeTo: line.to,
					src,
				},
				endIdx: i,
			};
		}
	}

	// No closing tag found
	return null;
}
