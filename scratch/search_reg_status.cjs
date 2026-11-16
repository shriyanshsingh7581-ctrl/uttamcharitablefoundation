const fs = require('fs');

const content = fs.readFileSync('src/components/PaperRegistrationForm.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('status:') || l.includes('distribute') || l.includes('commission') || l.includes('packageAmount') || l.includes('approval') || l.includes('payment_requests')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
