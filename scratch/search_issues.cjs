const fs = require('fs');
const path = require('path');

function searchInDir(dir, regex, label) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath, regex, label);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (regex.test(l)) {
          console.log(`[${label}] ${fullPath}:${idx+1}: ${l.trim()}`);
        }
      });
    }
  }
}

console.log('--- Search Binary / Left / Right ---');
searchInDir('./src', /\b(leftCount|rightCount|leftMembers|rightMembers|leftTeam|rightTeam|binary|बायाँ|दायाँ)\b|Left:|Right:/i, 'BINARY');

console.log('--- Search Self Commission ---');
searchInDir('./src', /\b(selfBusinessRate|selfBusinessCommission|selfCommission)\b/i, 'SELF_COMM');
