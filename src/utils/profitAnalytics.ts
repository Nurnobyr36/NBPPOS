import { Sale, Product } from '../types';

export type ProfitPeriod = 'today' | '3days' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export interface ProductProfitInvoiceEntry {
  saleId: string;
  invoiceNo: string;
  customerName: string;
  dateStr: string;
  time: string;
  qty: number;
  sellPrice: number;
  lineTotal: number;
  profit: number;
  saleRef: Sale;
}

export interface ProductProfitItem {
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
  invoices: ProductProfitInvoiceEntry[];
}

export interface PeriodSummary {
  period: ProfitPeriod;
  label: string;
  dateRangeText: string;
  salesList: Sale[];
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
  invoiceCount: number;
  unitsSold: number;
  productProfitList: ProductProfitItem[];
  topProduct: ProductProfitItem | null;
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export function getBengaliMonthYear(date: Date = new Date()): string {
  const month = BN_MONTHS[date.getMonth()];
  const year = date.toLocaleDateString('bn-BD', { year: 'numeric' });
  return `${month} ${year}`;
}

export function getPeriodDateBounds(
  period: ProfitPeriod,
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date; label: string; dateRangeText: string } {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (period === 'today') {
    const todayBn = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: startOfToday,
      endDate: endOfToday,
      label: 'আজকের রিপোর্ট',
      dateRangeText: `আজ: ${todayBn}`,
    };
  }

  if (period === '3days') {
    const start3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
    const startStr = start3.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    const endStr = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: start3,
      endDate: endOfToday,
      label: 'গত ৩ দিনের রিপোর্ট',
      dateRangeText: `${startStr} হতে ${endStr} (৩ দিন)`,
    };
  }

  if (period === '7days') {
    const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const startStr = start7.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    const endStr = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: start7,
      endDate: endOfToday,
      label: 'গত ৭ দিনের রিপোর্ট',
      dateRangeText: `${startStr} হতে ${endStr} (৭ দিন)`,
    };
  }

  if (period === 'thisMonth') {
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthName = getBengaliMonthYear(now);
    const startStr = startThisMonth.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    const endStr = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: startThisMonth,
      endDate: endOfToday,
      label: `এই মাসের রিপোর্ট (${monthName})`,
      dateRangeText: `${startStr} হতে ${endStr} (${monthName})`,
    };
  }

  if (period === 'lastMonth') {
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    // Day 0 of current month is the last day of previous month
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = getBengaliMonthYear(prevMonthDate);
    const startStr = startLastMonth.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
    const endStr = endLastMonth.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate: startLastMonth,
      endDate: endLastMonth,
      label: `গত মাসের রিপোর্ট (${monthName})`,
      dateRangeText: `${startStr} হতে ${endStr} (${monthName})`,
    };
  }

  if (period === 'custom' && customStart) {
    const [sy, sm, sd] = customStart.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    let endDate = endOfToday;
    if (customEnd) {
      const [ey, em, ed] = customEnd.split('-').map(Number);
      endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    }
    const startStr = startDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr = endDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      startDate,
      endDate,
      label: 'কাস্টম তারিখ রিপোর্ট',
      dateRangeText: `${startStr} হতে ${endStr}`,
    };
  }

  // All time
  return {
    startDate: new Date(2000, 0, 1),
    endDate: new Date(2099, 11, 31),
    label: 'সর্বমোট রিপোর্ট (সব সময়)',
    dateRangeText: 'প্রতিষ্ঠার শুরু থেকে আজ পর্যন্ত',
  };
}

export function filterSalesByPeriod(
  sales: Sale[] = [],
  period: ProfitPeriod,
  customStart?: string,
  customEnd?: string
): { filteredSales: Sale[]; dateRangeText: string; label: string } {
  const { startDate, endDate, label, dateRangeText } = getPeriodDateBounds(period, customStart, customEnd);

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const filteredSales = sales.filter((s) => {
    if (!s.createdAt) return false;
    const sDate = new Date(s.createdAt);
    const sMs = sDate.getTime();
    if (isNaN(sMs)) return false;
    return sMs >= startMs && sMs <= endMs;
  });

  return { filteredSales, dateRangeText, label };
}

export function getSaleItemUnitCost(item: any, products: Product[] = []): number {
  let cost = item.purchasePrice;
  if (cost === undefined || cost === null || isNaN(cost) || cost === 0) {
    const matched = products.find(
      (p) => p.id === item.productId || p.name === item.name
    );
    if (matched && typeof matched.purchasePrice === 'number' && matched.purchasePrice > 0) {
      cost = matched.purchasePrice;
    }
  }
  return Number(cost) || 0;
}

export function calculateSingleSaleProfit(sale: Sale, products: Product[] = []): number {
  const totalCost = (sale.items || []).reduce((sum, it) => {
    const unitCost = getSaleItemUnitCost(it, products);
    const qty = Number(it.qty) || 1;
    return sum + unitCost * qty;
  }, 0);
  return Math.round((sale.total || 0) - totalCost);
}

