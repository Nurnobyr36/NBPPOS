import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  SlidersHorizontal,
  History,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  Minus,
  DollarSign,
  Wallet,
  Coins,
  Package,
} from 'lucide-react';
import { Product, StockMovement, Language } from '../types';
import { formatDate, formatMoney, translations } from '../utils/formatters';
import { adjustProductStock } from '../services/storage';

interface StockViewProps {
  products?: Product[];
  movements?: StockMovement[];
  currencySymbol?: string;
  lang: Language;
  onRefreshData?: () => void;
  activeProductForModal?: Product | null;
  onCloseModal?: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products = [],
  movements = [],
  currencySymbol = '৳',
  lang,
  onRefreshData,
  activeProductForModal,
  onCloseModal,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(
    activeProductForModal || null
  );
  const [qtyChangeInput, setQtyChangeInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Admin inventory valuation calculations
  const totalStockPurchaseValue = useMemo(() => {
    return (products || []).reduce(
      (sum, p) => sum + (Number(p.purchasePrice) || 0) * (Number(p.currentStock) || 0),
      0
    );
  }, [products]);

  const totalStockSaleValue = useMemo(() => {
    return (products || []).reduce(
      (sum, p) => sum + (Number(p.salePrice) || 0) * (Number(p.currentStock) || 0),
      0
    );
  }, [products]);

  const totalUnits = useMemo(() => {
    return (products || []).reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
  }, [products]);

  const totalPotentialProfit = totalStockSaleValue - totalStockPurchaseValue;

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return products || [];
    return (products || []).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
    );
  }, [products, searchTerm]);

  const handleOpenAdjust = (p: Product) => {
    setAdjustModalProduct(p);
    setQtyChangeInput('');
    setReasonInput('');
    setModalError(null);
  };

  const handleCloseAdjust = () => {
    setAdjustModalProduct(null);
    if (onCloseModal) onCloseModal();
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    const qty = Number(qtyChangeInput);
    if (isNaN(qty) || qty === 0) {
      setModalError('সঠিক পরিমাণ লিখুন (+ বাড়াতে, - কমাতে)');
      return;
    }
    if (!reasonInput.trim()) {
      setModalError('স্টক পরিবর্তনের কারণ লিখুন (যেমন: ড্যামেজ, চুরি, রিকাউন্ট ইত্যাদি)');
      return;
    }

    const success = adjustProductStock(
      adjustModalProduct.id,
      qty,
      reasonInput.trim()
    );

    if (success) {
      onRefreshData?.();
      handleCloseAdjust();
    } else {
      setModalError('স্টক আপডেট সম্পন্ন করা সম্ভব হয়নি');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.stock} ও সমন্বয় (ইনভেন্টরি অডিট)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            পণ্যের বর্তমান মজুদ, কেনা দাম (ক্রয় মূল্য) ও ইনভেন্টরি বিনিয়োগ হিসাব
          </p>
        </div>
      </div>

      {/* Admin Valuation KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">মোট ইনভেন্টরি পণ্য</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
            {products.length} টি পণ্য
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            মোট মজুদ: {totalUnits} ইউনিট
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">মোট কেনা দাম (বিনিয়োগ)</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
            {formatMoney(totalStockPurchaseValue, currencySymbol)}
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-medium">
            মজুদ মালের ক্রয় মূল্যের মোট হিসাব
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">মোট বিক্রয় মূল্য</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatMoney(totalStockSaleValue, currencySymbol)}
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
            বর্তমান বিক্রয় মূল্যে মোট ভ্যালু
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">সম্ভাব্য মোট লাভ</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400 tabular-nums">
            {formatMoney(totalPotentialProfit, currencySymbol)}
          </div>
          <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-1 font-medium">
            বিক্রয় মূল্য - কেনা দাম
          </p>
        </div>
      </div>

      {/* Product Stock Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-emerald-600" />
            পণ্যের বর্তমান মজুদ ও কেনা দাম তালিকা
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="পণ্যের নাম বা SKU দিয়ে খুঁজুন..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">পণ্য</th>
                <th className="py-2.5 px-3 font-semibold">SKU কোড</th>
                <th className="py-2.5 px-3 font-semibold">বর্তমান মজুদ</th>
                <th className="py-2.5 px-3 font-semibold">কেনা দাম (ক্রয় মূল্য)</th>
                <th className="py-2.5 px-3 font-semibold">বিক্রয় মূল্য</th>
                <th className="py-2.5 px-3 font-semibold">একক লাভ</th>
                <th className="py-2.5 px-3 font-semibold">মোট কেনা ভ্যালু</th>
                <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    কোনো পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = (p.currentStock || 0) <= 0;
                  const isLow = !isOut && (p.currentStock || 0) <= (p.minStock || 5);
                  const pCost = Number(p.purchasePrice) || 0;
                  const pSale = Number(p.salePrice) || 0;
                  const unitProfit = pSale - pCost;
                  const totalCostValue = (p.currentStock || 0) * pCost;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                        {p.name}
                        {p.categoryName && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            {p.categoryName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {p.currentStock || 0} {p.unitName}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        {formatMoney(pCost, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(pSale, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums">
                        <span className={unitProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                          +{formatMoney(unitProfit, currencySymbol)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatMoney(totalCostValue, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                            স্টক শেষ
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            কম স্টক
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            পর্যাপ্ত মজুদ
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(p)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          স্টক সমন্বয়
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

      {/* Stock Movement History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600" />
          {t.movement_history}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">তারিখ ও সময়</th>
                <th className="py-2.5 px-3 font-semibold">পণ্যের নাম</th>
                <th className="py-2.5 px-3 font-semibold">ধরন</th>
                <th className="py-2.5 px-3 font-semibold">পরিবর্তন</th>
                <th className="py-2.5 px-3 font-semibold">ফলাফল স্টক</th>
                <th className="py-2.5 px-3 font-semibold">কারণ / রেফারেন্স</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    কোনো স্টক হিস্ট্রি পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (movements || []).map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {formatDate(m.createdAt, true)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {m.productName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {m.type === 'sale'
                          ? 'বিক্রয়'
                          : m.type === 'purchase'
                          ? 'ক্রয়'
                          : 'সমন্বয়'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">
                      {m.qtyChange > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{m.qtyChange}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          {m.qtyChange}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {m.resultingStock}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {m.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAdjustment}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              {adjustModalProduct.name} — স্টক সমন্বয়
            </h3>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">বর্তমান স্টক:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {adjustModalProduct.currentStock} {adjustModalProduct.unitName}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিমাণ পরিবর্তন (+ বাড়াতে, − কমাতে) *
              </label>
              <input
                type="number"
                step="1"
                required
                value={qtyChangeInput}
                onChange={(e) => setQtyChangeInput(e.target.value)}
                placeholder="যেমন: -2 (নষ্ট) বা 5 (পাওয়া গেছে)"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                কারণ *
              </label>
              <input
                type="text"
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="যেমন: মেয়াদোত্তীর্ণ, প্যাকেট ফাটা, রিকাউন্ট"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            {modalError && (
              <p className="text-xs text-rose-600 font-medium">⚠️ {modalError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseAdjust}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs"
              >
                সমন্বয় সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
