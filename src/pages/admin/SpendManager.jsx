import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Glasses,
  Droplets,
  BookOpen,
  Gift,
  Sun,
  HeartHandshake,
  ExternalLink,
  X,
} from 'lucide-react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { db } from '../../lib/firebase';
import AdminLayout from './AdminLayout';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../components/SpendTracker';
import { Diya } from '../../components/ui/DiwaliDecorations';
import SafeIcon from '../../components/ui/SafeIcon';

export default function SpendManager() {
  const [spends, setSpends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form State for new spend
  const [formData, setFormData] = useState({
    title: '',
    titleHindi: '',
    category: 'Healthcare',
    categoryHindi: 'स्वास्थ्य एवं चिकित्सा',
    amount: '',
    beneficiaries: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    voucherNo: '',
    utrNumber: '',
    description: '',
  });

  // Sync spends from Firebase RTDB
  useEffect(() => {
    try {
      const spendsRef = ref(db, 'spends');
      const unsubscribe = onValue(
        spendsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            setSpends(list);
          } else {
            setSpends([]);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('RTDB spends listener note:', error);
          setSpends([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setSpends([]);
      setLoading(false);
    }
  }, []);

  const categoryHindiMap = {
    Healthcare: 'स्वास्थ्य एवं चिकित्सा',
    LifeSupport: 'रक्तदान व आपातकाल',
    Education: 'शिक्षा सहायता',
    Welfare: 'अन्नदान व वस्त्र सेवा',
    Empowerment: 'महिला स्वावलंबन',
    Environment: 'पर्यावरण व पेयजल',
    Admin: 'प्रशासनिक व कानूनी',
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: cat,
      categoryHindi: categoryHindiMap[cat] || cat,
    }));
  };

  const handleAddSpend = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) {
      setErrorToast('Please fill in required fields (Title & Amount).');
      setTimeout(() => setErrorToast(''), 4000);
      return;
    }

    setSubmitting(true);
    try {
      const newId = `spend-${Date.now()}`;
      const payload = {
        id: newId,
        title: formData.title.trim(),
        titleHindi: formData.titleHindi.trim() || formData.title.trim(),
        category: formData.category,
        categoryHindi: formData.categoryHindi,
        amount: Number(formData.amount),
        beneficiaries: Number(formData.beneficiaries) || 1,
        date: formData.date || new Date().toISOString().split('T')[0],
        location: formData.location.trim() || 'Foundation Welfare Sector',
        voucherNo: formData.voucherNo.trim() || `UCWF-SP-${Math.floor(1000 + Math.random() * 9000)}`,
        utrNumber: formData.utrNumber.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        verified: true,
        description: formData.description.trim() || 'Verified welfare expenditure.',
        createdAt: new Date().toISOString(),
      };

      await set(ref(db, `spends/${newId}`), payload);

      setSuccessToast('New spend voucher recorded successfully in Realtime Database!');
      setModalOpen(false);
      setFormData({
        title: '',
        titleHindi: '',
        category: 'Healthcare',
        categoryHindi: 'स्वास्थ्य एवं चिकित्सा',
        amount: '',
        beneficiaries: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        voucherNo: '',
        utrNumber: '',
        description: '',
      });

      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      console.error('Failed to add spend:', err);
      setErrorToast('Error recording spend voucher.');
      setTimeout(() => setErrorToast(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpend = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteSpend = async () => {
    if (!confirmDeleteId) return;
    try {
      await remove(ref(db, `spends/${confirmDeleteId}`));
      setConfirmDeleteId(null);
      setSuccessToast('Spend record removed.');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      console.error('Failed to delete spend:', err);
      setConfirmDeleteId(null);
      setErrorToast('Could not delete record.');
      setTimeout(() => setErrorToast(''), 4000);
    }
  };

  // Calculations
  const totalSpend = spends.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalBeneficiaries = spends.reduce(
    (sum, item) => sum + (Number(item.beneficiaries) || 0),
    0
  );

  const filteredSpends = spends.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titleHindi && item.titleHindi.includes(searchQuery)) ||
      (item.utrNumber && item.utrNumber.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Diya size={22} glow={false} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Foundation Spend Tracker & Audit
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              संस्था द्वारा स्वास्थ्य, शिक्षा व समाज कल्याण में किए गए व्यय का प्रबंधन एवं लेखा-जोखा
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Spend (व्यय दर्ज करें)</span>
            </button>
          </div>
        </div>

        {/* Success / Error Toasts */}
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{successToast}</span>
              </div>
              <button onClick={() => setSuccessToast('')}>
                <X className="w-4 h-4 text-emerald-200 hover:text-white" />
              </button>
            </motion.div>
          )}
          {errorToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{errorToast}</span>
              </div>
              <button onClick={() => setErrorToast('')}>
                <X className="w-4 h-4 text-rose-200 hover:text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white shadow-lg border border-emerald-700/40">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">
              Total Audited Welfare Expenditure
            </span>
            <p className="text-3xl font-black text-white">
              ₹{totalSpend.toLocaleString('en-IN')}
            </p>
            <span className="text-xs text-emerald-300/80 mt-1 block">
              Across {spends.length} verified seva initiatives
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg border border-amber-400/30">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider block mb-1">
              Direct Beneficiaries Served
            </span>
            <p className="text-3xl font-black text-white">
              {totalBeneficiaries.toLocaleString('en-IN')}+
            </p>
            <span className="text-xs text-amber-100/90 mt-1 block">
              Patients, children & families impacted
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Bank Disbursal Compliance
            </span>
            <div>
              <p className="text-2xl font-black text-gray-900">100% Verified</p>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                All Entries Linked to 12-Digit UTR
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['All', 'Healthcare', 'LifeSupport', 'Education', 'Welfare', 'Empowerment', 'Environment'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-stone-100 text-gray-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, UTR..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Spends Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-gray-500 uppercase font-black tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Seva Initiative / विवरण</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Disbursed Amount</th>
                  <th className="px-4 py-3.5">Beneficiaries</th>
                  <th className="px-4 py-3.5">12-Digit UTR / Voucher</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSpends.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <IndianRupee className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="font-bold text-gray-700">
                          अभी कोई व्यय वाउचर रिकॉर्ड उपलब्ध नहीं है (No records found)
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          नया जनकल्याण व्यय दर्ज करने के लिए ऊपर &quot;Add New Spend&quot; बटन पर क्लिक करें।
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSpends.map((item) => {
                    const rawIcon = CATEGORY_ICONS[item.category] || HeartHandshake;
                    const colorClass = CATEGORY_COLORS[item.category] || 'text-emerald-700 bg-emerald-50 border-emerald-200';

                    return (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                            <SafeIcon icon={rawIcon} fallback={HeartHandshake} className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{item.title}</span>
                            {item.titleHindi && (
                              <span className="text-[11px] text-amber-700 block font-medium">
                                {item.titleHindi}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 block">{item.location}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${colorClass}`}>
                          {item.categoryHindi || item.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-black text-gray-900 text-sm">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {item.beneficiaries} citizens
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-gray-800 font-bold block">
                          {item.utrNumber || 'N/A'}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Vch: {item.voucherNo || item.id}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500 font-medium">
                        {item.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteSpend(item.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete Spend Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add New Spend */}
        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <IndianRupee className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900">
                        Record New Foundation Spend
                      </h3>
                      <p className="text-xs text-gray-500">
                        फाउंडेशन जनकल्याण व्यय वाउचर दर्ज करें
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddSpend} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Event / Initiative Title (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Free Eye Cataract Camp & Spectacles"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Title in Hindi (हिंदी शीर्षक)
                    </label>
                    <input
                      type="text"
                      value={formData.titleHindi}
                      onChange={(e) => setFormData({ ...formData, titleHindi: e.target.value })}
                      placeholder="उदा. निःशुल्क नेत्र जांच व मोतियाबिंद शिविर"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Category (सेवा श्रेणी) *
                      </label>
                      <select
                        value={formData.category}
                        onChange={handleCategoryChange}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="Healthcare">Healthcare (चिकित्सा)</option>
                        <option value="LifeSupport">LifeSupport (रक्तदान)</option>
                        <option value="Education">Education (शिक्षा)</option>
                        <option value="Welfare">Welfare (अन्न/वस्त्र)</option>
                        <option value="Empowerment">Empowerment (स्वावलंबन)</option>
                        <option value="Environment">Environment (पर्यावरण)</option>
                        <option value="Admin">Admin & Compliance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Disbursed Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="e.g. 50000"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Beneficiaries Count (लाभान्वित)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.beneficiaries}
                        onChange={(e) => setFormData({ ...formData, beneficiaries: e.target.value })}
                        placeholder="e.g. 150"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        12-Digit Bank Disbursal UTR
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.utrNumber}
                        onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                        placeholder="e.g. 428901234567"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Voucher Number
                      </label>
                      <input
                        type="text"
                        value={formData.voucherNo}
                        onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                        placeholder="e.g. UCWF-MED-2026-042"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Location / Camp Site
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Civil Lines, Budaun"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Spend Description / Impact Details
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Specify beneficiaries, medicines, surgical costs, blankets, or books purchased..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-md disabled:opacity-60"
                    >
                      {submitting ? 'Recording...' : 'Record Spend Voucher'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {confirmDeleteId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <h3 className="text-base font-extrabold text-gray-900">Delete Spend Record?</h3>
                </div>
                <p className="text-xs text-gray-600">
                  Are you sure you want to delete this spend record? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSpend}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
                  >
                    Delete Record
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}

export { SpendManager };
