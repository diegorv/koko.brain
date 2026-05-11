// Yearly Satisfaction by Quarter — quarterly life satisfaction for the year
const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

await kb.view('_system/queryjs/_shared-period-radar', {
  fields: [
    { key: 'satisfaction_health', label: 'Health' },
    { key: 'satisfaction_finances', label: 'Finances' },
    { key: 'satisfaction_work', label: 'Work' },
    { key: 'satisfaction_growth', label: 'Growth' },
    { key: 'satisfaction_partner', label: 'Partner' },
    { key: 'satisfaction_social', label: 'Social' },
    { key: 'satisfaction_fun', label: 'Fun' },
    { key: 'satisfaction_purpose', label: 'Purpose' },
  ],
  tag: 'type/journal/quarterly',
  periodType: 'year',
  colors: [
    'rgba(66,153,225,1)',   // Q1
    'rgba(72,187,120,1)',   // Q2
    'rgba(237,137,54,1)',   // Q3
    'rgba(139,108,239,1)',  // Q4
  ],
  header: 'Yearly Averages',
  headerRow: 'Area',
  emptyMessage: "*No satisfaction data found for this year.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? `${quarterNames[d.quarter - 1]} ${d.year}` : `Q${i + 1}`;
  },
});
