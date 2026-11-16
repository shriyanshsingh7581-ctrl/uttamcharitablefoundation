const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Import GenerationTreeChart
if (!content.includes('import GenerationTreeChart')) {
  content = content.replace(
    "import MemberReportLookup from '../components/MemberReportLookup';",
    "import MemberReportLookup from '../components/MemberReportLookup';\nimport GenerationTreeChart from '../components/GenerationTreeChart';"
  );
  console.log('1. Imported GenerationTreeChart in Dashboard.jsx');
}

// 2. Set selfBusinessCommission strictly to 0
const oldSelfCommCalc = `  const selfBusinessCommTx = targetTxList.filter(t => 
    t.type === 'self_business_commission' || t.commissionCategory === 'self'
  );
  const selfBusinessCommCalculated = selfBusinessCommTx.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const selfBusinessCommission = Number(
    targetUser?.selfBusinessCommission !== undefined
      ? targetUser.selfBusinessCommission
      : (selfBusinessCommCalculated || Math.round((selfBusiness * 5) / 100))
  );

  const directTeamCommission = Number(
    targetUser?.directTeamCommission !== undefined
      ? targetUser.directTeamCommission
      : (targetUser?.directCommission !== undefined ? targetUser.directCommission : directTotalEarned)
  );

  const downlineCommission = Number(
    targetUser?.downlineCommission !== undefined
      ? targetUser.downlineCommission
      : downlineTotalEarned
  );

  const totalCommission = Number(
    targetUser?.totalCommission !== undefined
      ? targetUser.totalCommission
      : (selfBusinessCommission + directTeamCommission + downlineCommission)
  );`;

const newSelfCommCalc = `  // STRICTLY ZERO COMMISSION ON OWN DONATION / FORM
  const selfBusinessCommission = 0;

  const directTeamCommission = Number(
    targetUser?.directTeamCommission !== undefined
      ? targetUser.directTeamCommission
      : (targetUser?.directCommission !== undefined ? targetUser.directCommission : directTotalEarned)
  );

  const downlineCommission = Number(
    targetUser?.downlineCommission !== undefined
      ? targetUser.downlineCommission
      : downlineTotalEarned
  );

  const totalCommission = Number(
    targetUser?.totalCommission !== undefined
      ? targetUser.totalCommission
      : (directTeamCommission + downlineCommission)
  );`;

if (content.includes(oldSelfCommCalc)) {
  content = content.replace(oldSelfCommCalc, newSelfCommCalc);
  console.log('2. Updated selfBusinessCommission to strictly 0');
}

// 3. Update Payout 3-Cards: Replace Card 2 (Self Business Commission) with Downline Commission
const oldPayoutCard2 = `              {/* Card 2: Self Business Commission */}
              <div className="glass-card-premium p-6 rounded-3xl border-l-4 border-l-amber-500 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-700 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isHindi ? '2. सेल्फ बिज़नेस कमीशन' : '2. Self Business Commission'}
                    </span>
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 font-mono">
                    {formatINR(selfBusinessCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isHindi 
                      ? \`स्वयं के सेल्फ बिज़नेस (\${formatINR(selfBusiness)}) पर प्राप्त प्रोत्साहन मानदेय\` 
                      : \`Incentive earned on own Self Business (\${formatINR(selfBusiness)})\`
                    }
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-bold text-amber-900">
                    {isHindi ? 'सेल्फ प्रोत्साहन दर' : 'Self Business Rate'}
                  </span>
                  <span className="text-amber-700 font-bold">5% Rate</span>
                </div>
              </div>

              {/* Card 3: Total Commission */}
              <div className="glass-card-premium p-6 rounded-3xl border-l-4 border-l-blue-600 shadow-xl relative overflow-hidden flex flex-col justify-between bg-blue-50/30">
                <div>
                  <div className="flex items-center justify-between text-blue-700 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isHindi ? '3. टोटल कमीशन (Total Commission)' : '3. Total Commission'}
                    </span>
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <IndianRupee className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                    {formatINR(totalCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Self ({formatINR(selfBusinessCommission)}) + Direct ({formatINR(directTeamCommission)}) + Downline ({formatINR(downlineCommission)})
                  </p>
                </div>`;

