# QueryJS

Learn how to use the JavaScript API for programmatic access to your vault data — query notes, filter by properties, aggregate statistics, and render dynamic content.

## What is QueryJS?

QueryJS is a JavaScript API that provides programmatic access to your vault data. It lets you:

- **Query notes** by tags, folders, or frontmatter properties.
- **Transform and aggregate** data using a chainable functional API.
- **Render dynamic content** — tables, lists, cards, heatmaps, timelines — directly into your notes.
- **Access the DOM** — create canvas elements, load external libraries, build custom visualizations.

QueryJS is used internally by [Collection](12-collection.md) for complex queries and is compatible with Obsidian's QueryJS API.

### How it works

Write JavaScript inside a ` ```queryjs ` fenced code block. When your cursor is **outside** the block, the script executes and renders its output inline. When your cursor is **inside** the block, you see the raw JavaScript source.

Scripts support `async`/`await` — if `await` is detected, the script is automatically wrapped in an async function.

## Core API Methods

### `kb.pages(source?)` — Query pages

Returns all pages matching a source filter:

```javascript
kb.pages()                  // All pages in the vault
kb.pages('#project')        // Pages with #project tag (includes subtags like #project/alpha)
kb.pages('"folder/path"')   // Pages in a specific folder (note the double quotes inside)
```

Returns a `DataArray<DVPage>`.

### `kb.page(path)` — Get a single page

```javascript
const page = kb.page("notes/meeting-notes.md");
```

Returns a `DVPage` or `undefined` if not found.

### `kb.current()` — Get the current page

Returns the page where the script is running. Useful for building context-aware queries:

```javascript
const me = kb.current();
kb.paragraph(`File: ${me.file.basename}`);
kb.paragraph(`Folder: ${me.file.folder}`);
kb.paragraph(`Size: ${me.file.size} bytes`);
```

### `kb.pagePaths(source?)` — Get just file paths

```javascript
const paths = kb.pagePaths('#project');  // DataArray<string>
```

### `kb.number(value)` — Safe numeric conversion

Converts any value to a number. Returns `0` for `undefined`, `null`, or non-numeric strings:

```javascript
kb.number("3")           // 3
kb.number(undefined)      // 0
kb.number(null)           // 0
kb.number("abc")          // 0
kb.number(4.5)            // 4.5
```

> [!TIP]
> Always use `kb.number()` instead of `|| 0` for frontmatter values. Frontmatter values are strings internally — `"3" || 0` returns `"3"` (a string), while `kb.number("3")` returns `3` (a number). The `|| 0` pattern causes silent bugs when values are used in arithmetic.

### `kb.progressBar(value, max)` — Text progress bar

Returns a unicode progress bar string. Useful as a cell value in `kb.table()`:

```javascript
kb.progressBar(3, 5)    // "███░░ 3"
kb.progressBar(5, 5)    // "█████ 5"
kb.progressBar(0, 5)    // "░░░░░ 0"
```

The value is clamped between 0 and max for the bar, but the original value is always shown. This is also available as `kb.ui.progressBar()` with additional options.

## The DVPage Object

Each page returned by `kb.pages()` has these properties:

### File metadata (`page.file`)

| Property | Type | Description |
|----------|------|-------------|
| `file.path` | `string` | Full path relative to vault root |
| `file.name` | `string` | Filename without extension |
| `file.basename` | `string` | Filename without extension (alias for `name`) |
| `file.folder` | `string` | Parent folder path |
| `file.ctime` | `DVDateTime` | Creation time |
| `file.mtime` | `DVDateTime` | Last modification time |
| `file.size` | `number` | File size in bytes |
| `file.tags` | `string[]` | All tags (from frontmatter + inline `#tags`) |
| `file.inlinks` | `DVLink[]` | Notes that link TO this page (backlinks) |
| `file.outlinks` | `DVLink[]` | Notes this page links TO |
| `file.tasks` | `object[]` | Task items (`- [ ]`) found in this note |
| `file.link` | `DVLink` | A link object pointing to this page |

### Frontmatter properties

All YAML frontmatter keys are available as top-level properties on the page:

```javascript
const pages = kb.pages('#book');
// If your notes have `rating: 5` in frontmatter:
pages.filter(p => p.rating >= 4);
```

> [!TIP]
> Date values in frontmatter (e.g. `created: 2026-02-17`) are **automatically converted** to `DVDateTime` objects. This means you can use `p.created.year`, `p.created.toISODate()`, etc. directly — no manual parsing needed.

### Working with tasks (`file.tasks`)

Each task object has the shape `{ text: string, completed: boolean }`:

```javascript
// Render tasks from a specific page
const page = kb.page("projects/my-project.md");
kb.taskList(page.file.tasks);

// Count completed vs pending
const done = page.file.tasks.filter(t => t.completed).length;
const pending = page.file.tasks.filter(t => !t.completed).length;
kb.paragraph(`Progress: ${done}/${done + pending}`);
```

