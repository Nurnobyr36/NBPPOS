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
  Tag,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Product, Language } from '../types';
import { formatMoney, translations } from '../utils/formatters';
import { deleteProduct, updateProduct } from '../services/storage';
import { syncProductToFirestore } from '../services/firebase';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Quick Buy Price (কেনা দাম) Modal state
  const [editingBuyPriceProduct, setEditingBuyPriceProduct] = useState<Product | null>(null);
  const [buyPriceInput, setBuyPriceInput] = useState<string>('');
  const [isSavingBuyPrice, setIsSavingBuyPrice] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const openBuyPriceModal = (product: Product) => {
    setEditingBuyPriceProduct(product);
    setBuyPriceInput(product.purchasePrice ? String(product.purchasePrice) : '');
  };

  const handleSaveBuyPrice = async () => {
    if (!editingBuyPriceProduct) return;
    const priceNum = Math.max(0, Number(buyPriceInput) || 0);
    setIsSavingBuyPrice(true);
    try {
      const updated = updateProduct(editingBuyPriceProduct.id, { purchasePrice: priceNum });
      if (updated) {
        await syncProductToFirestore(updated).catch(() => {});
      }
      onRefreshData?.();
      setEditingBuyPriceProduct(null);
      setToastMsg(`"${editingBuyPriceProduct.name}" এর কেনা দাম ৳${priceNum} সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.warn('Error saving buy price:', err);
    } finally {
      setIsSavingBuyPrice(false);
    }
  };

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

        {/* View Toggle and Results Count */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              মোট প্রদর্শিত: <strong className="text-slate-900 dark:text-slate-100">{filtered.length}</strong> টি পণ্য
            </span>
            {(searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStockFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline"
              >
                ফিল্টার রিসেট
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>গ্রিড ভিউ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>তালিকা ভিউ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Display: Grid View or Table View */}
      {viewMode === 'grid' ? (
        filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xs">
            <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">কোনো পণ্য পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              আপনার ফিল্টার বা অনুসন্ধানের সাথে মিল রেখে কোনো পণ্য তালিকায় নেই।
            </p>
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>নতুন পণ্য যোগ করুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((p) => {
              const isOut = (p.currentStock || 0) <= 0;
              const isLow = !isOut && (p.currentStock || 0) <= (p.minStock || 5);
              const pCost = Number(p.purchasePrice) || 0;
              const pSale = Number(p.salePrice) || 0;
              const marginAmt = pSale - pCost;
              const marginPct = pCost > 0 ? Math.round((marginAmt / pCost) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col relative"
                >
                  {/* Product Image & Overlays */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 mb-3 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/240x180?text=No+Img';
                        }}
                      />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    )}

                    {/* Status Badge (Top-Left) */}
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs ${
                        p.status === 'active'
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-slate-700/90 text-white'
                      }`}
                    >
                      {p.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>

                    {/* Stock Badge (Top-Right) */}
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                        isOut
                          ? 'bg-rose-600 text-white'
                          : isLow
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-900/75 backdrop-blur-xs text-white'
                      }`}
                    >
                      {isOut
                        ? 'স্টক শেষ'
                        : isLow
                        ? `কম স্টক (${p.currentStock})`
                        : `মজুদ: ${p.currentStock} ${p.unitName}`}
                    </span>
                  </div>

                  {/* Category */}
                  {p.categoryName && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5 truncate block">
                      {p.categoryName}
                    </span>
                  )}

                  {/* Name */}
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug min-h-[2.4rem] mb-1">
                    {p.name}
                  </h4>

                  {/* SKU & Barcode */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-3">
                    <span className="truncate">SKU: {p.sku}</span>
                    {p.barcode && <span className="truncate">• {p.barcode}</span>}
                  </div>

                  {/* Price Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 mb-3 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">বিক্রয় মূল্য:</span>
                      <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatMoney(pSale, currencySymbol)}
                      </span>
                    </div>

                    {canViewBuyPrice && (
                      <>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-amber-700 dark:text-amber-400 font-medium">কেনা দাম:</span>
                          {pCost > 0 ? (
                            <button
                              type="button"
                              onClick={() => openBuyPriceModal(p)}
                              className="font-bold text-amber-800 dark:text-amber-300 hover:underline tabular-nums flex items-center gap-1 cursor-pointer"
                              title="কেনা দাম এডিট করুন"
                            >
                              <span>{formatMoney(pCost, currencySymbol)}</span>
                              <Edit2 className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openBuyPriceModal(p)}
                              className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300 font-bold text-[10px] cursor-pointer"
                            >
                              + কেনা দাম
                            </button>
                          )}
                        </div>

                        {pCost > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                            <span>একক লাভ:</span>
                            <span
                              className={
                                marginAmt >= 0
                                  ? 'text-purple-700 dark:text-purple-400 font-bold tabular-nums'
                                  : 'text-rose-600 font-bold tabular-nums'
                              }
                            >
                              +{formatMoney(marginAmt, currencySymbol)} ({marginPct}%)
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {canViewBuyPrice && (
                        <button
                          type="button"
                          onClick={() => openBuyPriceModal(p)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title="কেনা দাম এড বা পরিবর্তন করুন"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAdjustStock(p)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="স্টক সমন্বয় করুন"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Product Table */
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
                          {pCost > 0 ? (
                            <button
                              type="button"
                              onClick={() => openBuyPriceModal(p)}
                              className="group inline-flex items-center gap-1.5 hover:text-amber-600 dark:hover:text-amber-300 transition-colors text-left cursor-pointer"
                              title="কেনা দাম পরিবর্তন করুন"
                            >
                              <span>{formatMoney(p.purchasePrice, currencySymbol)}</span>
                              <Edit2 className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-amber-600 transition-opacity" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openBuyPriceModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
                              title="এই পণ্যের কেনা দাম এড করুন"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                              এড করুন
                            </button>
                          )}
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
                        {canViewBuyPrice && (
                          <button
                            type="button"
                            onClick={() => openBuyPriceModal(p)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            title="কেনা দাম এড / পরিবর্তন করুন"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
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
      )}

      {/* Quick Buy Price (কেনা দাম) Modal */}
      {editingBuyPriceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    কেনা দাম এড / পরিবর্তন করুন
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {editingBuyPriceProduct.name} ({editingBuyPriceProduct.sku})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBuyPriceProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">বর্তমান বিক্রয় মূল্য:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(editingBuyPriceProduct.salePrice, currencySymbol)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center justify-between">
                <span>নতুন কেনা দাম / ক্রয় মূল্য ({currencySymbol}) *</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">আইটেম ক্রয়ের রেট</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={buyPriceInput}
                onChange={(e) => setBuyPriceInput(e.target.value)}
                placeholder="যেমন: ৫০"
                className="w-full text-base font-bold text-amber-800 dark:text-amber-300 px-3.5 py-2.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
              />
            </div>

            {/* Profit Margin Preview */}
            {Number(buyPriceInput) > 0 && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">প্রতি ইউনিটে সম্ভাব্য লাভ:</span>
                <div className="text-right font-bold">
                  <span className={editingBuyPriceProduct.salePrice >= Number(buyPriceInput) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                    +{formatMoney(editingBuyPriceProduct.salePrice - Number(buyPriceInput), currencySymbol)}
                  </span>
                  <span className="ml-1 text-[11px] text-slate-500 font-normal">
                    ({Math.round(((editingBuyPriceProduct.salePrice - Number(buyPriceInput)) / Number(buyPriceInput)) * 100)}% মার্জিন)
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingBuyPriceProduct(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isSavingBuyPrice}
                onClick={handleSaveBuyPrice}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSavingBuyPrice ? 'সংরক্ষণ হচ্ছে...' : 'কেনা দাম সংরক্ষণ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-emerald-950 dark:text-emerald-100 border border-emerald-500/30 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