const newPayoutCard2 = `              {/* Card 2: Downline Team Commission (Levels 2-12) */}
              <div className="glass-card-premium p-6 rounded-3xl border-l-4 border-l-purple-500 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-purple-700 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isHindi ? '2. डाउनलाइन टीम कमीशन' : '2. Downline Team Commission'}
                    </span>
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-purple-700 mt-1 font-mono">
                    {formatINR(downlineCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isHindi 
                      ? \`लेवल 2 से 12 तक के नेटवर्क से प्राप्त कुल कमीशन\` 
                      : \`Combined commission from Levels 2 to 12 hierarchy\`
                    }
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-bold text-purple-900">
                    {isHindi ? 'लेवल 2-12 दरें' : 'Level 2-12 Rates'}
                  </span>
                  <span className="text-purple-700 font-bold">8% down to 1%</span>
                </div>
              </div>

              {/* Card 3: Total Commission */}
              <div className="glass-card-premium p-6 rounded-3xl border-l-4 border-l-blue-600 shadow-xl relative overflow-hidden flex flex-col justify-between bg-blue-50/30">
                <div>
                  <div className="flex items-center justify-between text-blue-700 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isHindi ? '3. टोटल कमीशन (Total Commission)' : '3. Total Commission'}
                    </span>
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <IndianRupee className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
                    {formatINR(totalCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct ({formatINR(directTeamCommission)}) + Downline ({formatINR(downlineCommission)})
                  </p>
                </div>`;

if (content.includes(oldPayoutCard2)) {
  content = content.replace(oldPayoutCard2, newPayoutCard2);
  console.log('3. Replaced Self Business Commission with Downline Team Commission in Payout 3-cards');
}

// 4. Remove Self Commission mini-pod in Overview
const oldMiniSelf = `                {/* 5. Self Business Commission */}
                <div className="p-3.5 rounded-2xl glass-pill space-y-1 bg-purple-500/5 border border-purple-500/20">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">
                    {isHindi ? '5. सेल्फ कमीशन' : '5. Self Commission'}
                  </span>
                  <span className="text-base font-black text-purple-800 font-mono block">
                    +{formatINR(selfBusinessCommission)}
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium">
                    {isHindi ? 'स्वयं ID मानदेय' : 'Self ID Incentive'}
                  </span>
                </div>`;

if (content.includes(oldMiniSelf)) {
  content = content.replace(oldMiniSelf, '');
  console.log('4. Removed mini Self Business Commission pod in Overview');
}

// 5. Add "5. जेनरेशन ट्री चार्ट" tab button in renderTeamAndBusinessContent
const oldSubTabs = `          <button
            type="button"
            onClick={() => setTeamModalTab('totalBiz')}
            className={\`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer \${
              teamModalTab === 'totalBiz'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }\`}
          >
            <PieChart className="w-4 h-4" />
            <span>4. टोटल टीम बिज़नेस</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-mono">
              {formatINR(teamBusiness)}
            </span>
          </button>
        </div>`;

const newSubTabs = `          <button
            type="button"
            onClick={() => setTeamModalTab('totalBiz')}
            className={\`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer \${
              teamModalTab === 'totalBiz'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }\`}
          >
            <PieChart className="w-4 h-4" />
            <span>4. टोटल टीम बिज़नेस</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-mono">
              {formatINR(teamBusiness)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTeamModalTab('chart')}
            className={\`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer \${
              teamModalTab === 'chart'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/25 font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }\`}
          >
            <Layers className="w-4 h-4" />
            <span>5. जेनरेशन ट्री चार्ट (Tree Chart)</span>
          </button>
        </div>`;

if (content.includes(oldSubTabs)) {
  content = content.replace(oldSubTabs, newSubTabs);
  console.log('5. Added Generation Tree Chart sub-tab in team content');
}

// 6. Render GenerationTreeChart when teamModalTab === 'chart'
const oldChartRender = `{/* Search Bar for Member Tables */}
        {(teamModalTab === 'direct' || teamModalTab === 'downline' || teamModalTab === 'directBiz') && (`;

const newChartRender = `{/* TAB 5: VISUAL GENERATION NETWORK TREE CHART */}
        {teamModalTab === 'chart' && (
          <div className="space-y-4">
            <GenerationTreeChart initialRootId={targetUser?.memberId || targetUser?.uid} />
          </div>
        )}

        {/* Search Bar for Member Tables */}
        {(teamModalTab === 'direct' || teamModalTab === 'downline' || teamModalTab === 'directBiz') && (`;

if (content.includes(oldChartRender)) {
  content = content.replace(oldChartRender, newChartRender);
  console.log('6. Rendered GenerationTreeChart in team content');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated Dashboard.jsx!');