Query tasks across the entire vault:

```javascript
// All pending tasks from all notes
const allPending = kb.pages().file.tasks.where(t => !t.completed);
kb.header(3, `Pending (${allPending.length})`);
kb.taskList(allPending);
```

Summarize tasks per note:

```javascript
kb.table(
  ["Note", "Total", "Done", "Pending"],
  kb.pages()
    .where(p => p.file.tasks.length > 0)
    .sort(p => p.file.tasks.filter(t => !t.completed).length, 'desc')
    .map(p => {
      const total = p.file.tasks.length;
      const done = p.file.tasks.filter(t => t.completed).length;
      return [p.file.link, total, done, total - done];
    })
)
```

## DataArray — Chainable Functional API

All query methods return a `DataArray<T>`, a chainable wrapper with powerful methods for filtering, sorting, transforming, and aggregating your data.

### Filtering

```javascript
kb.pages('#project')
  .where(p => p.status === 'active')     // Filter by predicate
  .filter(p => p.priority === 'high')    // Alias for .where()
  .whereTag('project/frontend')          // Filter by tag prefix (matches subtags)
```

#### Date filtering

```javascript
const weekStart = kb.date("2026-02-09");
const weekEnd = weekStart.plus({ days: 6 });

kb.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd)  // Filter by date range (inclusive)
```

`.whereDate(field, start, end)` parses `item[field]` as a date and keeps items that fall within [start, end]. Much simpler than manual `.where()` + `tryDate()` + `hasSame()`.

For single-day filtering, pass the same date for both start and end:

```javascript
const today = kb.date("2026-02-13");
kb.pages().whereTag('type/meeting').whereDate('created', today, today)
```

### Sorting

```javascript
kb.pages('#meeting')
  .sort(p => p.file.mtime, 'desc')      // Sort by modification time, newest first
  .sort(p => p.file.basename)            // Sort alphabetically (ascending by default)
  .sortBy(p => p.priority, 'asc')       // Alias for .sort()
```

### Transforming

```javascript
kb.pages('#project')
  .map(p => p.file.name)                // Extract just names
  .flatMap(p => p.file.tags)            // Flatten arrays of tags
  .distinct()                           // Remove duplicates
  .distinct(p => p.status)             // Deduplicate by key
```

### Grouping

```javascript
kb.pages('#task')
  .groupBy(p => p.status)
  // Returns DataArray<{ key: string, rows: DataArray<DVPage> }>
```

Iterate groups and render each one:

```javascript
const grouped = kb.pages()
  .where(p => p.status !== undefined)
  .groupBy(p => p.status);

for (const group of grouped) {
  kb.header(4, `${group.key} (${group.rows.length})`);
  kb.list(group.rows.file.link);  // Proxy works on group.rows too
}
```

### Limiting

```javascript
kb.pages()
  .sort(p => p.file.mtime, 'desc')
  .limit(10)                            // Take first 10
  .slice(5, 15)                         // Slice from index 5 to 15
```

### Searching

```javascript
kb.pages()
  .find(p => p.file.name === 'README')      // First match or undefined
  .findIndex(p => p.file.name === 'README') // Index of first match, or -1
  .some(p => p.status === 'urgent')          // Boolean: any match?
  .every(p => p.file.tags.length > 0)        // Boolean: all match?
  .none(p => p.priority === 'low')           // Boolean: no matches?
  .includes(somePage)                         // Boolean: contains item?
```

Use `.where()` + `.first()` to find a specific note:

```javascript
const daily = kb.pages()
  .where(p => p.file.basename === "daily-2026-02-13")
  .first();
```

### Date mapping

`.byDate(field, days)` maps an array of `DVDateTime` days to matching items. Returns a plain `(T | null)[]` aligned with the input days:

```javascript
const weekStart = kb.date("2026-02-09");
const weekEnd = weekStart.plus({ days: 6 });
const days = kb.getDaysInRange(weekStart, weekEnd);

const dailyNotes = kb.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd);

// Map each day to its note (or null if no note exists for that day)
const noteByDay = dailyNotes.byDate('created', days.array());
// noteByDay[0] = note for Mon, noteByDay[1] = note for Tue, ...
```

### Mutation

```javascript
kb.pages('#project')
  .mutate(p => { p.computed = p.priority * 10; })  // Modify in place, returns same DataArray
```

### Accessing results

```javascript
const pages = kb.pages('#project');
pages.first()       // First item or undefined
pages.last()        // Last item or undefined
pages.length        // Number of items
pages.values        // Raw JavaScript array
pages.array()       // Copy as plain array
pages.join(', ')    // Join as string
```

### Aggregation

