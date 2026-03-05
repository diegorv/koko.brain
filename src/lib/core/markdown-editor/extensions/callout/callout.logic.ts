export const CALLOUT_REGEX = /^>\s*\[!([\w-]+)\]([+-])?/;

export const CALLOUT_COLORS: Record<string, string> = {
	note: 'var(--callout-note)',
	tip: 'var(--callout-tip)',
	important: 'var(--callout-important)',
	warning: 'var(--callout-warning)',
	caution: 'var(--callout-caution)',
	abstract: 'var(--callout-note)',
	summary: 'var(--callout-note)',
	info: 'var(--callout-note)',
	todo: 'var(--callout-note)',
	success: 'var(--callout-tip)',
	check: 'var(--callout-tip)',
	done: 'var(--callout-tip)',
	question: 'var(--callout-warning)',
	help: 'var(--callout-warning)',
	faq: 'var(--callout-warning)',
	failure: 'var(--callout-caution)',
	fail: 'var(--callout-caution)',
	missing: 'var(--callout-caution)',
	danger: 'var(--callout-caution)',
	error: 'var(--callout-caution)',
	bug: 'var(--callout-caution)',
	example: 'var(--callout-important)',
	quote: 'var(--callout-quote)',
	cite: 'var(--callout-quote)',
};

export interface CalloutMatch {
	type: string;
	color: string;
}

export function parseCalloutLine(lineText: string): CalloutMatch | null {
	const match = lineText.match(CALLOUT_REGEX);
	if (!match) return null;

	const type = match[1].toLowerCase();
	const color = CALLOUT_COLORS[type] || 'var(--callout-note)';
	return { type, color };
}
