import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, CheckSquare, Square, PackageCheck } from 'lucide-react';
import { Sale } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';

interface DeleteSaleModalProps {
  sale: Sale;
  currencySymbol?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (saleId: string, restoreStock: boolean) => void;
}

export const DeleteSaleModal: React.FC<DeleteSaleModalProps> = ({
  sale,
  currencySymbol = '৳',
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [restoreStock, setRestoreStock] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = () => {
    setIsDeleting(true);
    onConfirmDelete(sale.id, restoreStock);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                বিক্রয় রেকর্ড মুছে ফেলা নিশ্চিত করুন
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ইনভয়েস #{sale.invoiceNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">ইনভয়েস নং:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {sale.invoiceNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">তারিখ:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatDate(sale.createdAt, true)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">কাস্টমার:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {sale.customerName}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
              <span className="text-slate-600 dark:text-slate-300">মোট বিক্রয় মূল্য:</span>
              <span className="text-emerald-700 dark:text-emerald-400">
                {formatMoney(sale.total, currencySymbol)}
              </span>
            </div>
            {sale.dueAmount > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                <span>বাকি টাকা:</span>
                <span>{formatMoney(sale.dueAmount, currencySymbol)}</span>
              </div>
            )}
          </div>

          {/* Stock Restoration Option */}
          <div
            onClick={() => setRestoreStock(!restoreStock)}
            className={`p-3 rounded-xl border cursor-pointer select-none transition-colors flex items-start gap-2.5 ${
              restoreStock
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
              {restoreStock ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                পণ্যগুলো ইনভেন্টরি স্টকে পুনরায় ফেরত যোগ করুন
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                টিক চিহ্ন দেওয়া থাকলে বিক্রিত {sale.items?.length || 0} টি পণ্যের পরিমাণ স্টকে
                পুনরায় যুক্ত হবে এবং কাস্টমারের হিসাব থেকে এই ইনভয়েস সমন্বয় হবে।
              </p>
            </div>
          </div>

          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 leading-relaxed">
            ⚠️ এই বিক্রয় রেকর্ডটি ক্লাউড ডাটাবেস ও লোকাল স্টোরেজ উভয় স্থান থেকেই চিরতরে মুছে
            যাবে।
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
