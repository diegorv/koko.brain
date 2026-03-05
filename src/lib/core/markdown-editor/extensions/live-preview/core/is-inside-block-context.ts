import type { SyntaxNodeRef } from '@lezer/common';

/** Lezer node types that represent block contexts where inline decorations should be suppressed */
const BLOCK_CONTEXT_TYPES = new Set(['FencedCode', 'CodeBlock', 'HTMLBlock', 'CommentBlock', 'BlockMath', 'Frontmatter']);

/**
 * Returns true if the given syntax node is inside a block context (code block, HTML block, etc.)
 * where inline markdown decorations should not be applied.
 * Checks the node itself and walks up the Lezer tree to check all parent nodes.
 * The self-check is needed for regex-based parsers that use `resolveInner(pos)` — the resolved
 * node may BE the block context node (e.g., `FencedCode`) rather than a child of it.
 */
export function isInsideBlockContext(node: SyntaxNodeRef): boolean {
	if (BLOCK_CONTEXT_TYPES.has(node.name)) return true;
	let parent = node.node.parent;
	while (parent) {
		if (BLOCK_CONTEXT_TYPES.has(parent.name)) return true;
		parent = parent.parent;
	}
	return false;
}
