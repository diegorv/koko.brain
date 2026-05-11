// Monthly Satisfaction Chart — weekly life satisfaction for the month
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
  tag: 'type/journal/weekly',
  periodType: 'month',
  colors: [
    'rgba(66,153,225,1)',   // W1
    'rgba(72,187,120,1)',   // W2
    'rgba(237,137,54,1)',   // W3
    'rgba(139,108,239,1)',  // W4
    'rgba(237,100,166,1)',  // W5
  ],
  header: 'Monthly Averages',
  headerRow: 'Area',
  emptyMessage: "*No satisfaction data found for this month.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? `W${d.weekNumber} (${d.toFormat('dd/MM')})` : `Week ${i + 1}`;
  },
});
