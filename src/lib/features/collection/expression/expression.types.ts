/** Number literal node */
export interface NumberLiteral {
	type: 'number';
	value: number;
}

/** String literal node */
export interface StringLiteral {
	type: 'string';
	value: string;
}

/** Boolean literal node */
export interface BooleanLiteral {
	type: 'boolean';
	value: boolean;
}

/** Identifier node (e.g. "status", "priority") */
export interface Identifier {
	type: 'identifier';
	name: string;
}

/** Member expression node (e.g. "file.name") */
export interface MemberExpr {
	type: 'member';
	object: ASTNode;
	property: string;
}

/** Binary expression node (e.g. "a + b", "x == y") */
export interface BinaryExpr {
	type: 'binary';
	op: string;
	left: ASTNode;
	right: ASTNode;
}

/** Unary expression node (e.g. "!x", "-x") */
export interface UnaryExpr {
	type: 'unary';
	op: '!' | '-';
	operand: ASTNode;
}

/** Function call node (e.g. "if(cond, a, b)") */
export interface CallExpr {
	type: 'call';
	callee: string;
	args: ASTNode[];
}

/** Array literal node (e.g. "[1, 2, 3]") */
export interface ArrayLiteral {
	type: 'array';
	elements: ASTNode[];
}

/** Union of all AST node types */
export type ASTNode =
	| NumberLiteral
	| StringLiteral
	| BooleanLiteral
	| Identifier
	| MemberExpr
	| BinaryExpr
	| UnaryExpr
	| CallExpr
	| ArrayLiteral;

// --- Display types (returned by display functions for special rendering) ---

/** Display wrapper for a clickable link */
export interface DisplayLink {
	__display: 'link';
	href: string;
	display: string;
}

/** Display wrapper for an inline image */
export interface DisplayImage {
	__display: 'image';
	src: string;
	alt: string;
}

/** Display wrapper for a Lucide icon */
export interface DisplayIcon {
	__display: 'icon';
	name: string;
}

/** Display wrapper for raw HTML content */
export interface DisplayHTML {
	__display: 'html';
	html: string;
}

/** Union of all display value types */
export type DisplayValue = DisplayLink | DisplayImage | DisplayIcon | DisplayHTML;

/** Checks whether a value is a display type wrapper */
export function isDisplayValue(value: unknown): value is DisplayValue {
	return (
		value !== null &&
		typeof value === 'object' &&
		'__display' in value &&
		typeof (value as DisplayValue).__display === 'string'
	);
}
