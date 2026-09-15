import React from 'react';
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
  Boxes,
  Wallet,
  Coins,
} from 'lucide-react';
import { Product, Sale, Customer, Language } from '../types';
import { formatMoney, formatDate, translations } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

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

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
  const todaySalesAmount = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalDueAmount = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

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
  const days: { label: string; dateStr: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'short',
    });
    const amount = sales
      .filter((s) => s.createdAt.startsWith(dateStr))
      .reduce((sum, s) => sum + (s.total || 0), 0);
    days.push({ label: dayName, dateStr, amount });
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
            দোকানের প্রতিদিনের বিক্রয়, স্টক ও বকেয়া হিসাবের সার্বিক চিত্র
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-2xs">
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
                এডমিন ইনভেন্টরি ও কেনা দাম হিসাব
              </h3>
              <p className="text-xs text-slate-400">
                বর্তমান মজুদ পণ্যের ক্রয় মূল্য (কেনা দাম), বিক্রয় মূল্য এবং সম্ভাব্য মোট মুনাফা
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5">
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
              <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> সম্ভাব্য নিট মুনাফা (প্রফিট)
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1 tabular-nums">
                +{formatMoney(totalEstimatedProfit, currencySymbol)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">বিক্রয় মূল্য ও কেনা দামের ব্যবধান</p>
            </div>
          </div>
        </div>
      )}

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
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatMoney(day.amount, currencySymbol)}
                  </span>
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
                <th className="py-2.5 px-3 font-semibold">পরিশোধ</th>
                <th className="py-2.5 px-3 font-semibold">বাকি</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.slice(0, 6).map((sale) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
