import React, { useState } from 'react';
import { ShoppingBag, PlusCircle, Search, Truck, Calendar } from 'lucide-react';
import { Purchase, Supplier, Language } from '../types';
import { formatMoney, formatDate, translations } from '../utils/formatters';

interface PurchasesViewProps {
  purchases?: Purchase[];
  suppliers?: Supplier[];
  currencySymbol?: string;
  lang: Language;
  onNewPurchase: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases = [],
  suppliers = [],
  currencySymbol = '৳',
  lang,
  onNewPurchase,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');

  const filtered = (purchases || []).filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.invoiceNo.toLowerCase().includes(q) ||
      (p.supplierName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.purchases} (ক্রয় চালান)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            সাপ্লায়ারদের থেকে মাল ক্রয়ের রেকর্ড ও চালান
          </p>
        </div>

        <button
          type="button"
          onClick={onNewPurchase}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ নতুন ক্রয় চালান</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="চালান নং বা সাপ্লায়ার দিয়ে খুঁজুন..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Purchase Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 font-semibold">চালান / ইনভয়েস নং</th>
                <th className="py-3 px-3.5 font-semibold">তারিখ</th>
                <th className="py-3 px-3.5 font-semibold">সাপ্লায়ার</th>
                <th className="py-3 px-3.5 font-semibold">আইটেম সংখ্যা</th>
                <th className="py-3 px-3.5 font-semibold">মোট মূল্য</th>
                <th className="py-3 px-3.5 font-semibold">পরিশোধিত</th>
                <th className="py-3 px-3.5 font-semibold">বকেয়া দেনা</th>
                <th className="py-3 px-3.5 font-semibold">পেমেন্ট মেথড</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    কোনো ক্রয়ের চালান পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (filtered || []).map((pur) => (
                  <tr
                    key={pur.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {pur.invoiceNo}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">
                      {formatDate(pur.createdAt, true)}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {pur.supplierName || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300">
                      {pur.items?.length || 0} টি
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(pur.total, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      {formatMoney(pur.paidAmount, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 tabular-nums">
                      {pur.dueAmount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatMoney(pur.dueAmount, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {pur.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
