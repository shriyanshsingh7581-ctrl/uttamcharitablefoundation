import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  Trash2, 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  Building2, 
  Layers, 
  Wallet,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, set, remove, push, get } from 'firebase/database';
import { formatINR, safeText } from '../lib/constants';
import { parseAmount } from '../utils/mlmUtils';
import { getISTDateString } from '../utils/closingEngine';
import TableSlideScroller from './ui/TableSlideScroller';

export default function PaidExpenseSection({ isAdmin = false }) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const ledgerPrintRef = useRef(null);

  const { currentUser, userProfile, isAdmin: authIsAdmin } = useAuth();
  const effectiveIsAdmin = isAdmin || authIsAdmin || userProfile?.is_admin || userProfile?.role === 'admin';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCollection, setTotalCollection] = useState(0);
  const [totalPaidPayout, setTotalPaidPayout] = useState(0);

  // Form State
  const [date, setDate] = useState(() => getISTDateString());
  const [title, setTitle] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI / Netbanking');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Listen to /expenses in RTDB
  useEffect(() => {
    const expensesRef = ref(rtdb, 'expenses');
    const unsub = onValue(expensesRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          ...data,
          amount: Number(data.amount || 0)
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setExpenses(list);
      } else {
        setExpenses([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Listen live to Total Collections & Total Paid Payout
  useEffect(() => {
    let latestUsers = {};
    let latestLogs = {};

    const recompute = () => {
      let colSum = 0;
      let paidPayoutSum = 0;

      Object.values(latestUsers || {}).forEach((u) => {
        if (!u) return;
        colSum += parseAmount(u);
        paidPayoutSum += Number(u.commissionPaid || u.paidPayout || 0);
      });

      let logSum = 0;
      Object.values(latestLogs || {}).forEach((l) => {
        if (!l) return;
        logSum += Number(l.amount || 0);
      });
      if (logSum > paidPayoutSum) paidPayoutSum = logSum;

      setTotalCollection(colSum);
      setTotalPaidPayout(paidPayoutSum);
    };

    const unsubUsers = onValue(ref(rtdb, 'users'), (snap) => {
      latestUsers = snap.exists() ? snap.val() : {};
      recompute();
    });

    const unsubLogs = onValue(ref(rtdb, 'payout_logs'), (snap) => {
      latestLogs = snap.exists() ? snap.val() : {};
      recompute();
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const netBalance = Math.max(0, totalCollection - totalPaidPayout - totalExpense);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSuccessMsg('');

    const numAmount = parseAmount(amount);
    if (!title.trim() || !paidTo.trim() || numAmount <= 0) {
      setSuccessMsg('⚠️ कृपया खर्च का विवरण, भुगतान प्राप्तकर्ता और वैध राशि दर्ज करें।');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    setIsSubmitting(true);
    try {
      const expId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const payload = {
        id: expId,
        date: date || getISTDateString(),
        title: title.trim(),
        paidTo: paidTo.trim(),
        amount: numAmount,
        paymentMode: paymentMode || 'UPI',
        remarks: remarks.trim(),
        createdBy: userProfile?.name || currentUser?.displayName || 'Admin',
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };

      await set(ref(rtdb, `expenses/${expId}`), payload);

      setTitle('');
      setPaidTo('');
      setAmount('');
      setRemarks('');
      setSuccessMsg('खर्च का विवरण सफलतापूर्वक दर्ज कर लिया गया है!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving expense:', err);
      setSuccessMsg('⚠️ खर्च सेव करने में त्रुटि हुई: ' + err.message);
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await remove(ref(rtdb, `expenses/${id}`));
      setSuccessMsg('खर्च प्रविष्टि सफलतापूर्वक हटाई गई।');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting expense:', err);
      setSuccessMsg('⚠️ हटाने में त्रुटि: ' + err.message);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!expenses.length) return;
    const rows = [
      ['S.No.', 'Date', 'Expense Title / Purpose', 'Paid To', 'Payment Mode', 'Remarks', 'Amount (INR)'],
      ...expenses.map((e, idx) => [
        idx + 1,
        e.date || '—',
        e.title || '—',
        e.paidTo || '—',
        e.paymentMode || '—',
        e.remarks || '—',
        e.amount
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Foundation_Expenses_Ledger_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(e => 
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
      (e.paymentMode && e.paymentMode.toLowerCase().includes(q)) ||
      (e.date && e.date.includes(q))
    );
  }, [expenses, searchQuery]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-sm max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Paid Expense / ट्रस्ट एवं कार्यालय खर्च लेजर</span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-xs font-bold font-mono">
                Trust & Office Expenses
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              फाउंडेशन एवं कार्यालय के समस्त आधिकारिक व्यय, भुगतान लेजर, कुल संग्रह, कुल भुगतान एवं शुद्ध बैंक बैलेंस।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Export</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>प्रिंट लेजर</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Transparency Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pod 1: Total Collection */}
        <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 text-slate-900 shadow-xs">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">1. Total Collection (कुल संग्रह)</span>
          <p className="text-2xl font-black font-mono text-blue-950 mt-1">{formatINR(totalCollection)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">सभी सदस्यों की कुल डोनेशन संकल्प राशि</p>
        </div>

        {/* Pod 2: Total Paid Payout */}
        <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-200 text-slate-900 shadow-xs">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">2. Total Paid Payout (भुगतान मानदेय)</span>
          <p className="text-2xl font-black font-mono text-teal-950 mt-1">{formatINR(totalPaidPayout)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">सदस्यों को वितरित 12-लेवल कमीशन</p>
        </div>

        {/* Pod 3: Total Paid Expense */}
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-slate-900 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">3. Total Paid Expense (कुल खर्च)</span>
          <p className="text-2xl font-black font-mono text-rose-700 mt-1">{formatINR(totalExpense)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">ट्रस्ट व कार्यालय संचालन हेतु व्यय</p>
        </div>

        {/* Pod 4: Net Balance */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-500 text-emerald-950 shadow-xs">
          <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">4. Net Balance (शुद्ध बचत)</span>
          <p className="text-2xl font-black font-mono text-emerald-950 mt-1">{formatINR(netBalance)}</p>
          <p className="text-[10px] text-emerald-800 font-bold mt-0.5">संग्रह - मानदेय - खर्च (Net Fund)</p>
        </div>
      </div>

      {/* Admin Add Expense Form */}
      {effectiveIsAdmin && (
        <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              <span>+ नया खर्च दर्ज करें (Record New Trust/Office Expense)</span>
            </h3>
            {successMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                {successMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">दिनांक (Date) *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold outline-none focus:border-rose-500"
              />
            </div>

            {/* Expense Title / Purpose */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">खर्च विवरण / उद्देश्य (Title) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="उदा. ऑफिस किराया, स्टेशनरी, चाय..."
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold outline-none focus:border-rose-500"
              />
            </div>

            {/* Paid To */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">भुगतान प्राप्तकर्ता (Paid To) *</label>
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="दुकान/व्यक्ति/मकान मालिक का नाम"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold outline-none focus:border-rose-500"
              />
            </div>

            {/* Amount ₹ */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">राशि (Amount ₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ राशि दर्ज करें"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold outline-none focus:border-rose-500"
              />
            </div>

            {/* Payment Mode / Remarks */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">माध्यम / रिमार्क *</label>
              <input
                type="text"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                placeholder="UPI, Cash, Cheque..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 outline-none focus:border-rose-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-5 flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'सुरक्षित हो रहा है...' : 'खर्च दर्ज करें (Save Expense)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Search & Ledger Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="खर्च खोजें (विवरण, प्राप्तकर्ता, माध्यम)..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
          />
        </div>

        <span className="text-xs font-bold text-slate-600">
          कुल प्रविष्टियां: <strong className="font-mono text-slate-900">{filteredExpenses.length}</strong> • कुल खर्च: <strong className="font-mono text-rose-700">{formatINR(totalExpense)}</strong>
        </span>
      </div>

      {/* Expenses Ledger Table */}
      <div ref={ledgerPrintRef}>
        <TableSlideScroller title="Trust & Office Paid Expense Master Ledger">
          <table className="w-full text-xs text-left border-collapse table-auto">
            <thead className="bg-rose-50 text-slate-800 font-bold border-b border-rose-200">
              <tr>
                <th className="py-2.5 px-3 text-center border-r border-rose-100">S.No.</th>
                <th className="py-2.5 px-3 border-r border-rose-100 whitespace-nowrap">दिनांक (Date)</th>
                <th className="py-2.5 px-3 border-r border-rose-100 whitespace-nowrap">खर्च शीर्षक / प्रयोजन (Title / Purpose)</th>
                <th className="py-2.5 px-3 border-r border-rose-100 whitespace-nowrap">भुगतान प्राप्तकर्ता (Paid To)</th>
                <th className="py-2.5 px-3 border-r border-rose-100 whitespace-nowrap">भुगतान माध्यम / रिमार्क (Payment Mode)</th>
                <th className="py-2.5 px-3 text-right border-r border-rose-100 whitespace-nowrap">राशि (Amount ₹)</th>
                {effectiveIsAdmin && <th className="py-2.5 px-3 text-center whitespace-nowrap">कार्रवाई (Action)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={effectiveIsAdmin ? 7 : 6} className="py-12 text-center text-xs text-slate-400 font-medium">
                    {searchQuery.trim() ? 'खोज के अनुरूप कोई खर्च नहीं मिला।' : 'अभी तक कोई खर्च दर्ज नहीं हुआ है।'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-slate-500 font-medium border-r border-rose-50">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-rose-50 font-mono text-slate-800 whitespace-nowrap">
                      {e.date}
                    </td>
                    <td className="py-2 px-3 border-r border-rose-50 font-bold text-slate-900">
                      {e.title}
                    </td>
                    <td className="py-2 px-3 border-r border-rose-50 text-slate-800 font-medium whitespace-nowrap">
                      {e.paidTo}
                    </td>
                    <td className="py-2 px-3 border-r border-rose-50 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono">
                        {e.paymentMode || 'UPI'}
                      </span>
                      {e.remarks && <span className="ml-2 text-[10px] text-slate-400">({e.remarks})</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-700 text-sm border-r border-rose-50 whitespace-nowrap">
                      {formatINR(e.amount)}
                    </td>
                    {effectiveIsAdmin && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="हटाएं (Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-rose-950 text-white font-mono text-xs font-black border-t-2 border-rose-900">
              <tr>
                <td className="py-2.5 px-3 text-center" colSpan={5}>
                  TOTAL EXPENSES (कुल खर्च)
                </td>
                <td className="py-2.5 px-3 text-right text-rose-300 text-sm">
                  {formatINR(totalExpense)}
                </td>
                {effectiveIsAdmin && <td></td>}
              </tr>
            </tfoot>
          </table>
        </TableSlideScroller>
      </div>
    </div>
  );
}
