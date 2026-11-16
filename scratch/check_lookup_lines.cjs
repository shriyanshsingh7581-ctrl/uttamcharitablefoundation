const fs = require('fs');

const content = fs.readFileSync('src/components/MemberReportLookup.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('selfBusinessRate') || l.includes('selfBusinessCommission') || l.includes('Self Commission') || l.includes('selfComm')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
