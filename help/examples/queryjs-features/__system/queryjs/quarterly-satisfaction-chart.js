// Quarterly Satisfaction Chart — monthly life satisfaction for the quarter
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
  tag: 'type/journal/monthly',
  periodType: 'quarter',
  colors: [
    'rgba(66,153,225,1)',   // M1
    'rgba(72,187,120,1)',   // M2
    'rgba(237,137,54,1)',   // M3
  ],
  header: 'Quarterly Averages',
  headerRow: 'Area',
  emptyMessage: "*No satisfaction data found for this quarter.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? d.toFormat('MMMM') : `Month ${i + 1}`;
  },
});
