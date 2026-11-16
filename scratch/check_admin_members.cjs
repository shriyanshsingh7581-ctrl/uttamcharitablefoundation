const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/Members.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('level') || l.includes('status') || l.includes('active') || l.includes('pending') || l.includes('approval')) {
    if (i < 250) console.log(`${i+1}: ${l.trim()}`);
  }
});
