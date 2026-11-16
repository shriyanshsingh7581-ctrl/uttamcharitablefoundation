const fs = require('fs');

const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.toLowerCase().includes('left') || l.toLowerCase().includes('right') || l.toLowerCase().includes('generation') || l.toLowerCase().includes('binary') || l.toLowerCase().includes('level 1') || l.includes('teamModalTab')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
