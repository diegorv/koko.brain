import { describe, it, expect } from 'vitest';
import { parseCollectionYaml, updateCollectionYaml } from '$lib/features/collection/yaml-parser';

describe('parseCollectionYaml', () => {
	it('parses a minimal collection with one table view', () => {
		const yaml = `
views:
  - type: table
    name: "My Table"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.views).toHaveLength(1);
		expect(result.definition.views[0].type).toBe('table');
		expect(result.definition.views[0].name).toBe('My Table');
	});

	it('parses global filters with and/or/not', () => {
		const yaml = `
filters:
  and:
    - "status == 'active'"
    - or:
        - "priority > 3"
        - "file.folder == 'important'"
  not:
    - "archived == true"
views:
  - type: table
    name: "Filtered"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const filters = result.definition.filters;
		expect(filters).toBeDefined();
		expect((filters as any).and).toHaveLength(2);
		expect((filters as any).not).toHaveLength(1);
	});

	it('parses formulas', () => {
		const yaml = `
formulas:
  days_old: "number((now() - date(file.ctime)) / 86400000)"
  is_recent: "file.mtime > date('2024-01-01')"
views:
  - type: table
    name: "With Formulas"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.formulas).toBeDefined();
		expect(result.definition.formulas!['days_old']).toBe("number((now() - date(file.ctime)) / 86400000)");
		expect(result.definition.formulas!['is_recent']).toBe("file.mtime > date('2024-01-01')");
	});

	it('parses properties config', () => {
		const yaml = `
properties:
  status:
    displayName: "Status"
  formula.days_old:
    displayName: "Age (days)"
views:
  - type: table
    name: "With Props"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.properties!['status'].displayName).toBe('Status');
		expect(result.definition.properties!['formula.days_old'].displayName).toBe('Age (days)');
	});

	it('parses sort and order correctly', () => {
		const yaml = `
views:
  - type: table
    name: "Sorted"
    order:
      - file.name
      - status
      - priority
    sort:
      - column: priority
        direction: DESC
      - column: file.name
        direction: ASC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const view = result.definition.views[0];
		expect(view.order).toEqual(['file.name', 'status', 'priority']);
		expect(view.sort).toHaveLength(2);
		expect(view.sort![0]).toEqual({ column: 'priority', direction: 'DESC' });
		expect(view.sort![1]).toEqual({ column: 'file.name', direction: 'ASC' });
	});

	it('accepts "property" as alias for "column" in sort items (Obsidian compat)', () => {
		const yaml = `
views:
  - type: table
    name: "Obsidian Sort"
    sort:
      - property: nubank-role
        direction: ASC
      - property: file.name
        direction: DESC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const view = result.definition.views[0];
		expect(view.sort).toHaveLength(2);
		expect(view.sort![0]).toEqual({ column: 'nubank-role', direction: 'ASC' });
		expect(view.sort![1]).toEqual({ column: 'file.name', direction: 'DESC' });
	});

	it('accepts mixed "column" and "property" in sort items', () => {
		const yaml = `
views:
  - type: table
    name: "Mixed Sort"
    sort:
      - column: status
        direction: ASC
      - property: file.name
        direction: DESC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const view = result.definition.views[0];
		expect(view.sort).toHaveLength(2);
		expect(view.sort![0]).toEqual({ column: 'status', direction: 'ASC' });
		expect(view.sort![1]).toEqual({ column: 'file.name', direction: 'DESC' });
	});

	it('returns error when sort item has empty "property"', () => {
		const yaml = `
views:
  - type: table
    name: "Empty Prop"
    sort:
      - property: ""
        direction: ASC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have a "column" string');
	});

	it('returns error for invalid YAML', () => {
		const result = parseCollectionYaml('{ invalid: yaml: broken:');
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('Invalid YAML');
	});

	it('returns error when views is missing', () => {
		const yaml = `
filters:
  and:
    - "status == 'active'"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('Missing required field: views');
	});

	it('returns error when views is empty', () => {
		const yaml = `
views: []
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('Field "views" must not be empty');
	});

	it('returns error when views is not an array', () => {
		const yaml = `
views: "not an array"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('Field "views" must be an array');
	});

	it('returns error when view is missing type', () => {
		const yaml = `
views:
  - name: "No Type"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('missing "type"');
	});

	it('returns error when view is missing name', () => {
		const yaml = `
views:
  - type: table
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('missing "name"');
	});

	it('returns error when sort is not an array', () => {
		const yaml = `
views:
  - type: table
    name: "Bad Sort"
    sort: "invalid"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('View "Bad Sort": "sort" must be an array');
	});

	it('returns error when order is not an array', () => {
		const yaml = `
views:
  - type: table
    name: "Bad Order"
    order: 42
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('View "Bad Order": "order" must be an array');
	});

	it('returns error when limit is not a positive number', () => {
		const yaml = `
views:
  - type: table
    name: "Bad Limit"
    limit: "abc"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('View "Bad Limit": "limit" must be a positive number');
	});

	it('returns error when limit is zero', () => {
		const yaml = `
views:
  - type: table
    name: "Zero Limit"
    limit: 0
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('View "Zero Limit": "limit" must be a positive number');
	});

	it('returns error when sort item is missing column', () => {
		const yaml = `
views:
  - type: table
    name: "Bad Sort Item"
    sort:
      - direction: ASC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have a "column" string');
	});

	it('returns error when sort item has empty column', () => {
		const yaml = `
views:
  - type: table
    name: "Empty Col"
    sort:
      - column: ""
        direction: ASC
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have a "column" string');
	});

	it('returns error when sort item has invalid direction', () => {
		const yaml = `
views:
  - type: table
    name: "Bad Dir"
    sort:
      - column: status
        direction: UP
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have direction "ASC" or "DESC"');
	});

	it('returns error when sort item is missing direction', () => {
		const yaml = `
views:
  - type: table
    name: "No Dir"
    sort:
      - column: status
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have direction "ASC" or "DESC"');
	});

	it('returns error when sort item is a string', () => {
		const yaml = `
views:
  - type: table
    name: "Str Sort"
    sort:
      - "status"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain('sort item at index 0 must have a "column" string');
	});

	it('returns error when formulas is an array', () => {
		const yaml = `
formulas:
  - "x + 1"
views:
  - type: table
    name: "Array Formulas"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('"formulas" must be a plain object');
	});

	it('returns error when formula value is not a string', () => {
		const yaml = `
formulas:
  total: 42
views:
  - type: table
    name: "Num Formula"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('Formula "total" must be a string expression');
	});

	it('returns error when formulas is null', () => {
		const yaml = `
formulas: null
views:
  - type: table
    name: "Null Formulas"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('"formulas" must be a plain object');
	});

	it('returns error when columnSize is not an object', () => {
		const yaml = `
views:
  - type: table
    name: "Bad ColSize"
    columnSize: [100, 200]
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toBe('View "Bad ColSize": "columnSize" must be an object');
	});

	it('preserves unknown fields like groupBy and summaries', () => {
		const yaml = `
views:
  - type: table
    name: "Preserved"
    groupBy: status
    summaries:
      count: true
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const view = result.definition.views[0];
		expect(view.groupBy).toBe('status');
		expect(view.summaries).toEqual({ count: true });
	});

	it('parses view-level filters', () => {
		const yaml = `
views:
  - type: table
    name: "View Filters"
    filters:
      and:
        - "priority > 2"
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.views[0].filters).toBeDefined();
	});

	it('parses columnSize', () => {
		const yaml = `
views:
  - type: table
    name: "Sized"
    columnSize:
      property.status: 120
      property.priority: 80
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.views[0].columnSize).toEqual({
			'property.status': 120,
			'property.priority': 80,
		});
	});

	it('parses limit', () => {
		const yaml = `
views:
  - type: table
    name: "Limited"
    limit: 50
`;
		const result = parseCollectionYaml(yaml);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.definition.views[0].limit).toBe(50);
	});
});

describe('updateCollectionYaml', () => {
	const collectionYaml = `views:
  - type: table
    name: My Table
`;

	const yamlWithSort = `views:
  - type: table
    name: My Table
    sort:
      - column: file.name
        direction: ASC
`;

	const yamlWithFilters = `filters:
  or:
    - "tags == 'project'"
    - "tags == 'idea'"
views:
  - type: table
    name: My Table
`;

	it('adds global filters to a collection without filters', () => {
		const result = updateCollectionYaml(collectionYaml, {
			filters: { or: ["tags == 'project'", "tags == 'idea'"] },
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.filters).toBeDefined();
		expect((parsed.definition.filters as any).or).toHaveLength(2);
	});

	it('removes global filters when set to undefined', () => {
		const result = updateCollectionYaml(yamlWithFilters, { filters: undefined });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.filters).toBeUndefined();
	});

	it('adds sort to a view', () => {
		const result = updateCollectionYaml(collectionYaml, {
			viewSort: [{ column: 'file.name', direction: 'DESC' }],
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].sort).toEqual([
			{ column: 'file.name', direction: 'DESC' },
		]);
	});

	it('removes sort when set to empty array', () => {
		const result = updateCollectionYaml(yamlWithSort, { viewSort: [] });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].sort).toBeUndefined();
	});

	it('adds view-level filters', () => {
		const result = updateCollectionYaml(collectionYaml, {
			viewFilters: "status == 'active'",
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].filters).toBe("status == 'active'");
	});

	it('removes view-level filters when set to undefined', () => {
		const yaml = `views:
  - type: table
    name: My Table
    filters:
      and:
        - "status == 'active'"
`;
		const result = updateCollectionYaml(yaml, { viewFilters: undefined });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].filters).toBeUndefined();
	});

	it('adds formulas', () => {
		const result = updateCollectionYaml(collectionYaml, {
			formulas: { total: 'number(file.size)' },
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.formulas).toEqual({ total: 'number(file.size)' });
	});

	it('removes formulas when empty object', () => {
		const yaml = `formulas:
  total: number(file.size)
views:
  - type: table
    name: My Table
`;
		const result = updateCollectionYaml(yaml, { formulas: {} });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.formulas).toBeUndefined();
	});

	it('updates multiple fields at once', () => {
		const result = updateCollectionYaml(collectionYaml, {
			filters: { and: ["status == 'active'"] },
			formulas: { count: 'number(1)' },
			viewSort: [{ column: 'status', direction: 'ASC' }],
			viewFilters: "priority > 3",
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect((parsed.definition.filters as any).and).toHaveLength(1);
		expect(parsed.definition.formulas).toEqual({ count: 'number(1)' });
		expect(parsed.definition.views[0].sort).toEqual([{ column: 'status', direction: 'ASC' }]);
		expect(parsed.definition.views[0].filters).toBe("priority > 3");
	});

	it('preserves other fields unchanged', () => {
		const yaml = `properties:
  status:
    displayName: Status
views:
  - type: table
    name: My Table
    order:
      - file.name
      - status
    limit: 50
`;
		const result = updateCollectionYaml(yaml, {
			viewSort: [{ column: 'status', direction: 'DESC' }],
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.properties!['status'].displayName).toBe('Status');
		expect(parsed.definition.views[0].order).toEqual(['file.name', 'status']);
		expect(parsed.definition.views[0].limit).toBe(50);
		expect(parsed.definition.views[0].sort).toEqual([{ column: 'status', direction: 'DESC' }]);
	});

	it('returns original string for invalid YAML', () => {
		const invalid = '{ broken: yaml: :::';
		const result = updateCollectionYaml(invalid, { viewSort: [] });
		expect(result).toBe(invalid);
	});

	it('does not touch fields not included in updates', () => {
		const yaml = `formulas:
  total: number(file.size)
filters:
  and:
    - "status == 'active'"
views:
  - type: table
    name: My Table
    sort:
      - column: file.name
        direction: ASC
`;
		// Only update viewFilters — formulas, global filters, and sort should remain
		const result = updateCollectionYaml(yaml, {
			viewFilters: "priority > 2",
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.formulas).toEqual({ total: 'number(file.size)' });
		expect((parsed.definition.filters as any).and).toHaveLength(1);
		expect(parsed.definition.views[0].sort).toEqual([{ column: 'file.name', direction: 'ASC' }]);
		expect(parsed.definition.views[0].filters).toBe("priority > 2");
	});

	it('adds column order to a view', () => {
		const result = updateCollectionYaml(collectionYaml, {
			viewOrder: ['file.name', 'tags', 'status'],
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].order).toEqual(['file.name', 'tags', 'status']);
	});

	it('removes column order when set to empty array', () => {
		const yaml = `views:
  - type: table
    name: My Table
    order:
      - file.name
      - status
`;
		const result = updateCollectionYaml(yaml, { viewOrder: [] });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].order).toBeUndefined();
	});

	it('adds colorProperty to a view', () => {
		const result = updateCollectionYaml(collectionYaml, {
			viewColorProperty: 'category',
		});
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].colorProperty).toBe('category');
	});

	it('removes colorProperty when set to undefined', () => {
		const yaml = `views:
  - type: linear-calendar
    name: Year View
    dateProperty: start-date
    colorProperty: category
`;
		const result = updateCollectionYaml(yaml, { viewColorProperty: undefined });
		const parsed = parseCollectionYaml(result);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.definition.views[0].colorProperty).toBeUndefined();
	});
});
