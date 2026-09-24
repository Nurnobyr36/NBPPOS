import React, { useState, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  X,
  Search,
  ArrowUpDown,
  Package,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  AlertCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Product, Sale } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';

interface TodayProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  todaySales: Sale[];
  products: Product[];
  currencySymbol?: string;
  onViewInvoice?: (sale: Sale) => void;
  onNavigateToPos?: () => void;
}

interface ProductProfitItem {
  productId: string;
  productName: string;
  category?: string;
  unit?: string;
  imageUrl?: string;
  sku?: string;
  unitCost: number;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgSellPrice: number;
  marginPercent: number;
  invoices: {
    saleId: string;
    invoiceNo: string;
    customerName: string;
    time: string;
    qty: number;
    sellPrice: number;
    lineTotal: number;
    profit: number;
    saleRef: Sale;
  }[];
}

type SortField = 'profit-desc' | 'profit-asc' | 'qty-desc' | 'revenue-desc' | 'margin-desc' | 'name-asc';

export const TodayProfitModal: React.FC<TodayProfitModalProps> = ({
  isOpen,
  onClose,
  todaySales = [],
  products = [],
  currencySymbol = '৳',
  onViewInvoice,
  onNavigateToPos,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortField>('profit-desc');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Aggregate product profit data from today's sales
  const { productProfitList, totalTodayProfit, totalTodayRevenue, totalTodayCost, totalUnitsSold, topProduct } = useMemo(() => {
    const productMap = new Map<string, ProductProfitItem>();
    let overallProfit = 0;
    let overallRevenue = 0;
    let overallCost = 0;
    let overallUnits = 0;

    todaySales.forEach((sale) => {
      const saleSubtotal = sale.subtotal || 1;
      const invoiceDiscount = sale.invoiceDiscount || 0;

      (sale.items || []).forEach((item) => {
        // Cost resolution
        let cost = item.purchasePrice;
        const matchedProduct = products.find(
          (p) => p.id === item.productId || p.name === item.name
        );
        if (cost === undefined || cost === null || isNaN(cost) || cost === 0) {
          if (matchedProduct && typeof matchedProduct.purchasePrice === 'number') {
            cost = matchedProduct.purchasePrice;
          }
        }
        const unitCost = Number(cost) || 0;
        const qty = Number(item.qty) || 1;
        const lineTotal = Number(item.lineTotal) || 0;

        // Proportional discount distribution for precision
        const discountShare = saleSubtotal > 0 ? (lineTotal / saleSubtotal) * invoiceDiscount : 0;
        const effectiveRevenue = Math.max(0, lineTotal - discountShare);
        const itemTotalCost = unitCost * qty;
        const itemProfit = Math.round(effectiveRevenue - itemTotalCost);

        const key = item.productId || item.name;

        overallProfit += itemProfit;
        overallRevenue += effectiveRevenue;
        overallCost += itemTotalCost;
        overallUnits += qty;

        const existing = productMap.get(key);
        const invoiceEntry = {
          saleId: sale.id,
          invoiceNo: sale.invoiceNo,
          customerName: sale.customerName || 'খুচরা ক্রেতা',
          time: sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '',
          qty,
          sellPrice: Number(item.rate) || Math.round(lineTotal / qty),
          lineTotal: Math.round(effectiveRevenue),
          profit: itemProfit,
          saleRef: sale,
        };

        if (existing) {
          existing.totalQty += qty;
          existing.totalRevenue += effectiveRevenue;
          existing.totalCost += itemTotalCost;
          existing.totalProfit += itemProfit;
          existing.invoices.push(invoiceEntry);
        } else {
          productMap.set(key, {
            productId: key,
            productName: item.name,
            category: matchedProduct?.category,
            unit: matchedProduct?.unit || 'টি',
            imageUrl: item.imageUrl || matchedProduct?.imageUrl,
            sku: matchedProduct?.sku,
            unitCost,
            totalQty: qty,
            totalRevenue: effectiveRevenue,
            totalCost: itemTotalCost,
            totalProfit: itemProfit,
            avgSellPrice: 0,
            marginPercent: 0,
            invoices: [invoiceEntry],
          });
        }
      });
    });

    const list: ProductProfitItem[] = [];
    productMap.forEach((item) => {
      item.totalRevenue = Math.round(item.totalRevenue);
      item.totalCost = Math.round(item.totalCost);
      item.avgSellPrice = item.totalQty > 0 ? Math.round(item.totalRevenue / item.totalQty) : 0;
      item.marginPercent = item.totalRevenue > 0 ? Math.round((item.totalProfit / item.totalRevenue) * 100) : 0;
      list.push(item);
    });

    // Find top profitable product
    let top: ProductProfitItem | null = null;
    if (list.length > 0) {
      top = [...list].sort((a, b) => b.totalProfit - a.totalProfit)[0];
    }

    return {
      productProfitList: list,
      totalTodayProfit: Math.round(overallProfit),
      totalTodayRevenue: Math.round(overallRevenue),
      totalTodayCost: Math.round(overallCost),
      totalUnitsSold: overallUnits,
      topProduct: top,
    };
  }, [todaySales, products]);

  // Filter and sort items
  const filteredProducts = useMemo(() => {
    let result = productProfitList.filter((item) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.productName.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      switch (sortOption) {
        case 'profit-desc':
          return b.totalProfit - a.totalProfit;
        case 'profit-asc':
          return a.totalProfit - b.totalProfit;
        case 'qty-desc':
          return b.totalQty - a.totalQty;
        case 'revenue-desc':
          return b.totalRevenue - a.totalRevenue;
        case 'margin-desc':
          return b.marginPercent - a.marginPercent;
        case 'name-asc':
          return a.productName.localeCompare(b.productName, 'bn');
        default:
          return b.totalProfit - a.totalProfit;
      }
    });

    return result;
  }, [productProfitList, searchTerm, sortOption]);

  const overallMargin = totalTodayRevenue > 0
    ? Math.round((totalTodayProfit / totalTodayRevenue) * 100)
    : 0;

  const handleCopySummary = () => {
    const textLines = [
      `📊 আজকের পণ্যভিত্তিক লাভ বিবরণী (${new Date().toLocaleDateString('bn-BD')})`,
      `💰 মোট আজকের লাভ: ${formatMoney(totalTodayProfit, currencySymbol)}`,
      `📦 মোট বিক্রিত পণ্য: ${totalUnitsSold} টি (${productProfitList.length} প্রকার পণ্য)`,
      `📈 গড় লাভ মার্জিন: ${overallMargin}%`,
      `---------------------------------`,
      ...filteredProducts.map(
        (p, idx) =>
          `${idx + 1}. ${p.productName} (${p.totalQty} ${p.unit || 'টি'}) | বিক্রয়: ${formatMoney(p.totalRevenue, currencySymbol)} | কেনা: ${formatMoney(p.totalCost, currencySymbol)} | লাভ: ${p.totalProfit >= 0 ? '+' : ''}${formatMoney(p.totalProfit, currencySymbol)} (${p.marginPercent}%)`
      ),
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-white to-purple-50/50 dark:from-purple-950/40 dark:via-slate-900 dark:to-purple-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  আজকের পণ্যভিত্তিক লাভ বিবরণী
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Product Profit Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                আজকের বিক্রি হওয়া প্রতিটি পণ্য থেকে কত টাকা লাভ হয়েছে তার পূর্ণাঙ্গ হিসাব
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="বন্ধ করুন (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Metrics */}
        <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Metric 1: Total Profit */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-purple-200 dark:border-purple-900/50 shadow-2xs">
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-semibold mb-1">
                <span>আজকের মোট লাভ</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-black tabular-nums ${
                  totalTodayProfit >= 0
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalTodayProfit >= 0 ? '+' : ''}
                {formatMoney(totalTodayProfit, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                মার্জিন: <span className="font-bold text-purple-600 dark:text-purple-400">{overallMargin}%</span>
              </div>
            </div>

            {/* Metric 2: Total Units Sold */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <span>মোট বিক্রিত পণ্য</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {totalUnitsSold} <span className="text-xs font-normal text-slate-500">টি</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                মোট <span className="font-semibold text-slate-700 dark:text-slate-300">{productProfitList.length}</span> টি ভিন্ন আইটেম
              </div>
            </div>

            {/* Metric 3: Total Sales Revenue */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <span>আজকের বিক্রয়মূল্য</span>
                <Receipt className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {formatMoney(totalTodayRevenue, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                কেনা দাম: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(totalTodayCost, currencySymbol)}</span>
              </div>
            </div>

            {/* Metric 4: Top Profitable Product */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                <span>সেরা লাভজনক পণ্য</span>
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
              </div>
              {topProduct ? (
                <>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={topProduct.productName}>
                    {topProduct.productName}
                  </div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    +{formatMoney(topProduct.totalProfit, currencySymbol)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">({topProduct.totalQty} টি বিক্রি)</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 mt-1">কোনো বিক্রি হয়নি</div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Actions Bar */}
        <div className="p-3 sm:px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="পণ্য বা কোড দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-purple-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortField)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="profit-desc">সর্বোচ্চ লাভ (বেশি থেকে কম)</option>
                <option value="profit-asc">সর্বনিম্ন লাভ (কম থেকে বেশি)</option>
                <option value="qty-desc">সর্বোচ্চ বিক্রি সংখ্যা</option>
                <option value="revenue-desc">সর্বোচ্চ বিক্রয় মূল্য</option>
                <option value="margin-desc">সর্বোচ্চ মার্জিন (%)</option>
                <option value="name-asc">পণ্যের নাম (A-Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="p-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="রিপোর্ট কপি করুন"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copied ? 'কপি হয়েছে!' : 'কপি'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Product Profit Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {searchTerm ? 'কোনো পণ্য পাওয়া যায়নি' : 'আজকে এখনো কোনো পণ্য বিক্রি হয়নি'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? 'আপনার সার্চ কুয়েরির সাথে মিল পাওয়া যায়নি। অন্য নাম বা বারকোড দিয়ে চেষ্টা করুন।'
                  : 'নতুন বিক্রি সম্পন্ন হলে প্রতিটি পণ্যের বিক্রয়মূল্য, কেনা দাম এবং নিট লাভ এখানে লাইভ প্রদর্শিত হবে।'}
              </p>
              {!searchTerm && onNavigateToPos && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToPos();
                  }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  নতুন বিক্রয় (POS) এ যান
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((p, idx) => {
                const isExpanded = expandedProductId === p.productId;
                return (
                  <div
                    key={p.productId}
                    className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 rounded-xl overflow-hidden shadow-2xs hover:border-purple-300 dark:hover:border-purple-800/70 transition-all"
                  >
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Product Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40">
                          {idx + 1}
                        </div>
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.productName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {p.productName}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.category && (
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {p.category}
                              </span>
                            )}
                            <span>
                              কেনা দাম: <strong className="text-slate-700 dark:text-slate-300">{formatMoney(p.unitCost, currencySymbol)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              গড় বিক্রয়: <strong className="text-slate-700 dark:text-slate-300">{formatMoney(p.avgSellPrice, currencySymbol)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Numbers Grid */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        {/* Sold Qty */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block">বিক্রিত পরিমাণ</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                            {p.totalQty} {p.unit || 'টি'}
                          </span>
                        </div>

                        {/* Revenue */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block">মোট বিক্রয়</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                            {formatMoney(p.totalRevenue, currencySymbol)}
                          </span>
                        </div>

                        {/* Profit Badge */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">
                            মোট লাভ (Profit)
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black tabular-nums ${
                              p.totalProfit >= 0
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.totalProfit >= 0 ? '+' : ''}
                            {formatMoney(p.totalProfit, currencySymbol)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            মার্জিন: <strong className="text-purple-600 dark:text-purple-400">{p.marginPercent}%</strong>
                          </div>
                        </div>

                        {/* Expand / Collapse Invoices Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(isExpanded ? null : p.productId)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title={isExpanded ? 'ইনভয়েস সংক্ষেপ করুন' : 'ইনভয়েস বিবরণ দেখুন'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Invoice Breakdown */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 bg-purple-50/40 dark:bg-purple-950/20 border-t border-purple-100 dark:border-purple-900/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-purple-600" />
                            আজকের যেসকল ইনভয়েসে এই পণ্যটি বিক্রি হয়েছে ({p.invoices.length} টি)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-b border-purple-200/50 dark:border-purple-800/40 pb-1">
                                <th className="py-1 px-2">ইনভয়েস #</th>
                                <th className="py-1 px-2">সময়</th>
                                <th className="py-1 px-2">কাস্টমার</th>
                                <th className="py-1 px-2 text-center">পরিমাণ</th>
                                <th className="py-1 px-2 text-right">বিক্রয় মূল্য</th>
                                <th className="py-1 px-2 text-right">অর্জিত লাভ</th>
                                <th className="py-1 px-2 text-right">অ্যাকশন</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-100/60 dark:divide-purple-900/30">
                              {p.invoices.map((inv, i) => (
                                <tr key={i} className="hover:bg-purple-100/40 dark:hover:bg-purple-900/30 transition-colors">
                                  <td className="py-1.5 px-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                    {inv.invoiceNo}
                                  </td>
                                  <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400">
                                    {inv.time}
                                  </td>
                                  <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                    {inv.customerName}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                                    {inv.qty} {p.unit || 'টি'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                    {formatMoney(inv.lineTotal, currencySymbol)}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold tabular-nums">
                                    <span
                                      className={
                                        inv.profit >= 0
                                          ? 'text-purple-600 dark:text-purple-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }
                                    >
                                      {inv.profit >= 0 ? '+' : ''}
                                      {formatMoney(inv.profit, currencySymbol)}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">
                                    {onViewInvoice && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onClose();
                                          onViewInvoice(inv.saleRef);
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                                      >
                                        রসিদ দেখুন
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              মোট পণ্য: {filteredProducts.length} টি
            </span>
            <span>•</span>
            <span>
              মোট নিট লাভ:{' '}
              <strong className="text-purple-700 dark:text-purple-300 font-black">
                {totalTodayProfit >= 0 ? '+' : ''}
                {formatMoney(totalTodayProfit, currencySymbol)}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
