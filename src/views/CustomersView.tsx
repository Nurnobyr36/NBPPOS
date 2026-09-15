import React, { useState } from 'react';
import { Users, PlusCircle, Search, DollarSign, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { Customer, Language } from '../types';
import { formatMoney, translations } from '../utils/formatters';
import { addCustomer, collectCustomerDue } from '../services/storage';

interface CustomersViewProps {
  customers?: Customer[];
  currencySymbol?: string;
  lang: Language;
  onRefreshData?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers = [],
  currencySymbol = '৳',
  lang,
  onRefreshData,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');

  // Add Customer Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingDue, setOpeningDue] = useState<number>(0);

  // Collect Payment Modal
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');

  const filtered = (customers || []).filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  const totalDueAll = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currentDue: openingDue,
      openingDue,
    });

    onRefreshData?.();
    setIsAddOpen(false);
    setName('');
    setPhone('');
    setAddress('');
    setOpeningDue(0);
  };

  const handleOpenPay = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(c.currentDue || 0);
    setPayMethod('cash');
    setPayNote('');
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    if (payAmount <= 0) {
      alert('সঠিক পরিমাণ উল্লেখ করুন');
      return;
    }

    collectCustomerDue(payCustomer.id, payAmount, payMethod, payNote);
    onRefreshData?.();
    setPayCustomer(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.customers} ও বাকি খাতা
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            মোট বকেয়া বাকি: <span className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(totalDueAll, currencySymbol)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ নতুন কাস্টমার</span>
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
            placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 font-semibold">কাস্টমারের নাম</th>
                <th className="py-3 px-3.5 font-semibold">মোবাইল নম্বর</th>
                <th className="py-3 px-3.5 font-semibold">ঠিকানা</th>
                <th className="py-3 px-3.5 font-semibold">মোট ক্রয়</th>
                <th className="py-3 px-3.5 font-semibold">বর্তমান বাকি</th>
                <th className="py-3 px-3.5 font-semibold text-right">বাকি পরিশোধ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    কোনো কাস্টমার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (filtered || []).map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                      {c.name}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {c.phone || '-'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400">
                      {c.address || '-'}
                    </td>
                    <td className="py-3 px-3.5 font-semibold tabular-nums">
                      {formatMoney(c.totalPurchase, currencySymbol)}
                    </td>
                    <td className="py-3 px-3.5 tabular-nums">
                      {c.currentDue > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatMoney(c.currentDue, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">পরিশোধিত</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {c.currentDue > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenPay(c)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          পেমেন্ট নিন
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

      {/* ADD CUSTOMER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              নতুন কাস্টমার যোগ করুন
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                কাস্টমারের নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: জামাল উদ্দিন"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ফোন নম্বর
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
                placeholder="বাসা/দোকানের ঠিকানা"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পূর্বের প্রারম্ভিক বাকি ({currencySymbol})
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
                কাস্টমার সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {payCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {payCustomer.name} — বকেয়া পেমেন্ট গ্রহণ
            </h3>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">বর্তমান বকেয়া বাকি:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatMoney(payCustomer.currentDue, currencySymbol)}
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
                max={payCustomer.currentDue}
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
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="bank">ব্যাংক (Bank)</option>
                <option value="card">কার্ড (Card)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নোট / মন্তব্য
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="যেমন: কিস্তি পরিশোধ"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayCustomer(null)}
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
