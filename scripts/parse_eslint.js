const fs = require('fs');
const r = require('./eslint_report2.json');
let out = '';
r.forEach(f => {
  if (f.messages.length) {
    const relevant = f.messages.filter(m => !m.ruleId?.includes('unused-styles') && !m.ruleId?.includes('unescaped-entities'));
    if (relevant.length) {
      out += `\n--- ${f.filePath}\n`;
      relevant.forEach(m => out += `${m.ruleId || 'ERROR'}: ${m.message} (Line ${m.line})\n`);
    }
  }
});
fs.writeFileSync('eslint_summary.txt', out);