export function calculateProductProfitBreakdown(
  sales: Sale[] = [],
  products: Product[] = []
): {
  productProfitList: ProductProfitItem[];
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  unitsSold: number;
  topProduct: ProductProfitItem | null;
} {
  const productMap = new Map<string, ProductProfitItem>();
  let overallProfit = 0;
  let overallRevenue = 0;
  let overallCost = 0;
  let overallUnits = 0;

  sales.forEach((sale) => {
    const saleSubtotal = sale.subtotal || 1;
    const invoiceDiscount = sale.invoiceDiscount || 0;

    (sale.items || []).forEach((item) => {
      const unitCost = getSaleItemUnitCost(item, products);
      const matchedProduct = products.find((p) => p.id === item.productId || p.name === item.name);

      const qty = Number(item.qty) || 1;
      const lineTotal = Number(item.lineTotal) || 0;

      // Proportional discount allocation for precise net revenue
      const discountShare = saleSubtotal > 0 ? (lineTotal / saleSubtotal) * invoiceDiscount : 0;
      const effectiveRevenue = Math.max(0, lineTotal - discountShare);
      const itemTotalCost = unitCost * qty;
      const itemProfit = Math.round(effectiveRevenue - itemTotalCost);

      const key = item.productId || item.name;

      overallProfit += itemProfit;
      overallRevenue += effectiveRevenue;
      overallCost += itemTotalCost;
      overallUnits += qty;

      const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
      const invoiceEntry: ProductProfitInvoiceEntry = {
        saleId: sale.id,
        invoiceNo: sale.invoiceNo,
        customerName: sale.customerName || 'খুচরা ক্রেতা',
        dateStr: sale.createdAt ? saleDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }) : '',
        time: sale.createdAt ? saleDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '',
        qty,
        sellPrice: Number(item.rate) || Math.round(lineTotal / qty),
        lineTotal: Math.round(effectiveRevenue),
        profit: itemProfit,
        saleRef: sale,
      };

      const existing = productMap.get(key);
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
          category: (matchedProduct as any)?.category || matchedProduct?.categoryName,
          unit: (matchedProduct as any)?.unit || matchedProduct?.unitName || 'টি',
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

  // Sort descending by profit
  list.sort((a, b) => b.totalProfit - a.totalProfit);

  return {
    productProfitList: list,
    totalProfit: Math.round(overallProfit),
    totalRevenue: Math.round(overallRevenue),
    totalCost: Math.round(overallCost),
    unitsSold: overallUnits,
    topProduct: list.length > 0 ? list[0] : null,
  };
}

export function getFullPeriodSummary(
  sales: Sale[] = [],
  products: Product[] = [],
  period: ProfitPeriod,
  customStart?: string,
  customEnd?: string
): PeriodSummary {
  const { filteredSales, dateRangeText, label } = filterSalesByPeriod(sales, period, customStart, customEnd);
  const breakdown = calculateProductProfitBreakdown(filteredSales, products);

  const marginPercent = breakdown.totalRevenue > 0
    ? Math.round((breakdown.totalProfit / breakdown.totalRevenue) * 100)
    : 0;

  return {
    period,
    label,
    dateRangeText,
    salesList: filteredSales,
    totalRevenue: breakdown.totalRevenue,
    totalCost: breakdown.totalCost,
    netProfit: breakdown.totalProfit,
    marginPercent,
    invoiceCount: filteredSales.length,
    unitsSold: breakdown.unitsSold,
    productProfitList: breakdown.productProfitList,
    topProduct: breakdown.topProduct,
  };
}

export function getMonthComparison(
  sales: Sale[] = [],
  products: Product[] = []
): {
  thisMonthProfit: number;
  thisMonthRevenue: number;
  thisMonthInvoices: number;
  lastMonthProfit: number;
  lastMonthRevenue: number;
  lastMonthInvoices: number;
  profitDiff: number;
  profitGrowthPct: number;
  isProfitHigher: boolean;
  thisMonthLabel: string;
  lastMonthLabel: string;
} {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthSummary = getFullPeriodSummary(sales, products, 'thisMonth');
  const lastMonthSummary = getFullPeriodSummary(sales, products, 'lastMonth');

  const profitDiff = thisMonthSummary.netProfit - lastMonthSummary.netProfit;
  let profitGrowthPct = 0;
  if (lastMonthSummary.netProfit > 0) {
    profitGrowthPct = Math.round((profitDiff / lastMonthSummary.netProfit) * 100);
  } else if (thisMonthSummary.netProfit > 0) {
    profitGrowthPct = 100;
  }

  return {
    thisMonthProfit: thisMonthSummary.netProfit,
    thisMonthRevenue: thisMonthSummary.totalRevenue,
    thisMonthInvoices: thisMonthSummary.invoiceCount,
    lastMonthProfit: lastMonthSummary.netProfit,
    lastMonthRevenue: lastMonthSummary.totalRevenue,
    lastMonthInvoices: lastMonthSummary.invoiceCount,
    profitDiff,
    profitGrowthPct,
    isProfitHigher: profitDiff >= 0,
    thisMonthLabel: getBengaliMonthYear(now),
    lastMonthLabel: getBengaliMonthYear(prevMonthDate),
  };
}
