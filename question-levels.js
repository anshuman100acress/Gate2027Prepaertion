/* Reasoning levels are course guidance; marks remain independent. */
(function (root) {
  'use strict';
  const levels = [
    { label: 'Foundation', goal: 'Identify the inputs and the rule.' },
    { label: 'Application', goal: 'Apply a rule in a concrete case.' },
    { label: 'Reasoning', goal: 'Connect the intermediate steps.' },
    { label: 'Error diagnosis', goal: 'Test assumptions and expose a trap.' },
    { label: 'Synthesis', goal: 'Combine ideas and justify the method.' }
  ];
  function describe(q) {
    let level = q.complexity;
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      level = q.level === 'Foundation' ? 1 : q.level === 'Application' ? 2 : q.type === 'MSQ' ? 3 : 2;
    }
    return { level, ...levels[level - 1] };
  }
  root.GatewiseComplexity = { describe, levels };
})(typeof window === 'object' ? window : globalThis);
