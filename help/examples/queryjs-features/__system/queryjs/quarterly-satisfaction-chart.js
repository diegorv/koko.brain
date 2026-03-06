// Quarterly Satisfaction Chart - Radar chart with monthly life satisfaction for the quarter
const current = kb.current();
if (!current || !current.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const quarterDate = kb.tryDate(current.created);
if (!quarterDate) {
  kb.paragraph("*Invalid created date.*");
  return;
}

const fields = [
  { key: 'satisfaction_health', label: 'Health' },
  { key: 'satisfaction_finances', label: 'Finances' },
  { key: 'satisfaction_work', label: 'Work' },
  { key: 'satisfaction_growth', label: 'Growth' },
  { key: 'satisfaction_partner', label: 'Partner' },
  { key: 'satisfaction_social', label: 'Social' },
  { key: 'satisfaction_fun', label: 'Fun' },
  { key: 'satisfaction_purpose', label: 'Purpose' },
];

const quarterStart = quarterDate.startOf('quarter');
const quarterEnd = quarterDate.endOf('quarter');

const monthColors = [
  'rgba(66,153,225,1)',   // Month 1
  'rgba(72,187,120,1)',   // Month 2
  'rgba(237,137,54,1)',   // Month 3
];

// Find monthly notes in this quarter
const monthlyNotes = kb.pages('#type/journal/monthly')
  .whereDate('created', quarterStart, quarterEnd);

const sorted = monthlyNotes.sort(p => p.created, 'asc').array();

// Build radar datasets — one line per month that has data
const datasets = sorted
  .map((nota, i) => {
    const data = fields.map(f => kb.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    const monthDate = kb.tryDate(nota.created);
    const label = monthDate ? monthDate.toFormat('MMMM') : `Month ${i + 1}`;
    return { label, data, color: monthColors[i % monthColors.length] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  kb.paragraph("*No satisfaction data found for this quarter.*");
  return;
}

await kb.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

// Quarterly averages table
kb.header(3, 'Quarterly Averages');

const notesWithData = sorted.filter(n => fields.some(f => kb.number(n[f.key]) > 0));
const count = notesWithData.length || 1;

const averages = fields.map(f => {
  const sum = notesWithData.reduce((acc, nota) => acc + kb.number(nota[f.key]), 0);
  return Math.round((sum / count) * 10) / 10;
});

kb.table(
  ["Area", "Avg", "Visual"],
  fields.map((f, i) => [f.label, averages[i].toFixed(1), kb.progressBar(averages[i], 5)])
);
