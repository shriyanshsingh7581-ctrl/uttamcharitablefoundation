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
        if (/(left|right)\s*[:(]?\s*\d+|binary|left\s*leg|right\s*leg|left\s*side|right\s*side|बायाँ|दायाँ/i.test(l)) {
          // ignore CSS position like left: 0, right: 0
          if (/left:\s*['"]?\d+px|right:\s*['"]?\d+px|left:\s*['"]?\d+%|right:\s*['"]?\d+%/.test(l)) return;
          console.log(`${full}:${idx+1}: ${l.trim()}`);
        }
      });
    }
  }
}

searchAll('./src');
