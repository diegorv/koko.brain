// Shared radar chart + averages table for "periodic" journal notes
// (month / quarter / year rolling up weekly / monthly / quarterly children).
//
// Called via: kb.view('_system/queryjs/_shared-period-radar', { ... })
//
// Expected `input`:
//   fields:       Array<{ key: string, label: string }>
//   tag:          Tag of the child notes to aggregate, e.g. 'type/journal/weekly'
//   periodType:   'month' | 'quarter' | 'year'
//   colors:       string[] — one per dataset (cycles if notes > colors.length)
//   header:       Table header, e.g. 'Monthly Averages'
//   headerRow:    First column label, e.g. 'Area' | 'Practice' | 'Habit'
//   emptyMessage: Shown when no note in the period has any data
//   labelFn:      (note, index) => string — dataset label (e.g. "W17 (20/04)")

const {
  fields,
  tag,
  periodType,
  colors,
  header,
  headerRow,
  emptyMessage,
  labelFn,
} = input;

const current = kb.current();
if (!current?.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const base = kb.tryDate(current.created);
if (!base) {
  kb.paragraph("*Invalid created date.*");
  return;
}

const notes = kb.pages(`#${tag}`)
  .whereDate('created', base.startOf(periodType), base.endOf(periodType))
  .sort(p => p.created, 'asc')
  .array();

const datasets = notes
  .map((note, i) => {
    const data = fields.map(f => kb.number(note[f.key]));
    if (!data.some(v => v > 0)) return null;
    return { label: labelFn(note, i), data, color: colors[i % colors.length] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  kb.paragraph(emptyMessage);
  return;
}

await kb.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

kb.header(3, header);

const notesWithData = notes.filter(n => fields.some(f => kb.number(n[f.key]) > 0));
const count = notesWithData.length || 1;
const averages = fields.map(f => {
  const sum = notesWithData.reduce((acc, n) => acc + kb.number(n[f.key]), 0);
  return Math.round((sum / count) * 10) / 10;
});

kb.table(
  [headerRow, "Avg", "Visual"],
  fields.map((f, i) => [f.label, averages[i].toFixed(1), kb.progressBar(averages[i], 5)])
);
