import React, { useState, useMemo } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Barcode,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Wallet,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Product, Language } from '../types';
import { formatMoney, translations } from '../utils/formatters';
import { deleteProduct } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface ProductsViewProps {
  products?: Product[];
  currencySymbol?: string;
  lang: Language;
  onAddNew: () => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onRefreshData?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products = [],
  currencySymbol = '৳',
  lang,
  onAddNew,
  onEdit,
  onAdjustStock,
  onRefreshData,
}) => {
  const t = translations[lang];
  const { canViewBuyPrice } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inventory valuation calculations
  const totalStockPurchaseCost = useMemo(() => {
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

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.brandName || '').toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' || p.status === statusFilter;

      const isOut = (p.currentStock || 0) <= 0;
      const isLow = !isOut && (p.currentStock || 0) <= (p.minStock || 5);

      let matchStock = true;
      if (stockFilter === 'low') matchStock = isLow;
      if (stockFilter === 'out') matchStock = isOut;
      if (stockFilter === 'in') matchStock = !isOut && !isLow;

      const matchCat =
        categoryFilter === 'all' || p.categoryName === categoryFilter;

      return matchSearch && matchStatus && matchStock && matchCat;
    });
  }, [products, searchTerm, statusFilter, stockFilter, categoryFilter]);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" পণ্যটি মুছে ফেলতে চান?`)) {
      deleteProduct(id);
      onRefreshData?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.products}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            মোট {products.length} টি পণ্য নিবন্ধিত রয়েছে
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNew}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ নতুন পণ্য যোগ করুন</span>
        </button>
      </div>

      {/* Valuation Summary Cards */}
      <div className={`grid grid-cols-1 ${canViewBuyPrice ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
        {canViewBuyPrice ? (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  মোট স্টক কেনা দাম (ক্রয় মূল্য)
                </span>
                <span className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatMoney(totalStockPurchaseCost, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  মোট স্টক বিক্রয় মূল্য
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatMoney(totalStockSaleValue, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  সম্ভাব্য মোট প্রফিট
                </span>
                <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-400 tabular-nums">
                  +{formatMoney(totalStockSaleValue - totalStockPurchaseCost, currencySymbol)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  মোট নিবন্ধিত পণ্য সংখ্যা
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {(products || []).length} টি
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  মোট স্টক বিক্রয় মূল্য
                </span>
                <span className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 tabular-nums">
                  {formatMoney(totalStockSaleValue, currencySymbol)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="নাম, SKU বা বারকোড দিয়ে খুঁজুন..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">সব ক্যাটাগরি</option>
              {(categories || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">সব স্টক স্ট্যাটাস</option>
              <option value="in">পর্যাপ্ত স্টকে আছে</option>
              <option value="low">কম স্টক (Low Stock)</option>
              <option value="out">স্টক শেষ (Out of Stock)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">সব অবস্থা</option>
              <option value="active">সক্রিয় (Active)</option>
              <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3.5 font-semibold">ছবি</th>
                <th className="py-3 px-3.5 font-semibold">পণ্যের নাম ও ক্যাটাগরি</th>
                <th className="py-3 px-3.5 font-semibold">SKU / বারকোড</th>
                <th className="py-3 px-3.5 font-semibold">স্টক</th>
                {canViewBuyPrice && (
                  <th className="py-3 px-3.5 font-semibold text-amber-700 dark:text-amber-400">কেনা দাম (ক্রয়)</th>
                )}
                <th className="py-3 px-3.5 font-semibold text-emerald-700 dark:text-emerald-400">বিক্রয় মূল্য</th>
                {canViewBuyPrice && (
                  <th className="py-3 px-3.5 font-semibold text-purple-700 dark:text-purple-400">লাভ (মার্জিন)</th>
                )}
                <th className="py-3 px-3.5 font-semibold">স্ট্যাটাস</th>
                <th className="py-3 px-3.5 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canViewBuyPrice ? 9 : 7} className="py-12 text-center text-slate-400">
                    কোনো পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                (filtered || []).map((p) => {
                  const isOut = (p.currentStock || 0) <= 0;
                  const isLow = !isOut && (p.currentStock || 0) <= (p.minStock || 5);
                  const pCost = Number(p.purchasePrice) || 0;
                  const pSale = Number(p.salePrice) || 0;
                  const marginAmt = pSale - pCost;
                  const marginPct = pCost > 0 ? Math.round((marginAmt / pCost) * 100) : 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Image Thumbnail */}
                      <td className="py-2.5 px-3.5">
                        <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://placehold.co/100x100?text=No+Img';
                              }}
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Name & Category */}
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                            {p.categoryName || 'সাধারণ'}
                          </span>
                          {p.brandName && <span>• {p.brandName}</span>}
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{p.sku}</div>
                        {p.barcode && (
                          <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                            <Barcode className="w-3 h-3" /> {p.barcode}
                          </div>
                        )}
                      </td>

                      {/* Stock Badge */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            }`}
                          >
                            {p.currentStock || 0} {p.unitName}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(p)}
                            className="text-[10px] text-slate-400 hover:text-emerald-600 underline cursor-pointer"
                            title="স্টক সমন্বয় করুন"
                          >
                            সমন্বয়
                          </button>
                        </div>
                      </td>

                      {/* Purchase Price (কেনা দাম) */}
                      {canViewBuyPrice && (
                        <td className="py-2.5 px-3.5 font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                          {formatMoney(p.purchasePrice, currencySymbol)}
                        </td>
                      )}

                      {/* Sale Price (বিক্রয় মূল্য) */}
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(p.salePrice, currencySymbol)}
                      </td>

                      {/* Profit Margin (লাভ / মার্জিন) */}
                      {canViewBuyPrice && (
                        <td className="py-2.5 px-3.5 tabular-nums">
                          <span className={`font-semibold ${marginAmt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            +{formatMoney(marginAmt, currencySymbol)}
                          </span>
                          {pCost > 0 && (
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {marginPct}% মার্জিন
                            </span>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-2.5 px-3.5">
                        {p.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> সক্রিয়
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" /> নিষ্ক্রিয়
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
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
    </div>
  );
};