```javascript
kb.pages('#expense')
  .sum(p => p.amount)        // Sum of amounts
  .avg(p => p.amount)        // Average
  .min(p => p.amount)        // Minimum
  .max(p => p.amount)        // Maximum
  .stats(p => p.amount)      // { sum, avg, min, max, count }
  .countBy(p => p.category)  // { "food": 5, "travel": 3, ... }
```

`stats()` and aggregation methods also work without a key function on numeric DataArrays:

```javascript
const sleepValues = kb.pages('#daily')
  .map(p => p.sleep_quality);

const s = sleepValues.stats();
kb.paragraph(`avg: ${s.avg.toFixed(1)}, min: ${s.min}, max: ${s.max}`);
```

`countBy()` without an argument counts by value:

```javascript
const allTags = kb.pages().flatMap(p => p.file.tags);
const tagCounts = allTags.countBy();  // { "#project": 5, "#meeting": 3, ... }
```

### Reduce

```javascript
kb.pages('#transaction')
  .reduce((total, p) => total + kb.number(p.amount), 0)
```

### Property access shorthand (Proxy-based)

Instead of explicitly calling `.map()`, you can access nested properties directly on the DataArray. This works at any depth:

```javascript
// Single level — maps .file across all pages:
kb.pages('#project').file.name

// Two levels deep — maps .file.tags across all pages:
kb.pages('#project').file.tags

// Chain DataArray methods on the result:
kb.pages().file.tags.distinct()    // All unique tags in the vault
kb.pages().file.basename           // All filenames
kb.pages().file.link               // All links (for kb.list())
```

> [!NOTE]
> Proxy access uses `.to()` internally, which **flattens** array values. If a property is an array, all values are merged into one DataArray. Use `.into(key)` if you need to keep arrays separate (one DataArray entry per item, not flattened).

### Wrapping raw arrays

Use `kb.array()` to wrap any JavaScript array and gain access to all DataArray methods:

```javascript
const da = kb.array([5, 3, 8, 1, 9, 2, 7]);
da.sort(x => x).join(', ')            // "1, 2, 3, 5, 7, 8, 9"
da.where(x => x > 4).join(', ')       // "5, 8, 9, 7"
da.first()                              // 5
da.length                               // 7

// Chaining
kb.array([10, 20, 30, 40, 50])
  .where(x => x > 15)
  .map(x => x * 2)
  .limit(2)                            // DataArray [40, 60]
```

## DVDateTime — Date Helper

QueryJS provides date helpers for working with temporal data.

### Creating dates

```javascript
const now = kb.date();                    // Current date/time
const specific = kb.date("2026-02-17");   // From ISO string
const safe = kb.tryDate(someValue);       // Returns null if unparseable
```

`kb.tryDate()` is essential for safely handling frontmatter values that might not be valid dates:

```javascript
const dt = kb.tryDate(page.created);
if (dt !== null) {
  kb.paragraph(`Created: ${dt.toISODate()}`);
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `.year` | `number` | Year (e.g. `2026`) |
| `.month` | `number` | Month (1–12) |
| `.day` | `number` | Day of month (1–31) |
| `.hour` | `number` | Hour (0–23) |
| `.minute` | `number` | Minute (0–59) |
| `.ts` | `number` | Timestamp in milliseconds |

```javascript
const hoje = kb.date("2026-02-17");
kb.paragraph(`Year: ${hoje.year}, Month: ${hoje.month}, Day: ${hoje.day}`);
kb.paragraph(`Timestamp: ${hoje.ts}`);
```

### Date arithmetic

```javascript
const d = kb.date("2026-02-17");
d.plus({ days: 7 })                      // 2026-02-24
d.plus({ months: 1 })                    // 2026-03-17
d.minus({ days: 7 })                     // 2026-02-10
d.minus({ months: 1 })                   // 2026-01-17
```

### Start-of-period

```javascript
d.startOf('day')                          // Start of current day
d.startOf('week')                         // Monday of current week
d.startOf('month')                        // First day of month
d.startOf('year')                         // January 1st
```

### Formatting

```javascript
d.toISODate()                             // "2026-02-17"
d.toFormat('yyyy/MM/dd')                  // "2026/02/17"
d.toFormat('dd-MM-yyyy')                  // "17-02-2026"
d.toJSDate()                              // Native JavaScript Date object
```

### Comparison

```javascript
const d1 = kb.date("2026-02-13");
const d2 = kb.date("2026-02-15");

// Comparison operators work directly:
d1 < d2                                   // true
d1 > d2                                   // false

// Check if two dates share the same unit:
d1.hasSame(d2, 'day')                     // false
d1.hasSame(d2, 'month')                   // true
d1.hasSame(d2, 'year')                    // true

// Strict equality via valueOf():
d1.valueOf() === kb.date("2026-02-13").valueOf()  // true
```

`hasSame()` is useful for custom date comparisons. For filtering DataArrays by date, prefer `.whereDate()`:

```javascript
const targetDate = kb.date("2026-02-13");

