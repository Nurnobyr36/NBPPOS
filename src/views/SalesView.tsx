import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import { Sale, Product, Customer, Language } from '../types';
import { formatMoney, formatDate, translations } from '../utils/formatters';
import { updateSale, deleteSale } from '../services/storage';
import { EditSaleModal } from '../components/EditSaleModal';
import { DeleteSaleModal } from '../components/DeleteSaleModal';

interface SalesViewProps {
  sales?: Sale[];
  products?: Product[];
  customers?: Customer[];
  currencySymbol?: string;
  lang: Language;
  onViewInvoice: (sale: Sale) => void;
  onNewSale: () => void;
  onRefreshData?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales = [],
  products = [],
  customers = [],
  currencySymbol = '৳',
  lang,
  onViewInvoice,
  onNewSale,
  onRefreshData,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const filtered = (sales || []).filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.invoiceNo.toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q) ||
      (s.customerPhone || '').includes(q);

    const matchStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalRevenue = (sales || []).reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPaid = (sales || []).reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const totalDue = (sales || []).reduce((sum, s) => sum + (s.dueAmount || 0), 0);

  // Handle Save Edited Sale
  const handleSaveEdit = (updated: Sale) => {
    try {
      updateSale(updated, true);
      onRefreshData?.();
      showToast(`ইনভয়েস #${updated.invoiceNo} সফলভাবে আপডেট ও স্টক সমন্বয় করা হয়েছে।`);
    } catch (err) {
      console.error('Error updating sale:', err);
      showToast('ত্রুটি: ইনভয়েস আপডেট করা সম্ভব হয়নি।');
    }
  };

  // Handle Delete Sale
  const handleConfirmDelete = (saleId: string, restoreStock: boolean) => {
    try {
      const target = sales.find((s) => s.id === saleId);
      const invNo = target ? target.invoiceNo : '';
      deleteSale(saleId, restoreStock);
      onRefreshData?.();
      showToast(
        `ইনভয়েস #${invNo} সফলভাবে মুছে ফেলা হয়েছে${
          restoreStock ? ' এবং স্টক পুনরায় ইনভেন্টরিতে যোগ করা হয়েছে।' : '।'
        }`
      );
    } catch (err) {
      console.error('Error deleting sale:', err);
      showToast('ত্রুটি: ইনভয়েস মুছে ফেলা সম্ভব হয়নি।');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.sales} (সেলস হিস্ট্রি ও ব্যবস্থাপনা)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            এডমিন চাইলে যেকোনো বিক্রয় হিস্ট্রি এডিট, সংশোধন অথবা বাতিল ও মুছে ফেলতে পারেন
          </p>
        </div>

        <button
          type="button"
          onClick={onNewSale}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer w-fit"
        >
          + নতুন বিক্রয় (POS)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            মোট সম্পন্ন বিক্রয়
          </span>
          <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
            {sales.length} টি
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            সর্বমোট বিক্রয় মূল্য
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            {formatMoney(totalRevenue, currencySymbol)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            মোট আদায়কৃত ক্যাশ/পেমেন্ট
          </span>
          <span className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-400 mt-0.5 block">
            {formatMoney(totalPaid, currencySymbol)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            মোট বাকি (Due)
          </span>
          <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
            {formatMoney(totalDue, currencySymbol)}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ইনভয়েস নং, কাস্টমার নাম বা মোবাইল নং..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">সব লেনদেন</option>
              <option value="posted">সম্পন্ন (Posted)</option>
              <option value="returned">ফেরত / বাতিল (Returned)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 font-semibold">ইনভয়েস নং</th>
                <th className="py-3 px-3.5 font-semibold">তারিখ ও সময়</th>
                <th className="py-3 px-3.5 font-semibold">কাস্টমার</th>
                <th className="py-3 px-3.5 font-semibold">আইটেম সংখ্যা</th>
                <th className="py-3 px-3.5 font-semibold">মোট মূল্য</th>
                <th className="py-3 px-3.5 font-semibold">পরিশোধ</th>
                <th className="py-3 px-3.5 font-semibold">বাকি</th>
                <th className="py-3 px-3.5 font-semibold">অবস্থা</th>
                <th className="py-3 px-3.5 font-semibold text-center w-36">এডমিন অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    কোনো বিক্রয় রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (filtered || []).map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {s.invoiceNo}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(s.createdAt, true)}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      <div>{s.customerName}</div>
                      {s.customerPhone && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {s.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-medium">
                        {s.items?.length || 0} টি
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(s.total, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      {formatMoney(s.paidAmount, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3.5 tabular-nums">
                      {s.dueAmount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatMoney(s.dueAmount, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'posted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}
                      >
                        {s.status === 'posted' ? 'সম্পন্ন' : 'বাতিল/ফেরত'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Invoice */}
                        <button
                          type="button"
                          onClick={() => onViewInvoice(s)}
                          className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="রসিদ দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Sale */}
                        <button
                          type="button"
                          onClick={() => setEditingSale(s)}
                          className="p-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                          title="ইনভয়েস এডিট / সংশোধন করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Sale */}
                        <button
                          type="button"
                          onClick={() => setDeletingSale(s)}
                          className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="ইনভয়েস মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          customers={customers}
          products={products}
          currencySymbol={currencySymbol}
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Sale Modal */}
      {deletingSale && (
        <DeleteSaleModal
          sale={deletingSale}
          currencySymbol={currencySymbol}
          isOpen={!!deletingSale}
          onClose={() => setDeletingSale(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};
