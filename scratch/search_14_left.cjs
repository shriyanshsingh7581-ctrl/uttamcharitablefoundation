const fs = require('fs');
const path = require('path');

function searchAll(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchAll(full);
    } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.json')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('14') && (c.includes('Left') || c.includes('Right') || c.includes('left') || c.includes('right'))) {
        const lines = c.split('\n');
        lines.forEach((l, idx) => {
          if ((l.includes('Left') || l.includes('Right') || l.includes('left') || l.includes('right')) && (l.includes('14') || l.includes('12') || l.includes('team') || l.includes('downline'))) {
            console.log(`${full}:${idx+1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}

searchAll('./src');