// Preferred — use whereDate() for filtering:
kb.pages('#meeting').whereDate('created', targetDate, targetDate)

// hasSame() is still useful for custom logic:
if (d1.hasSame(d2, 'month')) { /* same month */ }
```

### Date ranges

```javascript
const days = kb.getDaysInRange("2026-02-01", "2026-02-28");
// Returns DataArray<DVDateTime> — one entry per day

// Check if a date falls within the range:
days.some(dia => dia.hasSame(targetDate, 'day'))
```

## Render Methods

QueryJS can render output directly into your note.

### Text and headings

```javascript
kb.header(1, "Title")                     // Render an h1
kb.header(2, "Subtitle")                  // Render an h2 (1–6 supported)
kb.paragraph("A paragraph of text.")      // Render a <p>
kb.span("Inline text.")                   // Render a <span> (inline)
```

### Lists

```javascript
kb.list(["Item 1", "Item 2", "Item 3"])   // Bullet list
kb.list(kb.pages('#project').file.link)   // List of clickable links
```

### Tables

```javascript
kb.table(
  ["Name", "Status", "Due"],
  kb.pages('#project')
    .sort(p => p.file.mtime, 'desc')
    .map(p => [p.file.link, p.status, p.due])
)
```

### Task lists

```javascript
// From manual data:
kb.taskList([
  { text: "Write tests", completed: true },
  { text: "Deploy to production", completed: false },
])

// From page tasks:
const page = kb.page("projects/my-project.md");
kb.taskList(page.file.tasks);
```

### Custom HTML elements

`kb.el()` creates an HTML element and **returns the DOM node**, so you can manipulate it further:

```javascript
// Simple styled element:
kb.el('div', 'Styled content', {
  cls: 'my-class',
  attr: { style: 'padding: 12px; background: rgba(100,100,255,0.1); border-radius: 8px;' }
})

