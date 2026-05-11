// Yearly Practices by Month — monthly practices for the year
await kb.view('_system/queryjs/_shared-period-radar', {
  fields: [
    { key: 'practice_exercise', label: 'Exercise' },
    { key: 'practice_eating', label: 'Eating' },
    { key: 'practice_sleep', label: 'Sleep' },
    { key: 'practice_journaling', label: 'Journaling' },
    { key: 'practice_inputs', label: 'Inputs' },
    { key: 'practice_focus', label: 'Focus' },
    { key: 'practice_presence', label: 'Presence' },
    { key: 'practice_relationships', label: 'Relationships' },
    { key: 'practice_projects', label: 'Projects' },
    { key: 'practice_outdoors', label: 'Outdoors' },
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
  headerRow: 'Practice',
  emptyMessage: "*No practices data found for this year.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? d.toFormat('MMM') : `Month ${i + 1}`;
  },
});
