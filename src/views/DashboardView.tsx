import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  PlusCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Wallet,
  Coins,
  Calendar,
  Sparkles,
  BarChart3,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Product, Sale, Customer, Language } from '../types';
import { formatMoney, formatDate, translations } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ProfitReportModal } from '../components/ProfitReportModal';
import {
  ProfitPeriod,
  getFullPeriodSummary,
  getMonthComparison,
  getBengaliMonthYear,
} from '../utils/profitAnalytics';

interface DashboardViewProps {
  products?: Product[];
  sales?: Sale[];
  customers?: Customer[];
  currencySymbol?: string;
  lang: Language;
  onNavigate: (tab: string) => void;
  onViewInvoice: (sale: Sale) => void;
  onAdjustStockModal?: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products = [],
  sales = [],
  customers = [],
  currencySymbol = '৳',
  lang,
  onNavigate,
  onViewInvoice,
  onAdjustStockModal,
}) => {
  const t = translations[lang];
  const { canViewBuyPrice } = useAuth();
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [profitModalPeriod, setProfitModalPeriod] = useState<ProfitPeriod>('today');
  const [activeReportTab, setActiveReportTab] = useState<ProfitPeriod>('thisMonth');

  // Multi-period profit calculations
  const todaySummary = useMemo(() => getFullPeriodSummary(sales, products, 'today'), [sales, products]);
  const threeDaysSummary = useMemo(() => getFullPeriodSummary(sales, products, '3days'), [sales, products]);
  const sevenDaysSummary = useMemo(() => getFullPeriodSummary(sales, products, '7days'), [sales, products]);
  const thisMonthSummary = useMemo(() => getFullPeriodSummary(sales, products, 'thisMonth'), [sales, products]);
  const lastMonthSummary = useMemo(() => getFullPeriodSummary(sales, products, 'lastMonth'), [sales, products]);
  const monthComp = useMemo(() => getMonthComparison(sales, products), [sales, products]);

  const activeSummary = useMemo(() => {
    switch (activeReportTab) {
      case 'today':
        return todaySummary;
      case '3days':
        return threeDaysSummary;
      case '7days':
        return sevenDaysSummary;
      case 'thisMonth':
        return thisMonthSummary;
      case 'lastMonth':
        return lastMonthSummary;
      default:
        return thisMonthSummary;
    }
  }, [activeReportTab, todaySummary, threeDaysSummary, sevenDaysSummary, thisMonthSummary, lastMonthSummary]);

  const handleOpenProfitModal = (period: ProfitPeriod) => {
    setProfitModalPeriod(period);
    setIsProfitModalOpen(true);
  };

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
  const todaySalesAmount = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalDueAmount = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  // Profit calculation helper for each sale
  const getSaleProfit = (s: Sale): number => {
    if (typeof s.profit === 'number' && !isNaN(s.profit)) {
      return s.profit;
    }
    const totalCost = (s.items || []).reduce((sum, it) => {
      let cost = it.purchasePrice;
      if (cost === undefined || cost === null || isNaN(cost) || cost === 0) {
        const matched = products.find(
          (p) => p.id === it.productId || p.name === it.name
        );
        if (matched && typeof matched.purchasePrice === 'number') {
          cost = matched.purchasePrice;
        }
      }
      return sum + (Number(cost) || 0) * (Number(it.qty) || 1);
    }, 0);
    return Math.round((s.total || 0) - totalCost);
  };

  // Today's total profit and overall profit
  const todayProfit = todaySales.reduce((sum, s) => sum + getSaleProfit(s), 0);
  const totalProfit = sales.reduce((sum, s) => sum + getSaleProfit(s), 0);
  const todayProfitMargin = todaySalesAmount > 0
    ? Math.round((todayProfit / todaySalesAmount) * 100)
    : 0;

  // Admin purchase price and stock valuation
  const totalStockPurchaseValue = products.reduce(
    (sum, p) => sum + (Number(p.purchasePrice) || 0) * (Number(p.currentStock) || 0),
    0
  );
  const totalStockSaleValue = products.reduce(
    (sum, p) => sum + (Number(p.salePrice) || 0) * (Number(p.currentStock) || 0),
    0
  );
  const totalEstimatedProfit = totalStockSaleValue - totalStockPurchaseValue;

  const lowStockProducts = products.filter(
    (p) => p.status === 'active' && (p.currentStock || 0) <= (p.minStock || 5)
  );

  // Group sales by past 7 days for the chart
  const days: { label: string; dateStr: string; amount: number; profit: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'short',
    });
    const daySalesList = sales.filter((s) => s.createdAt.startsWith(dateStr));
    const amount = daySalesList.reduce((sum, s) => sum + (s.total || 0), 0);
    const profit = daySalesList.reduce((sum, s) => sum + getSaleProfit(s), 0);
    days.push({ label: dayName, dateStr, amount, profit });
  }

  const maxAmount = Math.max(...days.map((d) => d.amount), 1000);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t.dashboard}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            দোকানের প্রতিদিনের বিক্রয়, লাভ-মুনাফা, স্টক ও বকেয়া হিসাবের সার্বিক চিত্র
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>নতুন বিক্রয় (POS)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('product-form')}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>+ নতুন পণ্য</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">{t.today_sales}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
            {formatMoney(todaySalesAmount, currencySymbol)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            আজ {todaySales.length} টি ইনভয়েস সম্পন্ন
          </p>
        </div>

        {/* Today's Profit (আজকের বিক্রি থেকে লাভ) - Clickable to open breakdown */}
        <button
          type="button"
          onClick={() => handleOpenProfitModal('today')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-600 rounded-xl p-4 shadow-2xs relative overflow-hidden text-left hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all group cursor-pointer active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
          title="আজকের কোন পণ্য থেকে কত লাভ হয়েছে দেখতে ক্লিক করুন"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1 group-hover:underline">
              আজকের লাভ (Profit)
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-xl font-black tabular-nums ${
              todayProfit >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {todayProfit >= 0 ? '+' : ''}
            {formatMoney(todayProfit, currencySymbol)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              মার্জিন: <strong className="text-purple-600 dark:text-purple-400 font-bold">{todayProfitMargin}%</strong>
            </span>
            <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/90 px-1.5 py-0.5 rounded font-semibold group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center gap-0.5">
              পণ্যভিত্তিক লাভ ↗
            </span>
          </div>
        </button>

        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-teal-600 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">{t.total_sales}</span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
            {formatMoney(totalSalesAmount, currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            মোট বিক্রয় সংখ্যা: {sales.length}
          </p>
        </div>

        {/* Total Due (Baki) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">{t.total_due}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {formatMoney(totalDueAmount, currencySymbol)}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline mt-1 font-semibold flex items-center gap-1 cursor-pointer"
          >
            বাকি খাতা দেখুন <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">{t.low_stock_count}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {lowStockProducts.length} টি পণ্য
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stock')}
            className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline mt-1 font-semibold flex items-center gap-1 cursor-pointer"
          >
            স্টক রিস্টক করুন <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Admin Inventory & Purchase Valuation Banner */}
      {canViewBuyPrice && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                এডমিন ইনভেন্টরি, কেনা দাম ও লাভ হিসাব
              </h3>
              <p className="text-xs text-slate-400">
                বর্তমান মজুদ পণ্যের ক্রয় মূল্য (কেনা দাম), বিক্রয় মূল্য এবং আজকের বিক্রির অর্জিত লাভ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
            >
              ইনভেন্টরি অডিট <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3.5">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> মোট স্টক কেনা দাম (ক্রয় মূল্য)
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-100 mt-1 tabular-nums">
                {formatMoney(totalStockPurchaseValue, currencySymbol)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">মজুদ পণ্যে মোট আর্থিক বিনিয়োগ</p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> মোট স্টক বিক্রয় মূল্য
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-100 mt-1 tabular-nums">
                {formatMoney(totalStockSaleValue, currencySymbol)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">সব পণ্য বিক্রিত হলে প্রাপ্ত মূল্য</p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] font-semibold text-teal-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> স্টক থেকে সম্ভাব্য মুনাফা
              </span>
              <div className="text-lg sm:text-xl font-black text-teal-300 mt-1 tabular-nums">
                +{formatMoney(totalEstimatedProfit, currencySymbol)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">বর্তমান স্টকের বিক্রয় ও কেনা দামের ব্যবধান</p>
            </div>

            <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-800/50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> আজকের বিক্রি থেকে লাভ
                </span>
                <div
                  className={`text-lg sm:text-xl font-black mt-1 tabular-nums ${
                    todayProfit >= 0 ? 'text-purple-200' : 'text-rose-300'
                  }`}
                >
                  {todayProfit >= 0 ? '+' : ''}
                  {formatMoney(todayProfit, currencySymbol)}
                </div>
                <p className="text-[10px] text-purple-300/80 mt-0.5">
                  আজকের মোট {todaySales.length} টি বিক্রির অর্জিত নিট লাভ (মার্জিন: {todayProfitMargin}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenProfitModal('today')}
                className="mt-2.5 text-[11px] text-purple-300 hover:text-white font-semibold underline flex items-center gap-1 cursor-pointer w-fit"
              >
                পণ্যভিত্তিক লাভ দেখুন →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Period Profit & Sales Analytics Section (এই মাস, গত মাস, ৭ দিন, ৩ দিনের রিপোর্ট) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              পর্যায়ক্রমিক লাভ ও বিক্রয় রিপোর্ট (Profit Reports)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              এই মাস, গত মাস, ৭ দিন ও ৩ দিনের বিক্রয় থেকে অর্জিত নিট লাভ ও মার্জিন বিশ্লেষণ
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenProfitModal('thisMonth')}
            className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>পূর্ণাঙ্গ পণ্যভিত্তিক লাভ রিপোর্ট খুলুন →</span>
          </button>
        </div>

        {/* 4 Dedicated Period KPI Cards for the requested periods */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Last 3 Days Profit */}
          <div
            onClick={() => handleOpenProfitModal('3days')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600 rounded-2xl p-4 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 group-hover:underline">
                  <Calendar className="w-3.5 h-3.5" />
                  গত ৩ দিনের লাভ
                </span>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                  ৩ দিন
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black tabular-nums ${
                  threeDaysSummary.netProfit >= 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {threeDaysSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(threeDaysSummary.netProfit, currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                বিক্রি: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(threeDaysSummary.totalRevenue, currencySymbol)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                মার্জিন: {threeDaysSummary.marginPercent}%
              </span>
              <span className="text-blue-700 dark:text-blue-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                রিপোর্ট ↗
              </span>
            </div>
          </div>

          {/* Last 7 Days Profit */}
          <div
            onClick={() => handleOpenProfitModal('7days')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-600 rounded-2xl p-4 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 group-hover:underline">
                  <TrendingUp className="w-3.5 h-3.5" />
                  গত ৭ দিনের লাভ
                </span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                  ৭ দিন
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black tabular-nums ${
                  sevenDaysSummary.netProfit >= 0
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {sevenDaysSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(sevenDaysSummary.netProfit, currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                বিক্রি: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(sevenDaysSummary.totalRevenue, currencySymbol)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                মার্জিন: {sevenDaysSummary.marginPercent}%
              </span>
              <span className="text-indigo-700 dark:text-indigo-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                রিপোর্ট ↗
              </span>
            </div>
          </div>

          {/* This Month's Profit */}
          <div
            onClick={() => handleOpenProfitModal('thisMonth')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 rounded-2xl p-4 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 group-hover:underline">
                  <Coins className="w-3.5 h-3.5" />
                  এই মাসের লাভ ({monthComp.thisMonthLabel})
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  চলতি মাস
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black tabular-nums ${
                  thisMonthSummary.netProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {thisMonthSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(thisMonthSummary.netProfit, currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                বিক্রি: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(thisMonthSummary.totalRevenue, currencySymbol)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span
                className={`font-semibold ${
                  monthComp.isProfitHigher ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                vs গত মাস: {monthComp.profitGrowthPct >= 0 ? '+' : ''}{monthComp.profitGrowthPct}%
              </span>
              <span className="text-emerald-700 dark:text-emerald-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                রিপোর্ট ↗
              </span>
            </div>
          </div>

          {/* Last Month's Profit */}
          <div
            onClick={() => handleOpenProfitModal('lastMonth')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-600 rounded-2xl p-4 shadow-2xs hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 group-hover:underline">
                  <Receipt className="w-3.5 h-3.5" />
                  গত মাসের লাভ ({monthComp.lastMonthLabel})
                </span>
                <span className="text-[10px] bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
                  পূর্বের মাস
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black tabular-nums ${
                  lastMonthSummary.netProfit >= 0
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {lastMonthSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(lastMonthSummary.netProfit, currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                বিক্রি: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(lastMonthSummary.totalRevenue, currencySymbol)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                মার্জিন: {lastMonthSummary.marginPercent}%
              </span>
              <span className="text-purple-700 dark:text-purple-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                রিপোর্ট ↗
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Period Switcher & Live Analytics Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                ইন্টারেক্টিভ লাভ ও মার্জিন বিশ্লেষণ
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                নিচের যেকোনো সময়ে ক্লিক করে লাভ ও বিক্রয়ের বিশদ সারাংশ দেখুন
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'today' as ProfitPeriod, label: '⚡ আজকে' },
                { id: '3days' as ProfitPeriod, label: '⏱️ গত ৩ দিন' },
                { id: '7days' as ProfitPeriod, label: '📅 গত ৭ দিন' },
                { id: 'thisMonth' as ProfitPeriod, label: `📆 এই মাস` },
                { id: 'lastMonth' as ProfitPeriod, label: `🗓️ গত মাস` },
              ].map((tab) => {
                const isActive = activeReportTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveReportTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Period Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> মোট নিট লাভ
              </span>
              <div
                className={`text-lg sm:text-xl font-black mt-1 tabular-nums ${
                  activeSummary.netProfit >= 0
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {activeSummary.netProfit >= 0 ? '+' : ''}
                {formatMoney(activeSummary.netProfit, currencySymbol)}
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                মার্জিন: {activeSummary.marginPercent}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> মোট বিক্রয়মূল্য
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatMoney(activeSummary.totalRevenue, currencySymbol)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {activeSummary.invoiceCount} টি ইনভয়েস
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> পণ্য ক্রয় খরচ
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-amber-700 dark:text-amber-300 tabular-nums">
                {formatMoney(activeSummary.totalCost, currencySymbol)}
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                বিক্রিত মালের কেনা দাম
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> মোট বিক্রিত সংখ্যা
              </span>
              <div className="text-lg sm:text-xl font-black mt-1 text-blue-700 dark:text-blue-300 tabular-nums">
                {activeSummary.unitsSold} টি
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                {activeSummary.productProfitList.length} টি পণ্য বিক্রি
              </span>
            </div>
          </div>

          {/* Month comparison tag when 'thisMonth' is active */}
          {activeReportTab === 'thisMonth' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  গত মাসের সাথে তুলনা ({monthComp.lastMonthLabel}):
                </span>
                <span
                  className={`font-black flex items-center gap-1 px-2 py-0.5 rounded-md ${
                    monthComp.isProfitHigher
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}
                >
                  {monthComp.isProfitHigher ? '+' : ''}
                  {formatMoney(monthComp.profitDiff, currencySymbol)} ({monthComp.profitGrowthPct >= 0 ? '+' : ''}{monthComp.profitGrowthPct}%)
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">
                গত মাসের মোট লাভ ছিলো: <strong className="text-purple-700 dark:text-purple-300">{formatMoney(monthComp.lastMonthProfit, currencySymbol)}</strong>
              </span>
            </div>
          )}

          {/* Top 3 Profitable Items in this active period */}
          {activeSummary.productProfitList.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                🏆 {activeSummary.label}-এর শীর্ষ লাভজনক পণ্যসমূহ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {activeSummary.productProfitList.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.productName}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        বিক্রি: {item.totalQty} {item.unit || 'টি'} • মার্জিন: {item.marginPercent}%
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-purple-700 dark:text-purple-300 block">
                        +{formatMoney(item.totalProfit, currencySymbol)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button to open full breakdown for this period */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => handleOpenProfitModal(activeReportTab)}
              className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>{activeSummary.label}-এর কোন পণ্য থেকে কত লাভ হয়েছে দেখুন (প্রিন্ট ও রিপোর্ট) →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Chart & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-Day Sales Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {t.weekly_sales}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">বিগত ৭ দিনের মোট বিক্রয়</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg">
              চলতি সপ্তাহ
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
            {days.map((day, idx) => {
              const heightPct = Math.max(8, Math.round((day.amount / maxAmount) * 100));
              const isToday = day.dateStr === todayStr;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  {/* Amount Tooltip on hover */}
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <span>{formatMoney(day.amount, currencySymbol)}</span>
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">
                      লাভ: {day.profit >= 0 ? '+' : ''}{formatMoney(day.profit, currencySymbol)}
                    </span>
                  </div>
                  <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 flex items-end p-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isToday
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-emerald-800/80 hover:bg-emerald-700'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      isToday
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-500" />
              কম স্টক পণ্য সমূহ
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
            >
              সব দেখুন
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px]">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                সব পণ্যের স্টক পর্যাপ্ত রয়েছে 👍
              </p>
            ) : (
              lowStockProducts.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>SKU: {p.sku}</span>
                      <span>• কেনা দাম: <strong className="text-amber-700 dark:text-amber-400 font-semibold">{formatMoney(p.purchasePrice, currencySymbol)}</strong></span>
                      <span>• বিক্রি: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatMoney(p.salePrice, currencySymbol)}</strong></span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        (p.currentStock || 0) === 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}
                    >
                      {p.currentStock || 0} {p.unitName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustStockModal?.(p)}
                      className="px-2 py-1 text-[11px] bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white rounded-md transition-colors cursor-pointer font-medium"
                    >
                      সমন্বয়
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              {t.recent_sales}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সর্বশেষ সম্পন্ন হওয়া বিক্রয়ের তালিকা
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            সম্পূর্ণ বিক্রয় ইতিহাস <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">ইনভয়েস নং</th>
                <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                <th className="py-2.5 px-3 font-semibold">কাস্টমার</th>
                <th className="py-2.5 px-3 font-semibold">আইটেম সংখ্যা</th>
                <th className="py-2.5 px-3 font-semibold">সর্বমোট</th>
                <th className="py-2.5 px-3 font-semibold text-purple-600 dark:text-purple-400">লাভ (Profit)</th>
                <th className="py-2.5 px-3 font-semibold">পরিশোধ</th>
                <th className="py-2.5 px-3 font-semibold">বাকি</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.slice(0, 6).map((sale) => {
                const sProfit = getSaleProfit(sale);
                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {sale.invoiceNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {formatDate(sale.createdAt, true)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {sale.items?.length || 0} টি
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(sale.total, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">
                      <span
                        className={
                          sProfit >= 0
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {sProfit >= 0 ? '+' : ''}
                        {formatMoney(sProfit, currencySymbol)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      {formatMoney(sale.paidAmount, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">
                      {sale.dueAmount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatMoney(sale.dueAmount, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(sale)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                      >
                        ইনভয়েস
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Period Product-wise Profit Breakdown Modal */}
      <ProfitReportModal
        isOpen={isProfitModalOpen}
        onClose={() => setIsProfitModalOpen(false)}
        sales={sales}
        products={products}
        initialPeriod={profitModalPeriod}
        currencySymbol={currencySymbol}
        onViewInvoice={onViewInvoice}
        onNavigateToPos={() => onNavigate('pos')}
      />
    </div>
  );
};
