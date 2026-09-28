import React, { useState, useMemo, useEffect } from 'react';
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
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { Product, Sale } from '../types';
import { formatMoney } from '../utils/formatters';
import {
  ProfitPeriod,
  ProductProfitItem,
  getFullPeriodSummary,
  getMonthComparison,
  getBengaliMonthYear,
} from '../utils/profitAnalytics';

export interface ProfitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  products: Product[];
  initialPeriod?: ProfitPeriod;
  currencySymbol?: string;
  onViewInvoice?: (sale: Sale) => void;
  onNavigateToPos?: () => void;
}

type SortField =
  | 'profit-desc'
  | 'profit-asc'
  | 'qty-desc'
  | 'revenue-desc'
  | 'margin-desc'
  | 'name-asc';

export const ProfitReportModal: React.FC<ProfitReportModalProps> = ({
  isOpen,
  onClose,
  sales = [],
  products = [],
  initialPeriod = 'today',
  currencySymbol = '৳',
  onViewInvoice,
  onNavigateToPos,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ProfitPeriod>(initialPeriod);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortField>('profit-desc');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync initial period when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPeriod(initialPeriod);
      setSearchTerm('');
      setExpandedProductId(null);
    }
  }, [isOpen, initialPeriod]);

  // Close on Escape key
  useEffect(() => {
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

  // Calculate summary and product breakdown for selected period
  const periodSummary = useMemo(() => {
    return getFullPeriodSummary(sales, products, selectedPeriod, customStart, customEnd);
  }, [sales, products, selectedPeriod, customStart, customEnd]);

  // Month comparison metrics (for This Month / Last Month context)
  const monthComp = useMemo(() => {
    return getMonthComparison(sales, products);
  }, [sales, products]);

  // Filter and sort items
  const filteredProducts = useMemo(() => {
    let result = periodSummary.productProfitList.filter((item) => {
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
  }, [periodSummary.productProfitList, searchTerm, sortOption]);

  if (!isOpen) return null;

  const now = new Date();
  const currentMonthLabel = getBengaliMonthYear(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthLabel = getBengaliMonthYear(prevMonthDate);

  const handleCopySummary = () => {
    const lines = [
      `📊 ${periodSummary.label} (${periodSummary.dateRangeText})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 মোট লাভ: ${formatMoney(periodSummary.netProfit, currencySymbol)}`,
      `🏷️ মোট বিক্রয়: ${formatMoney(periodSummary.totalRevenue, currencySymbol)}`,
      `📦 মোট কেনা খরচ: ${formatMoney(periodSummary.totalCost, currencySymbol)}`,
      `📈 গড় লাভ মার্জিন: ${periodSummary.marginPercent}%`,
      `🧾 সম্পন্ন ইনভয়েস: ${periodSummary.invoiceCount} টি`,
      `📦 মোট বিক্রিত পণ্য: ${periodSummary.unitsSold} টি`,
      ``,
      `শীর্ষ লাভজনক পণ্যসমূহ:`,
      ...periodSummary.productProfitList.slice(0, 5).map(
        (p, idx) =>
          `${idx + 1}. ${p.productName} — বিক্রি: ${p.totalQty} ${p.unit || 'টি'} | লাভ: ${formatMoney(p.totalProfit, currencySymbol)} (${p.marginPercent}%)`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `নিহাদ বিজনেস পয়েন্ট • POS ডিজিটাল হিসাব`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const periodButtons: { id: ProfitPeriod; label: string; badge?: string }[] = [
    { id: 'today', label: 'আজকে' },
    { id: '3days', label: 'গত ৩ দিন' },
    { id: '7days', label: 'গত ৭ দিন' },
    { id: 'thisMonth', label: `এই মাস (${currentMonthLabel})` },
    { id: 'lastMonth', label: `গত মাস (${lastMonthLabel})` },
    { id: 'all', label: 'সব সময়' },
    { id: 'custom', label: 'কাস্টম তারিখ' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    লাভ ও বিক্রয় রিপোর্ট (Profit Analytics)
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    {periodSummary.label}
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-purple-300" />
                  <span>{periodSummary.dateRangeText}</span>
                  <span>•</span>
                  <span>মোট {periodSummary.invoiceCount} টি ইনভয়েস</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="রিপোর্ট প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="হিসাব কপি করুন"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Period Selector Pills */}
          <div className="mt-4 pt-3 border-t border-purple-800/60 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            {periodButtons.map((btn) => {
              const active = selectedPeriod === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedPeriod(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-white text-purple-950 font-bold shadow-sm ring-2 ring-purple-400/50'
                      : 'bg-white/10 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  {btn.id === 'today' && <Sparkles className="w-3.5 h-3.5" />}
                  {btn.id === '3days' && <Calendar className="w-3.5 h-3.5" />}
                  {btn.id === '7days' && <TrendingUp className="w-3.5 h-3.5" />}
                  {btn.id === 'thisMonth' && <Coins className="w-3.5 h-3.5" />}
                  {btn.id === 'lastMonth' && <Receipt className="w-3.5 h-3.5" />}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (if 'custom' selected) */}
          {selectedPeriod === 'custom' && (
            <div className="mt-3 p-3 bg-purple-950/60 rounded-xl border border-purple-800/80 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-purple-200 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> তারিখ সিলেক্ট করুন:
              </span>
              <div className="flex items-center gap-2">
                <label className="text-purple-300">হতে:</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-purple-900/80 border border-purple-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-purple-300">পর্যন্ত:</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-purple-900/80 border border-purple-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-purple-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Comparison Banner for This Month / Last Month */}
          {selectedPeriod === 'thisMonth' && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                    monthComp.isProfitHigher
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}
                >
                  {monthComp.isProfitHigher ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    গত মাসের তুলনায় লাভ:
                  </span>{' '}
                  <span
                    className={`font-black ${
                      monthComp.isProfitHigher
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {monthComp.profitDiff >= 0 ? '+' : ''}
                    {formatMoney(monthComp.profitDiff, currencySymbol)}
                    {monthComp.profitGrowthPct !== 0 && ` (${monthComp.profitGrowthPct > 0 ? '+' : ''}${monthComp.profitGrowthPct}%)`}
                  </span>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <span>
                  গত মাসের লাভ ({monthComp.lastMonthLabel}):{' '}
                  <strong className="text-purple-700 dark:text-purple-300 font-bold">
                    {formatMoney(monthComp.lastMonthProfit, currencySymbol)}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('lastMonth')}
                  className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                >
                  গত মাস দেখুন →
                </button>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Profit */}
            <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl p-3 sm:p-4">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> মোট নিট লাভ
              </span>
              <div
                className={`text-lg sm:text-xl font-black mt-1 tabular-nums ${
                  periodSummary.netProfit >= 0
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {periodSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(periodSummary.netProfit, currencySymbol)}
              </div>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                মার্জিন: <strong>{periodSummary.marginPercent}%</strong>
              </span>
            </div>

            {/* Total Revenue */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 sm:p-4">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> মোট বিক্রয় মূল্য
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatMoney(periodSummary.totalRevenue, currencySymbol)}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {periodSummary.invoiceCount} টি ইনভয়েস
              </span>
            </div>

            {/* Total Purchase Cost */}
            <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 sm:p-4">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> পণ্য ক্রয় খরচ
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-amber-700 dark:text-amber-300 tabular-nums">
                {formatMoney(periodSummary.totalCost, currencySymbol)}
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                বিক্রিত মালের কেনা দাম
              </span>
            </div>

            {/* Total Units Sold */}
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3 sm:p-4">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> বিক্রিত পণ্যের পরিমাণ
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-blue-700 dark:text-blue-300 tabular-nums">
                {periodSummary.unitsSold} টি
              </div>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate block">
                {periodSummary.productProfitList.length} টি ভিন্ন আইটেম
              </span>
            </div>
          </div>

          {/* Top Profitable Product Highlight (if exists) */}
          {periodSummary.topProduct && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-100 to-indigo-50 dark:from-purple-950/60 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  🏆
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                    {periodSummary.label}-এর সর্বোচ্চ লাভজনক পণ্য
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {periodSummary.topProduct.productName}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-black text-purple-700 dark:text-purple-300 tabular-nums">
                  +{formatMoney(periodSummary.topProduct.totalProfit, currencySymbol)}
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  {periodSummary.topProduct.totalQty} {periodSummary.topProduct.unit || 'টি'} বিক্রি • মার্জিন: {periodSummary.topProduct.marginPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Search, Sort & Counter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="পণ্য বা ক্যাটাগরি খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px]">সর্ট:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortField)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="profit-desc">সর্বোচ্চ লাভ (High → Low)</option>
                  <option value="profit-asc">সর্বনিম্ন লাভ (Low → High)</option>
                  <option value="qty-desc">সর্বোচ্চ বিক্রি সংখ্যা</option>
                  <option value="revenue-desc">সর্বোচ্চ বিক্রয় মূল্য</option>
                  <option value="margin-desc">সর্বোচ্চ লাভ মার্জিন %</option>
                  <option value="name-asc">পণ্যের নাম (A-Z)</option>
                </select>
              </div>

              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                মোট {filteredProducts.length} টি পণ্য
              </span>
            </div>
          </div>

          {/* Product-wise Profit Breakdown List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchTerm
                  ? 'অনুসন্ধানের সাথে কোনো পণ্য মেলেনি'
                  : `${periodSummary.label}-এ কোনো বিক্রয় রেকর্ড পাওয়া যায়নি`}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'ভিন্ন বানান চেষ্টা করুন'
                  : 'পিওএস (POS) থেকে পণ্য বিক্রি সম্পন্ন হলে স্বয়ংক্রিয়ভাবে এখানে পণ্যের নিট লাভ প্রদর্শিত হবে।'}
              </p>
              {!searchTerm && onNavigateToPos && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToPos();
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  নতুন বিক্রয় (POS) করুন
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((item, index) => {
                const isExpanded = expandedProductId === item.productId;
                const isProfitable = item.totalProfit >= 0;

                return (
                  <div
                    key={item.productId}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 overflow-hidden hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => setExpandedProductId(isExpanded ? null : item.productId)}
                      className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
                    >
                      {/* Product Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 pr-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.category && (
                              <span className="px-1.5 py-0.2 bg-slate-200/80 dark:bg-slate-700 rounded text-[10px]">
                                {item.category}
                              </span>
                            )}
                            <span>
                              কেনা দাম: <strong className="text-amber-700 dark:text-amber-400 font-semibold">{formatMoney(item.unitCost, currencySymbol)}</strong>
                            </span>
                            <span>
                              গড় বিক্রি: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatMoney(item.avgSellPrice, currencySymbol)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                        {/* Sold Qty */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">বিক্রি সংখ্যা</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.totalQty} {item.unit || 'টি'}
                          </span>
                        </div>

                        {/* Revenue */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">মোট বিক্রয়</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {formatMoney(item.totalRevenue, currencySymbol)}
                          </span>
                        </div>

                        {/* Net Profit */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">নিট লাভ</span>
                          <div
                            className={`text-xs sm:text-sm font-black tabular-nums ${
                              isProfitable
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isProfitable ? '+' : ''}
                            {formatMoney(item.totalProfit, currencySymbol)}
                          </div>
                          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                            মার্জিন {item.marginPercent}%
                          </span>
                        </div>

                        {/* Expand Chevron */}
                        <div className="text-slate-400 hover:text-slate-600 pl-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Per-Invoice Breakdown */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-purple-500" />
                            ইনভয়েস ভিত্তিক বিক্রয় ও লাভ ({item.invoices.length} টি রশিদ)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            প্রতি রশিদে বিক্রয়মূল্য ও অর্জিত লাভ
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {item.invoices.map((inv, invIdx) => (
                            <div
                              key={`${inv.saleId}-${invIdx}`}
                              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-400">
                                  {inv.invoiceNo}
                                </span>
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                  • {inv.customerName}
                                </span>
                                {inv.dateStr && (
                                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                                    ({inv.dateStr} {inv.time})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0 text-right">
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                  {inv.qty} {item.unit || 'টি'} × {formatMoney(inv.sellPrice, currencySymbol)} = <strong>{formatMoney(inv.lineTotal, currencySymbol)}</strong>
                                </span>

                                <span
                                  className={`text-[11px] font-black px-2 py-0.5 rounded ${
                                    inv.profit >= 0
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                  }`}
                                >
                                  লাভ: {inv.profit >= 0 ? '+' : ''}{formatMoney(inv.profit, currencySymbol)}
                                </span>

                                {onViewInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onViewInvoice(inv.saleRef);
                                    }}
                                    className="p-1 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                                    title="মূল ইনভয়েস দেখুন"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">
              পণ্য বিক্রির সময় প্রদত্ত ইনভয়েস ডিসকাউন্ট আনুপাতিক হারে সমন্বয় করে সঠিক নিট লাভ নির্ণীত হয়।
            </span>
            <span className="sm:hidden">ডিসকাউন্ট সমন্বিত নিট লাভ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'রিপোর্ট কপি'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
