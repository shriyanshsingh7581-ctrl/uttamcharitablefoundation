import React, { useState, useMemo } from 'react';
import { Search, Users, Building2, CheckCircle2, ArrowRight, UserCheck } from 'lucide-react';
import {
  normId,
  lastDigits,
  findParentMember,
  getMemberFullName,
  getUplineChainFromMap,
  isDirectChild,
} from '../utils/mlmUtils';

export default function SponsorSelector({
  value = '',
  onChange,
  usersMap = {},
  label = 'स्पॉन्सर चुनें / Sponsor ID (टीम के किस सदस्य के नीचे जोड़ना है) *',
  required = true,
  allowHeadOffice = true,
  hint = 'सदस्य का नाम, Member ID (जैसे UCWF-2026-XXXX) या 10-अंकीय मोबाइल नंबर लिखें या नीचे सूची से चुनें।',
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const usersList = useMemo(() => {
    return Object.entries(usersMap || {})
      .filter(([, u]) => Boolean(u && (u.name || u.memberId)))
      .map(([uid, u]) => ({ uid, ...u }))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }, [usersMap]);

  const directCountMap = useMemo(() => {
    const counts = {};
    usersList.forEach((parent) => {
      const key = parent.uid || parent.memberId;
      counts[key] = usersList.filter(
        (child) => child && child.uid !== parent.uid && isDirectChild(child, parent)
      ).length;
    });
    return counts;
  }, [usersList]);

  const matchedParent = useMemo(() => {
    if (!value || !String(value).trim()) return null;
    return findParentMember({ uid: '__virtual_preview__', sponsorId: String(value).trim() }, usersMap);
  }, [value, usersMap]);

  const uplinePreview = useMemo(() => {
    if (!value || !String(value).trim()) return [];
    return getUplineChainFromMap(
      { uid: '__virtual_preview__', memberId: '__PREVIEW__', sponsorId: String(value).trim() },
      usersMap
    ).slice(0, 3);
  }, [value, usersMap]);

  const filteredCandidates = useMemo(() => {
    const q = String(value || '').trim().toUpperCase();
    const qDigits = lastDigits(q);
    if (!q) return usersList.slice(0, 12);

    const exactOrMatches = usersList.filter((u) => {
      const mId = normId(u.memberId);
      const uName = String(u.name || u.displayName || '').toUpperCase();
      const uPhone = lastDigits(u.phone);
      return (
        mId.includes(q) ||
        uName.includes(q) ||
        (qDigits.length >= 2 && (uPhone.includes(qDigits) || mId.includes(qDigits)))
      );
    });
    return exactOrMatches.slice(0, 12);
  }, [value, usersList]);

  const isExactMatched = useMemo(() => {
    if (!matchedParent || !value) return false;
    const valNorm = normId(value);
    const valDigits = lastDigits(value).slice(-10);
    const pMem = normId(matchedParent.memberId);
    const pPhone = lastDigits(matchedParent.phone).slice(-10);
    return (
      valNorm === pMem ||
      (valDigits.length === 10 && valDigits === pPhone) ||
      (valNorm === 'DIRECT' && pMem === 'UCWF-0001')
    );
  }, [matchedParent, value]);

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-extrabold text-slate-800">
          {label}
        </label>
        {allowHeadOffice && (
          <button
            type="button"
            onClick={() => {
              onChange('UCWF-0001');
              setSearchOpen(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-black transition cursor-pointer"
          >
            <Building2 className="w-3 h-3" />
            <span>हेड ऑफिस (UCWF-0001) चुनें</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setSearchOpen(true);
          }}
          placeholder="स्पॉन्सर का नाम, UCWF-2026-XXXX या मोबाइल नंबर खोजें..."
          required={required}
          className="w-full pl-10 pr-28 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={() => setSearchOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
        >
          <Users className="w-3 h-3 text-emerald-700" />
          <span>{searchOpen ? 'बंद करें' : `टीम सूची (${usersList.length})`}</span>
        </button>
      </div>

      {/* Live Sponsor Verification & Upline Chain (L1 -> L2 -> L3) */}
      {matchedParent && (
        <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>चयनित स्पॉन्सर:</span>
              <strong>{getMemberFullName(matchedParent)}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 font-mono text-[11px] font-black text-emerald-800">
              {matchedParent.memberId || value}
            </span>
          </div>

          {uplinePreview.length > 0 && (
            <div className="pt-1.5 border-t border-emerald-200/70 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-bold text-emerald-800">कमीशन अपलाइन चेन:</span>
              {uplinePreview.map((node, idx) => (
                <React.Fragment key={node.uid || node.memberId || idx}>
                  {idx > 0 && <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />}
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800 font-bold">
                    L{node.level} ({node.rate}%): {node.name} ({node.memberId})
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Searchable Members Dropdown */}
      {searchOpen && !isExactMatched && (
        <div className="rounded-xl bg-white border border-emerald-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-emerald-50 text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center justify-between">
            <span>किसी भी सदस्य के नीचे जोड़ने के लिए क्लिक करें</span>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
          {filteredCandidates.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              कोई मिलता-जुलता सदस्य नहीं मिला — सीधे Member ID या मोबाइल नंबर लिख सकते हैं।
            </div>
          ) : (
            filteredCandidates.map((m) => {
              const dCount = directCountMap[m.uid || m.memberId] || 0;
              return (
                <button
                  key={m.uid || m.memberId}
                  type="button"
                  onClick={() => {
                    onChange(String(m.memberId || m.phone || m.uid).toUpperCase());
                    setSearchOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50 flex items-center justify-between gap-2 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{getMemberFullName(m)}</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      ID: <strong className="text-emerald-800">{m.memberId || 'N/A'}</strong> • Mob: {m.phone || '—'}
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 font-mono text-[10px] font-bold">
                    {dCount} Directs
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {searchOpen && isExactMatched && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            सूची छुपाएं
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}
