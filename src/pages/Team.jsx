import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  Award, 
  IndianRupee,
  ShieldCheck,
  UserCheck,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { MLM_COMMISSION_RATES, formatINR, safeText } from '../lib/constants';
import GenerationTreeChart from '../components/GenerationTreeChart';
import { 
  computeUnlimitedGenerationTree, 
  getMemberFullName 
} from '../utils/mlmUtils';

export default function Team() {
  const { userProfile } = useAuth();
  const currentMemberId = (userProfile?.memberId || '').trim();
  const currentPhone = (userProfile?.phone || '').replace(/\D/g, '').slice(-10);
  const currentUid = userProfile?.uid;

  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'

  // Fetch all users to construct 12-level tree
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllUsers(snapshot.val());
      } else {
        setAllUsers({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute 12 Levels with UNLIMITED members & 0% self-commission
  const treeMetrics = useMemo(() => {
    if (!userProfile || Object.keys(allUsers).length === 0) {
      return {
        levelBreakdown: Array.from({ length: 12 }, (_, i) => ({
          level: i + 1,
          rate: MLM_COMMISSION_RATES[i] || 0,
          members: []
        })),
        totalTeamMembers: 0,
        totalTeamBusiness: 0,
        totalCommission: 0
      };
    }
    return computeUnlimitedGenerationTree(userProfile, allUsers);
  }, [userProfile, allUsers]);

  const levelsData = treeMetrics.levelBreakdown;
  const totalTeamSize = treeMetrics.totalTeamMembers;

  // Current active level members filtered by search
  const currentLevelInfo = levelsData[selectedLevel - 1] || levelsData[0];
  const filteredMembers = useMemo(() => {
    if (!currentLevelInfo?.members) return [];
    if (!searchQuery.trim()) return currentLevelInfo.members;

    const q = searchQuery.toLowerCase().trim();
    return currentLevelInfo.members.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.displayName && m.displayName.toLowerCase().includes(q)) ||
      (m.fullNameDisplay && m.fullNameDisplay.toLowerCase().includes(q)) ||
      (m.memberId && m.memberId.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.sponsorId && m.sponsorId.toLowerCase().includes(q)) ||
      (m.plainPassword && m.plainPassword.toLowerCase().includes(q))
    );
  }, [currentLevelInfo, searchQuery]);

  return (
    <div className="min-h-screen bg-stone-50 py-6 sm:py-8 px-3 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 w-full max-w-full">
        
        {/* Page Title & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>12-स्तरीय सहयोगी नेटवर्क (12-Level Genealogy)</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              सहयोगी टीम व संगठन विवरण
            </h1>
            <p className="text-xs text-slate-500">
              आपकी स्पॉन्सर आईडी: <strong className="font-mono text-emerald-700">{safeText(currentMemberId)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                🌳 ट्री चार्ट (Chart)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                📋 12-लेवल तालिका (Table)
              </button>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <p className="text-[11px] text-emerald-700 font-semibold">कुल नेटवर्क सदस्य</p>
              <h3 className="text-xl font-black text-emerald-900">{safeText(totalTeamSize)}</h3>
            </div>
          </div>
        </div>

        {/* View Mode 1: Visual Generation Tree Chart */}
        {viewMode === 'chart' && (
          <GenerationTreeChart 
            initialRootId={currentMemberId || currentPhone} 
            customAllUsers={allUsers}
            title="आपकी 12-स्तरीय जेनरेशन ट्री (Your Generation Network Tree)"
          />
        )}

        {/* View Mode 2: 12 Levels Grid & Table Selector */}
        {viewMode === 'table' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {levelsData.map((lvl) => {
            const isSelected = selectedLevel === lvl.level;
            return (
              <button
                key={lvl.level}
                type="button"
                onClick={() => setSelectedLevel(lvl.level)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                    Level {lvl.level}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {lvl.rate}%
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-lg font-black leading-none">
                    {safeText(lvl.members.length)}
                  </p>
                  <p className={`text-[10px] mt-1 ${isSelected ? 'text-emerald-200/80' : 'text-slate-400'}`}>
                    सदस्य जुड़े
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Level Detail & Search Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Level {selectedLevel} के सदस्य ({currentLevelInfo?.rate}% मानदेय दर)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                इस स्तर के सदस्यों के प्रत्येक पैकेज एक्टिवेशन पर आपको {currentLevelInfo?.rate}% सहयोग मानदेय प्राप्त होता है।
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="नाम या ID से खोजें..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              टीम डेटा लोड हो रहा है...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                Level {selectedLevel} पर कोई सदस्य नहीं मिला।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border-2 border-gray-300 shadow-sm max-h-[500px] overflow-y-auto bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#FFF5F7] text-black font-bold sticky top-0 z-10 border-b-2 border-gray-300">
                  <tr>
                    <th className="py-3 px-3 border-r border-gray-300 text-center w-12 text-black">क्र.सं. (S.No.)</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-center text-black">Level</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Member ID</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Full Member Name</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Password</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Mobile Number</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Joined Under (Sponsor)</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-black">Joining Date</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-right text-black">Self Business (₹)</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-center text-black">Direct Team</th>
                    <th className="py-3 px-3 border-r border-gray-300 text-right text-black">Downline Biz (₹)</th>
                    <th className="py-3 px-3 text-right text-black">Commission (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMembers.map((member, idx) => (
                    <tr key={member.uid || member.memberId || idx} className={`hover:bg-[#FFF5F7]/60 transition-colors ${idx % 2 === 1 ? 'bg-[#FFF5F7]/30' : 'bg-white'}`}>
                      <td className="py-3 px-3 border-r border-gray-300 text-center font-bold text-black font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-900 font-bold text-[11px]">
                          Level {selectedLevel} ({currentLevelInfo?.rate}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono font-bold text-black text-sm">{safeText(member.memberId || 'N/A')}</td>
                      <td className="py-3 px-3 border-r border-gray-300 font-semibold text-black text-sm">
                        {safeText(member.fullNameDisplay || getMemberFullName(member))}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono font-bold text-black text-xs">
                        {safeText(member.plainPassword || member.password || 'UCWF@1234')}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono font-bold text-black">
                        <a href={`tel:${member.phone}`} className="hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{safeText(member.phone || '-')}</span>
                        </a>
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 text-black">
                        <div className="font-bold text-xs">{safeText(member.sponsorNameResolved || 'Sponsor')}</div>
                        <div className="font-mono text-[11px] text-gray-700">{safeText(member.sponsorIdResolved || member.sponsorId || '-')}</div>
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono text-black text-xs whitespace-nowrap">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('hi-IN') : (member.applicationDate || '-')}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-mono font-bold text-black text-sm">
                        {formatINR(Number(member.packageAmount || member.packageTier || member.selfBusiness || 500))}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 text-center font-mono font-bold text-black">
                        {member.directTeamCount || 0} सदस्य
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-mono font-bold text-black text-sm">
                        {formatINR(member.directBusinessCalculated || member.packageAmount || 500)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                        +{formatINR(member.commissionGenerated || Math.round((Number(member.packageAmount || 500) * (currentLevelInfo?.rate || 0)) / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

      </div>
    </div>
  );
}
