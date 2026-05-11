// Shared radar chart + averages table for weekly journal notes.
// Aggregates #type/journal/daily notes for the week of the current note,
// mapping each day Mon..Sun positionally.
//
// Called via: kb.view('_system/queryjs/_shared-weekly-radar', { ... })
//
// Expected `input`:
//   fields:       Array<{ key: string, label: string }>
//   header:       Table header, e.g. 'Weekly Averages'
//   headerRow:    First column label, e.g. 'Metric' | 'Habit'
//   emptyMessage: Shown when no day in the week has any data

const { fields, header, headerRow, emptyMessage } = input;

const current = kb.current();
if (!current?.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const weekStart = kb.tryDate(current.created);
if (!weekStart) {
  kb.paragraph("*Invalid created date.*");
  return;
}

const weekEnd = weekStart.plus({ days: 6 });
const daysArr = kb.getDaysInRange(weekStart, weekEnd).array();

const dayColors = [
  'rgba(66,153,225,1)',   // Mon
  'rgba(72,187,120,1)',   // Tue
  'rgba(237,137,54,1)',   // Wed
  'rgba(139,108,239,1)',  // Thu
  'rgba(237,100,166,1)',  // Fri
  'rgba(56,178,172,1)',   // Sat
  'rgba(245,196,66,1)',   // Sun
];
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const noteByDay = kb.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd)
  .byDate('created', daysArr);

const datasets = noteByDay
  .map((note, i) => {
    if (!note) return null;
    const data = fields.map(f => kb.number(note[f.key]));
    if (!data.some(v => v > 0)) return null;
    return {
      label: `${dayNames[i]} ${daysArr[i].toFormat('dd/MM')}`,
      data,
      color: dayColors[i],
    };
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

// Average only over days that have at least one non-zero field — consistent
// with monthly/quarterly/yearly charts (zero-day entries would otherwise
// dilute the weekly average).
const notesWithData = noteByDay.filter(n => n && fields.some(f => kb.number(n[f.key]) > 0));
const count = notesWithData.length || 1;
const averages = fields.map(f => {
  const sum = notesWithData.reduce((acc, n) => acc + kb.number(n[f.key]), 0);
  return Math.round((sum / count) * 10) / 10;
});

kb.table(
  [headerRow, "Avg", "Visual"],
  fields.map((f, i) => [f.label, averages[i].toFixed(1), kb.progressBar(averages[i], 5)])
);
