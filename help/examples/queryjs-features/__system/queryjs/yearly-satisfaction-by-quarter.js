// Yearly Satisfaction by Quarter - Radar chart with quarterly life satisfaction for the year
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

const quarterColors = [
  'rgba(66,153,225,1)',   // Q1
  'rgba(72,187,120,1)',   // Q2
  'rgba(237,137,54,1)',   // Q3
  'rgba(139,108,239,1)',  // Q4
];
const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

// Find quarterly notes in this year
const quarterlyNotes = kb.pages('#type/journal/quarterly')
  .whereDate('created', yearStart, yearEnd);

const sorted = quarterlyNotes.sort(p => p.created, 'asc').array();

// Build radar datasets — one line per quarter that has data
const datasets = sorted
  .map((nota, i) => {
    const data = fields.map(f => kb.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    const qDate = kb.tryDate(nota.created);
    const label = qDate ? `${quarterNames[qDate.quarter - 1]} ${qDate.year}` : `Q${i + 1}`;
    return { label, data, color: quarterColors[i % quarterColors.length] };
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
kb.header(3, 'Yearly Averages');

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
