// Monthly Satisfaction Chart - Radar chart with weekly life satisfaction for the month
const current = kb.current();
if (!current || !current.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const monthDate = kb.tryDate(current.created);
if (!monthDate) {
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

const monthStart = monthDate.startOf('month');
const monthEnd = monthDate.endOf('month');

const weekColors = [
  'rgba(66,153,225,1)',   // W1
  'rgba(72,187,120,1)',   // W2
  'rgba(237,137,54,1)',   // W3
  'rgba(139,108,239,1)',  // W4
  'rgba(237,100,166,1)',  // W5
];

// Find weekly notes in this month
const weeklyNotes = kb.pages('#type/journal/weekly')
  .whereDate('created', monthStart, monthEnd);

const sorted = weeklyNotes.sort(p => p.created, 'asc').array();

// Build radar datasets — one line per week that has data
const datasets = sorted
  .map((nota, i) => {
    const data = fields.map(f => kb.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    const weekDate = kb.tryDate(nota.created);
    const label = weekDate ? `W${weekDate.weekNumber} (${weekDate.toFormat('dd/MM')})` : `Week ${i + 1}`;
    return { label, data, color: weekColors[i % weekColors.length] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  kb.paragraph("*No satisfaction data found for this month.*");
  return;
}

await kb.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

// Monthly averages table
kb.header(3, 'Monthly Averages');

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