// Append children to the returned element:
const container = kb.el('div', '', { attr: { style: 'padding: 8px;' } });
const title = document.createElement('strong');
title.textContent = 'Custom title';
container.appendChild(title);
```

## UI Components (`kb.ui`)

The `kb.ui` namespace provides high-level components for building dashboards and visualizations without manual DOM manipulation.

### `kb.ui.cards(items, options?)` — Metric cards

Renders a grid of metric cards:

```javascript
kb.ui.cards([
  { label: 'Total Notes', value: 42, color: 'blue', icon: '📝' },
  { label: 'With Tags', value: 28, color: 'green', icon: '🏷️' },
  { label: 'Active', value: 5, color: 'orange', icon: '📊' },
], { columns: 3 })
```

Each item: `{ label: string, value: string | number, color?: string, icon?: string }`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | items.length | Number of cards per row (max 6) |
| `borderRadius` | `number` | `8` | Card corner radius in px |

Named color presets: `'blue'`, `'green'`, `'orange'`, `'red'`, `'purple'`, `'yellow'`, `'gray'` — or pass any CSS color string.

### `kb.ui.table(headers, rows, options?)` — Enhanced table

Like `kb.table()` but with additional styling options:

```javascript
kb.ui.table(
  ["Note", "Status", "Tags", "Size"],
  pages.map(p => [p.file.link, p.status || '—', p.file.tags.length, p.file.size]),
  {
    align: ['left', 'center', 'right', 'right'],  // Column alignment
    striped: true,                                   // Alternating row backgrounds
    footer: ['Total', '', totalTags, `${totalKB} KB`],  // Footer row
    rowStyle: (row) => {                             // Conditional row coloring
      if (row[1] === 'active') return 'rgba(72,187,120,0.08)';
      if (row[1] === 'planning') return 'rgba(66,153,225,0.08)';
      return null;
    },
  }
)
```

| Option | Type | Description |
|--------|------|-------------|
| `align` | `string[]` | Column alignments: `'left'`, `'center'`, `'right'` |
| `striped` | `boolean` | Alternating row background colors |
| `footer` | `any[]` | Footer row with summary data |
| `rowStyle` | `(row) => string \| null` | Return a CSS background color for conditional formatting |

### `kb.ui.progressBar(value, max, options?)` — Progress bar

Returns a unicode progress bar string, usable as a cell value in tables:

```javascript
kb.ui.table(
  ["Day", "Sleep", "Energy"],
  dailies.map(p => [
    p.file.basename,
    kb.ui.progressBar(kb.number(p.sleep_quality), 5),
    kb.ui.progressBar(kb.number(p.energy), 5),
  ]),
  { striped: true }
)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fillChar` | `string` | `"█"` | Character for filled portion |
| `emptyChar` | `string` | `"░"` | Character for empty portion |
| `showValue` | `boolean` | `true` | Append the numeric value after the bar |
| `width` | `number` | `max` | Total width in characters |

Also available as `kb.progressBar(value, max)` directly on the API (without options).

### `kb.ui.statusCards(items, options?)` — Status cards with badges

Renders colored cards with status badges:

```javascript
kb.ui.statusCards(
  pages.map(p => ({
    title: p.file.basename,
    status: p.status,               // Determines badge color
    subtitle: p.file.tags.join(' '), // Optional subtitle text
  })).array()
)
```

Each item: `{ title: string, status: string, subtitle?: string }`.

Built-in status colors: `active` (green), `done`/`completed` (blue), `draft` (orange), `planning` (blue), `archived` (gray), `cancelled` (red). Unknown statuses use gray.

Custom color map:

```javascript
kb.ui.statusCards(items, {
  colors: {
    'urgent': { bg: 'rgba(255,0,0,0.1)', border: 'rgba(255,0,0,0.4)' },
    'blocked': { bg: 'rgba(200,100,0,0.1)', border: 'rgba(200,100,0,0.4)' },
  }
})
```

### `kb.ui.timeline(items)` — Chronological timeline

Renders a vertical timeline grouped by date:

```javascript
kb.ui.timeline(
  pages
    .where(p => p.created !== undefined)
    .sort(p => p.created.ts, 'desc')
    .map(p => ({
      date: p.created.toISODate(),
      title: p.file.basename,
      subtitle: p.file.tags.slice(0, 2).join(' '),
    })).array()
)
```

Each item: `{ date: string, title: string, subtitle?: string, dotColor?: string }`.

Options: `{ dotColor?: string }` — default dot color (default: purple). Individual items can override with their own `dotColor`.

### `kb.ui.heatmap(pages, options)` — Activity heatmap

Renders a grid of colored squares (like GitHub's contribution graph):

```javascript
kb.ui.heatmap(dailies, {
  value: p => kb.number(p.sleep_quality),              // Numeric value
  label: p => p.created.toISODate().slice(5),          // Label below square
  tooltip: p => `${p.file.basename}: ${kb.number(p.sleep_quality)}/5`,
  max: 5,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `(item) => number` | required | Extract the numeric value |
| `label` | `(item) => string` | none | Text label for each square |
| `tooltip` | `(item) => string` | none | Hover tooltip text |
| `max` | `number` | auto-detected | Maximum value for color scaling |
| `min` | `number` | `0` | Minimum value for color scaling |
| `colorScale` | `string[]` | gray-to-green 6-step | Array of CSS colors for the scale |
| `cellSize` | `number` | `48` | Cell size in px |
| `showLegend` | `boolean` | `true` | Show Low/High legend below the grid |

### `kb.ui.tagCloud(tags, options?)` — Tag cloud

Renders tags as chips sized proportionally by frequency:

```javascript
const allTags = kb.pages().flatMap(p => p.file.tags).array();
kb.ui.tagCloud(allTags);

// Or pass pre-counted data:
kb.ui.tagCloud({ javascript: 10, python: 5, rust: 3 });
```

More frequent tags appear larger and more opaque. Each chip shows "tag (count)".

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minFontSize` | `number` | `14` | Minimum font size in px |
| `maxFontSize` | `number` | `26` | Maximum font size in px |
| `color` | `string` | `'rgba(139,108,239,0.3)'` | Base chip color |
| `showCount` | `boolean` | `true` | Show count in parentheses |

### `kb.ui.tags(tags, options?)` — Inline tag chips

Renders a row of styled tag chips — ideal for table cells:

```javascript
kb.ui.tags(['project', 'frontend', 'v2'])

// With custom styling:
kb.ui.tags(['urgent', 'bug'], {
  color: 'rgba(255,0,0,0.15)',
  textColor: 'red',
  fontSize: 12,
  gap: 6,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | `string` | `'rgba(124,58,237,0.15)'` | Chip background color |
| `textColor` | `string` | `'rgba(186,197,238,0.9)'` | Chip text color |
| `fontSize` | `number` | `11` | Font size in px |
| `gap` | `number` | `4` | Gap between chips in px |

Use in tables:

```javascript
kb.ui.table(
  ["Note", "Tags"],
  kb.pages().map(p => [
    p.file.link,
    p.file.tags.length > 0 ? kb.ui.tags(p.file.tags) : "—"
  ])
)
```

> [!NOTE]
> `kb.ui.tags()` renders each tag as-is. For frequency-scaled display, use `kb.ui.tagCloud()` instead.

### `kb.ui.heatmapCalendar(entries, options?)` — Year heatmap calendar

Renders a GitHub-style heatmap calendar for an entire year. Each day is a small colored cell whose color intensity maps to a configurable palette. Compatible with the Obsidian heatmap-calendar plugin API.

**Basic usage:**

```javascript
const dailies = kb.pages('#type/journal/daily');

kb.ui.heatmapCalendar(
  dailies.map(p => ({
    date: kb.tryDate(p.created)?.toISODate(),
    intensity: kb.number(p.sleep_quality),
  })).array()
)
```

**With custom colors and options:**

```javascript
kb.ui.heatmapCalendar(
  dailies.map(p => ({
    date: kb.tryDate(p.created)?.toISODate(),
    intensity: kb.number(p.exercise),
    color: 'red',
    content: kb.number(p.exercise) >= 4 ? '🏋️' : '',
  })).array(),
  {
    year: 2026,
    colors: {
      red: ['#ff9e82', '#ff7b55', '#ff4d1a', '#e73400', '#bd2a00'],
    },
    showCurrentDayBorder: true,
    defaultEntryIntensity: 4,
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
)
```

**Multi-color tracking:**

```javascript
kb.ui.heatmapCalendar(
  dailies.map(p => ({
    date: kb.tryDate(p.created)?.toISODate(),
    intensity: kb.number(p.social_time),
    color: p.social_incoming ? 'pink' : 'blue',
  })).array(),
  {
    colors: {
      blue: ['#c0ddf9', '#73b3f3', '#3886e1', '#2171cd', '#1b5faa'],
      pink: ['#ffcce5', '#ff8fbf', '#ff5299', '#e63680', '#bf1a66'],
    },
  }
)
```

Each entry: `{ date: string, intensity?: number, color?: string, content?: string }`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `year` | `number` | current year | Year to display |
| `colors` | `Record<string, string[]>` | GitHub green 5-step | Color palettes keyed by name |
| `showCurrentDayBorder` | `boolean` | `true` | Show a border on today's cell |
| `defaultEntryIntensity` | `number` | `4` | Fallback intensity when not specified |
| `intensityScaleStart` | `number` | auto-detected | Min intensity for mapping |
| `intensityScaleEnd` | `number` | auto-detected | Max intensity for mapping |
| `weekStartDay` | `number` | `1` (Monday) | 0 = Sunday, 1 = Monday, … 6 = Saturday |

Each color palette is an array of CSS colors ordered from lowest to highest intensity. The entry's `intensity` value is linearly mapped to the palette length. Entries without a `color` key use the first palette.

### `kb.ui.yearlyCalendar(entries, options?)` — Vertical year calendar

Renders a vertical year calendar with months as columns and days as rows (12 columns × 31 rows). Each day is a rounded square colored by intensity. Complementary to `heatmapCalendar` — same data, different visual orientation.

```
     J  F  M  A  M  J  J  A  S  O  N  D
 1   □  □  □  □  □  □  □  □  □  □  □  □
 2   □  □  □  □  □  □  □  □  □  □  □  □
 3   □  □  □  □  □  □  □  □  □  □  □  □
...  (up to 31 rows)
```

**Basic usage:**

```javascript
const dailies = kb.pages('#type/journal/daily');

kb.ui.yearlyCalendar(
  dailies.map(p => ({
    date: kb.tryDate(p.created)?.toISODate(),
    intensity: kb.number(p.sleep_quality),
  })).array()
)
```

**With emoji content on high-intensity days:**

```javascript
kb.ui.yearlyCalendar(
  dailies.map(p => {
    const val = kb.number(p.exercise);
    return {
      date: kb.tryDate(p.created)?.toISODate(),
      intensity: val,
      color: 'red',
      content: val >= 4 ? '💪' : '',
    };
  }).array(),
  {
    year: 2026,
    colors: {
      red: ['#ff9e82', '#ff7b55', '#ff4d1a', '#e73400', '#bd2a00'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
)
```

Accepts the same `{ date, intensity?, color?, content? }` entries as `heatmapCalendar`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `year` | `number` | current year | Year to display |
| `colors` | `Record<string, string[]>` | GitHub green 5-step | Color palettes keyed by name |
| `showCurrentDayBorder` | `boolean` | `true` | Show a border on today's cell |
| `defaultEntryIntensity` | `number` | `4` | Fallback intensity when not specified |
| `intensityScaleStart` | `number` | auto-detected | Min intensity for mapping |
| `intensityScaleEnd` | `number` | auto-detected | Max intensity for mapping |

### `kb.ui.chart(type, options)` — Chart.js charts

Renders interactive Chart.js visualizations with automatic CDN loading, theme detection, and simplified dataset colors. **This method is async** — use `await`.

Supported types: `'bar'`, `'line'`, `'radar'`, `'pie'`, `'doughnut'`, `'polarArea'`.

**Radar chart:**

```javascript
await kb.ui.chart('radar', {
  labels: ['Sleep', 'Energy', 'Mood', 'Water', 'Exercise'],
  datasets: [
    { label: 'Monday', data: [4, 3, 5, 2, 4], color: 'rgba(66,153,225,1)' },
    { label: 'Tuesday', data: [3, 4, 3, 5, 2], color: 'rgba(72,187,120,1)' },
  ],
  max: 5,
  stepSize: 1,
})
```

**Bar chart:**

```javascript
const tagCounts = kb.pages().flatMap(p => p.file.tags).countBy();
const entries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

await kb.ui.chart('bar', {
  labels: entries.map(e => e[0]),
  datasets: [{ label: 'Notes', data: entries.map(e => e[1]), color: 'rgba(139,108,239,1)' }],
})
```

**Pie/Doughnut chart with per-segment colors:**

```javascript
await kb.ui.chart('doughnut', {
  labels: ['Active', 'Draft', 'Done'],
  datasets: [{
    label: 'Status',
    data: [12, 5, 8],
    color: ['rgba(72,187,120,1)', 'rgba(237,137,54,1)', 'rgba(160,160,160,1)'],
  }],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `labels` | `string[]` | required | Axis labels or segment names |
| `datasets` | `array` | required | Array of `{ label, data, color }` |
| `max` | `number` | auto | Maximum scale value |
| `min` | `number` | `0` | Minimum scale value |
| `maxWidth` | `number` | `600`/`800` | Max container width (px). 600 for radar/pie, 800 for bar/line |
| `showLegend` | `boolean` | `true` | Show/hide the legend |
| `stepSize` | `number` | auto | Tick step size |
| `fill` | `boolean` | varies | Fill area (default: `true` for radar, `false` for line) |

Each dataset `color` can be a single CSS color string or an array of strings (for per-segment coloring in pie/doughnut/polarArea). A single color is automatically expanded into `borderColor`, `backgroundColor` (with transparency), and point highlight colors.

> [!NOTE]
> Chart.js is loaded automatically from CDN on first use. If loading fails (e.g., no internet), an error message is shown inline instead of the chart.

### Dashboard example

Combine multiple `kb.ui` components in a single block:

```javascript
const all = kb.pages();
const dailies = all.where(p => p.file.tags.some(t => t === 'type/journal/daily'));

// Metric cards
kb.ui.cards([
  { label: 'Total Notes', value: all.length, color: 'blue', icon: '📝' },
  { label: 'Daily Notes', value: dailies.length, color: 'green', icon: '📅' },
  { label: 'Avg Sleep', value: dailies.avg(p => kb.number(p.sleep_quality)).toFixed(1), color: 'purple', icon: '😴' },
], { columns: 3 })

// Heatmap
kb.header(3, "Sleep This Week")
kb.ui.heatmap(dailies, {
  value: p => kb.number(p.sleep_quality),
  label: p => p.file.basename.replace('daily-2026-02-', ''),
  max: 5,
})

// Table with progress bars
kb.ui.table(
  ["Day", "Sleep", "Energy", "Mood"],
  dailies.sort(p => p.file.basename).map(p => [
    p.file.basename,
    kb.ui.progressBar(kb.number(p.sleep_quality), 5),
    kb.ui.progressBar(kb.number(p.energy), 5),
    kb.ui.progressBar(kb.number(p.mood), 5),
  ]),
  { striped: true, align: ['left', 'center', 'center', 'center'] }
)

// Tag cloud
kb.header(3, "Tags")
kb.ui.tagCloud(all.flatMap(p => p.file.tags).array())
```

## Loading External Scripts

You can organize reusable queries in separate `.js` files and load them with `kb.view()`:

```javascript
await kb.view("scripts/my-dashboard")     // Loads and executes scripts/my-dashboard.js
await kb.view("scripts/report", { year: 2026 })  // Pass input data
```

The loaded script has full access to the `kb` API, including `kb.current()` — so it can reference the note that triggered it. This is useful for building reusable components:

```javascript
// In scripts/meeting-list.js:
const target = kb.tryDate(kb.current().created);
if (!target) return;

const meetings = kb.pages()
  .whereTag('type/meeting')
  .whereDate('created', target, target);

kb.ui.table(
  ["Meeting", "Time", "Tags"],
  meetings.map(p => {
    const dt = kb.tryDate(p.created);
    return [p.file.link, dt ? dt.toFormat("HH:mm") : "—", kb.ui.tags(p.file.tags)];
  })
);
```

You can also load external libraries via CDN inside a `kb.view()` script:

```javascript
if (!window.Chart) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(script);
  await new Promise(resolve => script.onload = resolve);
}
// Now use Chart.js to render a canvas...
```

> [!TIP]
> For Chart.js specifically, use `kb.ui.chart()` instead of loading manually — it handles CDN loading, theme detection, and color configuration automatically.

## Utility Methods

```javascript
kb.array([1, 2, 3])                                  // Wrap in DataArray
kb.isArray(value)                                     // Check if DataArray or Array
kb.fileLink("path/to/note.md")                       // Create a DVLink
kb.fileLink("path/to/note.md", false, "Display Name") // DVLink with custom display text
kb.compare(a, b)                                      // Compare two values (-1, 0, 1)
kb.equal(a, b)                                        // Deep equality check
```

## Advanced: DOM Access

QueryJS runs without a sandbox — you have full access to the DOM. `kb.el()` returns an `HTMLElement` that you can append children to, and `document.createElement()` is available:

```javascript
const container = kb.el('div', '', { attr: { style: 'padding: 8px;' } });

const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 50;
container.appendChild(canvas);

const ctx = canvas.getContext('2d');
if (ctx) {
  ctx.fillStyle = '#7c3aed';
  for (let i = 0; i < 10; i++) {
    const h = Math.random() * 40 + 5;
    ctx.fillRect(i * 20 + 2, 50 - h, 16, h);
  }
}
```

## Error Handling

Script errors are displayed **inline** in the note — the editor never crashes.

- **Runtime errors** show a message like: *"QueryJS Error: x is not defined"*
- **Syntax errors** show the parse error message inline
- **Partial renders are preserved** — if a script renders content before hitting an error, the content rendered before the error is kept, and the error message appears after it

```javascript
kb.paragraph("This renders successfully");
kb.list(["Item 1", "Item 2"]);
// This will cause an error, but the paragraph and list above are preserved:
undefined.crash();
```

## Practical Examples

### List all active projects

```javascript
kb.list(
  kb.pages('#project')
    .where(p => p.status === 'active')
    .sort(p => p.priority, 'desc')
    .file.link
)
```

### Table of recent meetings

```javascript
kb.table(
  ["Meeting", "Date", "Attendees"],
  kb.pages('#meeting')
    .sort(p => p.date, 'desc')
    .limit(10)
    .map(p => [p.file.link, p.date, (p.attendees || []).join(', ')])
)
```

### Meetings for a specific date

```javascript
const targetDate = kb.date("2026-02-13");

const meetings = kb.pages()
  .whereTag('type/meeting')
  .whereDate('created', targetDate, targetDate);

kb.header(3, `Meetings on ${targetDate.toISODate()} (${meetings.length})`);
kb.list(meetings.file.link);
```

### Weekly tracking table

```javascript
const weekStart = kb.date("2026-02-09");
const weekEnd = weekStart.plus({ days: 6 });

const dailyNotes = kb.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd)
  .sort(p => kb.tryDate(p.created)?.ts ?? 0);

kb.ui.table(
  ["Day", "Sleep", "Energy", "Mood"],
  dailyNotes.map(p => [
    p.file.basename,
    kb.ui.progressBar(kb.number(p.sleep_quality), 5),
    kb.ui.progressBar(kb.number(p.energy), 5),
    kb.ui.progressBar(kb.number(p.mood), 5),
  ]),
  { striped: true, align: ['left', 'center', 'center', 'center'] }
)
```

### Tag frequency table

```javascript
const allTags = kb.pages().flatMap(p => p.file.tags);
const tagCounts = allTags.countBy();

kb.table(
  ["Tag", "Count"],
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => [tag, count])
)
```

### Count tasks per status

```javascript
const allTasks = kb.pages().file.tasks;
const done = allTasks.where(t => t.completed).length;
const pending = allTasks.where(t => !t.completed).length;
kb.paragraph(`Done: ${done}, Pending: ${pending}`);
```

### Group notes by tag

```javascript
kb.pages()
  .flatMap(p => p.file.tags.map(tag => ({ tag, page: p })))
  .groupBy(x => x.tag)
  .forEach(group => {
    kb.header(3, group.key);
    kb.list(group.rows.map(x => x.page.file.link));
  });
```

### Related notes (shared tags)

```javascript
const current = kb.current();
const myTags = current.file.tags;

const related = kb.pages()
  .where(p => p.file.path !== current.file.path)
  .where(p => p.file.tags.some(t => myTags.includes(t)))
  .sort(p => -p.file.tags.filter(t => myTags.includes(t)).length)
  .limit(10);

kb.table(
  ["Note", "Shared Tags", "Count"],
  related.map(p => {
    const shared = p.file.tags.filter(t => myTags.includes(t));
    return [p.file.link, shared.join(', '), shared.length];
  })
)
```

### Vault statistics

```javascript
const pages = kb.pages();
const totalSize = pages.reduce((acc, p) => acc + p.file.size, 0);

kb.paragraph(`Total: ${pages.length} files, ${(totalSize / 1024).toFixed(1)} KB`);
kb.paragraph(`Avg size: ${pages.avg(p => p.file.size).toFixed(0)} bytes`);
kb.paragraph(`Smallest: ${pages.min(p => p.file.size)} bytes`);
kb.paragraph(`Largest: ${pages.max(p => p.file.size)} bytes`);
```

> [!NOTE]
> QueryJS is used internally by the Collection feature. For simple table views with filters and sorts, consider using [Collection](12-collection.md) instead — no code required.

## Next Steps

- [Collection](12-collection.md) — Visual table queries (no code needed)
- [Graph View](14-graph-view.md) — Visualize your notes as an interactive knowledge graph
