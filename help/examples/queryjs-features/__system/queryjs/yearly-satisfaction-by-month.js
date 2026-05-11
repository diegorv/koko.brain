// Yearly Satisfaction by Month — monthly life satisfaction for the year
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
  periodType: 'year',
  colors: [
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
  ],
  header: 'Yearly Averages (Monthly)',
  headerRow: 'Area',
  emptyMessage: "*No satisfaction data found for this year.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? d.toFormat('MMM') : `Month ${i + 1}`;
  },
});
