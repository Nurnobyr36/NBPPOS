import React, { useState } from 'react';
import { Truck, PlusCircle, Search, DollarSign, Phone, Building } from 'lucide-react';
import { Supplier, Language } from '../types';
import { formatMoney, translations } from '../utils/formatters';
import { addSupplier, paySupplierDue } from '../services/storage';

interface SuppliersViewProps {
  suppliers?: Supplier[];
  currencySymbol?: string;
  lang: Language;
  onRefreshData?: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers = [],
  currencySymbol = '৳',
  lang,
  onRefreshData,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');

  // Add Supplier Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingDue, setOpeningDue] = useState<number>(0);

  // Pay Supplier Modal
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');

  const filtered = (suppliers || []).filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.company || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  });

  const totalDueAll = suppliers.reduce((sum, s) => sum + (s.currentDue || 0), 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSupplier({
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currentDue: openingDue,
      openingDue,
    });

    onRefreshData?.();
    setIsAddOpen(false);
    setName('');
    setCompany('');
    setPhone('');
    setAddress('');
    setOpeningDue(0);
  };

  const handleOpenPay = (s: Supplier) => {
    setPaySupplier(s);
    setPayAmount(s.currentDue || 0);
    setPayMethod('cash');
    setPayNote('');
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier) return;
    if (payAmount <= 0) {
      alert('সঠিক পরিমাণ উল্লেখ করুন');
      return;
    }

    paySupplierDue(paySupplier.id, payAmount, payMethod, payNote);
    onRefreshData?.();
    setPaySupplier(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.suppliers} হিসাব
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            মোট সরবরাহকারী দেনা: <span className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(totalDueAll, currencySymbol)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ নতুন সাপ্লায়ার</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="সাপ্লায়ার বা কোম্পানির নাম দিয়ে খুঁজুন..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 font-semibold">সাপ্লায়ারের নাম</th>
                <th className="py-3 px-3.5 font-semibold">প্রতিষ্ঠান / কোম্পানি</th>
                <th className="py-3 px-3.5 font-semibold">মোবাইল নম্বর</th>
                <th className="py-3 px-3.5 font-semibold">মোট ক্রয়</th>
                <th className="py-3 px-3.5 font-semibold">বর্তমান দেনা</th>
                <th className="py-3 px-3.5 font-semibold text-right">দেনা পরিশোধ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    কোনো সাপ্লায়ার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (filtered || []).map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                      {s.name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                      {s.company || '-'}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {s.phone || '-'}
                    </td>
                    <td className="py-3 px-3.5 font-semibold tabular-nums">
                      {formatMoney(s.totalPurchase, currencySymbol)}
                    </td>
                    <td className="py-3 px-3.5 tabular-nums">
                      {s.currentDue > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatMoney(s.currentDue, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">পরিশোধিত</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {s.currentDue > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenPay(s)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          পেমেন্ট দিন
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SUPPLIER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              নতুন সাপ্লায়ার যোগ করুন
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                সাপ্লায়ারের নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: আমিনুর রহমান"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                প্রতিষ্ঠান / কোম্পানি
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="যেমন: সিটি গ্রুপ, মেঘনা এগ্রো"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XX-XXXXXX"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ঠিকানা
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="অফিস বা গুদামের ঠিকানা"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পূর্বের প্রারম্ভিক দেনা ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={openingDue}
                onChange={(e) => setOpeningDue(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs"
              >
                সাপ্লায়ার সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAY SUPPLIER MODAL */}
      {paySupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              {paySupplier.name} — দেনা পরিশোধ
            </h3>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">বর্তমান বকেয়া দেনা:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatMoney(paySupplier.currentDue, currencySymbol)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিশোধের পরিমাণ ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={paySupplier.currentDue}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                className="w-full text-base font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পেমেন্ট মেথড
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
              >
                <option value="cash">নগদ (Cash)</option>
                <option value="bank">ব্যাংক (Bank)</option>
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="card">কার্ড (Card)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নোট / রেফারেন্স
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="যেমন: ব্যাংক চেক নং ৮৯২"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaySupplier(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs"
              >
                পেমেন্ট নিশ্চিত করুন
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
