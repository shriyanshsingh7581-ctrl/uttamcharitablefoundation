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
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const c = fs.readFileSync(full, 'utf8');
      const lines = c.split('\n');
      lines.forEach((l, idx) => {
        if (/tree|genealogy|downline\s*tree|generation\s*chart|network\s*chart/i.test(l)) {
          console.log(`${full}:${idx+1}: ${l.trim()}`);
        }
      });
    }
  }
}

searchAll('./src');
