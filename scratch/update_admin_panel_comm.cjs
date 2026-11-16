const fs = require('fs');

const path = 'src/pages/AdminPanel.jsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Import GenerationTreeChart and autoMigrateAndRecalculateUsers
if (!content.includes('GenerationTreeChart')) {
  content = content.replace(
    "import MemberReportLookup from '../components/MemberReportLookup';",
    "import MemberReportLookup from '../components/MemberReportLookup';\nimport GenerationTreeChart from '../components/GenerationTreeChart';"
  );
  console.log('1. Imported GenerationTreeChart in AdminPanel.jsx');
}

if (!content.includes('autoMigrateAndRecalculateUsers')) {
  content = content.replace(
    "syncAndFixAllMemberBalances",
    "syncAndFixAllMemberBalances,\n  autoMigrateAndRecalculateUsers"
  );
  console.log('2. Imported autoMigrateAndRecalculateUsers');
}

// 2. Update default levelRates and selfBusinessRate states
const oldRatesState = `  const [levelRates, setLevelRates] = useState({
    1: 20, 2: 10, 3: 8, 4: 6, 5: 5, 6: 4, 7: 3, 8: 2, 9: 2, 10: 2, 11: 1, 12: 1
  });
  const [selfBusinessRate, setSelfBusinessRate] = useState(5);`;

const newRatesState = `  const [levelRates, setLevelRates] = useState({
    1: 20, 2: 8, 3: 5, 4: 4, 5: 3, 6: 2.5, 7: 2, 8: 1.5, 9: 1, 10: 1, 11: 1, 12: 1
  });
  const [selfBusinessRate, setSelfBusinessRate] = useState(0);`;

if (content.includes(oldRatesState)) {
  content = content.replace(oldRatesState, newRatesState);
  console.log('3. Updated default levelRates and selfBusinessRate to 0');
}

// 3. Update membersLedger selfComm to 0
const oldLedgerSelf = `      const sRate = Number(selfBusinessRate || 5);
      const selfComm = Number(u.selfBusinessCommission || Math.round((selfBiz * sRate) / 100));
      const directComm = Number(u.directCommission || u.directTeamCommission || 0);
      const downlineComm = Number(u.downlineCommission || 0);
      const totalComm = Number(u.totalCommission || (selfComm + directComm + downlineComm) || u.totalEarned || 0);`;

const newLedgerSelf = `      const sRate = 0; // ZERO SELF COMMISSION ALWAYS
      const selfComm = 0;
      const directComm = Number(u.directCommission || u.directTeamCommission || 0);
      const downlineComm = Number(u.downlineCommission || 0);
      const totalComm = Number(u.totalCommission || (directComm + downlineComm) || u.totalEarned || 0);`;

if (content.includes(oldLedgerSelf)) {
  content = content.replace(oldLedgerSelf, newLedgerSelf);
  console.log('4. Updated membersLedger selfComm to 0');
}

// 4. Update ledger totals selfComm to 0
const oldLedgerTotals = `      const sRate = Number(selfBusinessRate || 5);
      const selfComm = Number(u.selfBusinessCommission || Math.round((selfBiz * sRate) / 100));`;

const newLedgerTotals = `      const sRate = 0;
      const selfComm = 0;`;

if (content.includes(oldLedgerTotals)) {
  content = content.replace(oldLedgerTotals, newLedgerTotals);
  console.log('5. Updated ledger totals selfComm to 0');
}

// 5. In simulator
content = content.replace(
  'const simSelfRate = Number(selfBusinessRate || 5);',
  'const simSelfRate = 0; // ZERO SELF COMMISSION'
);

// 6. On Admin load, auto-migrate all users with package > 0 to active and recalculate
const oldAdminLoad = `  // 1. Subscribe to Firebase RTDB Realtime updates
  useEffect(() => {`;

const newAdminLoad = `  // Auto-migrate all members with active package to 'active' status and recalculate
  useEffect(() => {
    autoMigrateAndRecalculateUsers().catch(err => console.warn('Auto-migration note:', err));
  }, []);

  // 1. Subscribe to Firebase RTDB Realtime updates
  useEffect(() => {`;

if (content.includes(oldAdminLoad) && !content.includes('autoMigrateAndRecalculateUsers().catch')) {
  content = content.replace(oldAdminLoad, newAdminLoad);
  console.log('6. Added autoMigrateAndRecalculateUsers on AdminPanel load');
}

// 7. Add GenerationTreeChart view button in Tab 1 toolbar
const oldToolbarViewBtn = `{/* Universal Member Report Lookup Toggle */}`;
const newToolbarViewBtn = `{/* Visual Generation Tree Chart Toggle */}
                <button
                  type="button"
                  onClick={() => setShowTreeChartInAdmin(!showTreeChartInAdmin)}
                  className={\`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer \${
                    showTreeChartInAdmin
                      ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                  }\`}
                  title="Open Visual Generation Network Tree Chart"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showTreeChartInAdmin ? 'Close Tree Chart' : 'Generation Tree Chart'}</span>
                </button>

                {/* Universal Member Report Lookup Toggle */}`;

if (content.includes(oldToolbarViewBtn) && !content.includes('setShowTreeChartInAdmin')) {
  // Add state showTreeChartInAdmin
  content = content.replace(
    'const [showMemberLookupInAdmin, setShowMemberLookupInAdmin] = useState(false);',
    'const [showMemberLookupInAdmin, setShowMemberLookupInAdmin] = useState(false);\n  const [showTreeChartInAdmin, setShowTreeChartInAdmin] = useState(false);'
  );
  content = content.replace(oldToolbarViewBtn, newToolbarViewBtn);
  console.log('7. Added GenerationTreeChart toggle button in Tab 1 toolbar');
}

// 8. Render GenerationTreeChart in Tab 1 when showTreeChartInAdmin is true
const oldLookupRender = `{showMemberLookupInAdmin && (
              <div className="p-6 rounded-3xl bg-pink-50/50 border-2 border-pink-200 shadow-sm">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Universal Member Business & Team Report Lookup" />
              </div>
            )}`;

const newLookupRender = `{showMemberLookupInAdmin && (
              <div className="p-6 rounded-3xl bg-pink-50/50 border-2 border-pink-200 shadow-sm">
                <MemberReportLookup isAdminMode={true} embeddedTitle="Universal Member Business & Team Report Lookup" />
              </div>
            )}

            {showTreeChartInAdmin && (
              <div className="p-6 rounded-3xl bg-white border-2 border-purple-200 shadow-sm">
                <GenerationTreeChart title="Admin 12-Level Generation Network Tree Chart" />
              </div>
            )}`;

if (content.includes(oldLookupRender)) {
  content = content.replace(oldLookupRender, newLookupRender);
  console.log('8. Rendered GenerationTreeChart in Tab 1');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated AdminPanel.jsx!');
