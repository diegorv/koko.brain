// Yearly Satisfaction by Month - Radar chart with monthly life satisfaction for the year
const current = kb.current();
if (!current || !current.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const yearDate = kb.tryDate(current.created);
if (!yearDate) {
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

const yearStart = yearDate.startOf('year');
const yearEnd = yearDate.endOf('year');

const monthColors = [
  'rgba(66,153,225,1)',    // Jan
  'rgba(72,187,120,1)',    // Feb
  'rgba(237,137,54,1)',    // Mar
  'rgba(139,108,239,1)',   // Apr
  'rgba(237,100,166,1)',   // May
  'rgba(56,178,172,1)',    // Jun
  'rgba(245,196,66,1)',    // Jul
  'rgba(160,95,210,1)',    // Aug
  'rgba(236,72,153,1)',    // Sep
  'rgba(99,179,237,1)',    // Oct
  'rgba(154,205,50,1)',    // Nov
  'rgba(255,140,105,1)',   // Dec
];

// Find monthly notes in this year
const monthlyNotes = kb.pages('#type/journal/monthly')
  .whereDate('created', yearStart, yearEnd);

const sorted = monthlyNotes.sort(p => p.created, 'asc').array();

// Build radar datasets — one line per month that has data
const datasets = sorted
  .map((nota, i) => {
    const data = fields.map(f => kb.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    const mDate = kb.tryDate(nota.created);
    const label = mDate ? mDate.toFormat('MMM') : `Month ${i + 1}`;
    return { label, data, color: monthColors[i % monthColors.length] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  kb.paragraph("*No satisfaction data found for this year.*");
  return;
}

await kb.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

// Yearly averages table
kb.header(3, 'Yearly Averages (Monthly)');

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
