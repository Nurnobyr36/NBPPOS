import React, { useState, useMemo } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  Package,
  Receipt,
} from 'lucide-react';
import { Sale, SaleItem, Customer, Product } from '../types';
import { formatMoney } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface EditSaleModalProps {
  sale: Sale;
  customers?: Customer[];
  products?: Product[];
  currencySymbol?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSale: Sale) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  customers = [],
  products = [],
  currencySymbol = '৳',
  isOpen,
  onClose,
  onSave,
}) => {
  const { canViewBuyPrice } = useAuth();
  if (!isOpen) return null;

  // Form State initialized from current sale
  const [invoiceNo, setInvoiceNo] = useState(sale.invoiceNo);
  const [createdAt, setCreatedAt] = useState(() => {
    try {
      const d = new Date(sale.createdAt || Date.now());
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(sale.customerId || '');
  const [customerName, setCustomerName] = useState(sale.customerName || 'Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
  const [cashierName, setCashierName] = useState(sale.cashierName || 'এডমিন');
  const [status, setStatus] = useState<'posted' | 'returned'>(sale.status || 'posted');
  const [notes, setNotes] = useState(sale.notes || '');

  // Items State
  const [items, setItems] = useState<SaleItem[]>(() =>
    (sale.items || []).map((it) => ({ ...it }))
  );

  // Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(sale.invoiceDiscount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(sale.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'card'
  >(sale.payments?.[0]?.method || 'cash');

  // Selected product to quickly add to invoice
  const [selectedProductId, setSelectedProductId] = useState('');

  // Handle Customer Selection
  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    if (!cId) {
      setCustomerName('সাধারণ ক্রেতা (Walk-in)');
      setCustomerPhone('');
    } else {
      const c = customers.find((cust) => cust.id === cId);
      if (c) {
        setCustomerName(c.name);
        setCustomerPhone(c.phone || '');
      }
    }
  };

  // Add Item to Invoice
  const handleAddItem = (productId: string) => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Check if already in items
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      const next = [...items];
      next[existingIndex].qty += 1;
      next[existingIndex].lineTotal =
        next[existingIndex].qty * next[existingIndex].rate - next[existingIndex].discount;
      setItems(next);
    } else {
      const newItem: SaleItem = {
        productId: prod.id,
        name: prod.name,
        qty: 1,
        rate: prod.salePrice || 0,
        purchasePrice: prod.purchasePrice || 0,
        discount: 0,
        vatRate: prod.vatRate || 0,
        lineTotal: prod.salePrice || 0,
        imageUrl: prod.imageUrl,
      };
      setItems([...items, newItem]);
    }
    setSelectedProductId('');
  };

  // Update Item Quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const next = [...items];
    next[index].qty = newQty;
    next[index].lineTotal = Math.max(0, next[index].qty * next[index].rate - next[index].discount);
    setItems(next);
  };

  // Update Item Rate
  const handleUpdateRate = (index: number, newRate: number) => {
    const next = [...items];
    next[index].rate = Math.max(0, newRate);
    next[index].lineTotal = Math.max(0, next[index].qty * next[index].rate - next[index].discount);
    setItems(next);
  };

  // Update Item Discount
  const handleUpdateDiscount = (index: number, newDiscount: number) => {
    const next = [...items];
    next[index].discount = Math.max(0, newDiscount);
    next[index].lineTotal = Math.max(0, next[index].qty * next[index].rate - next[index].discount);
    setItems(next);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('ইনভয়েসে অন্তত একটি পণ্য থাকা আবশ্যক!');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Recalculate Totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
  }, [items]);

  const vatTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const rate = it.vatRate || 0;
      const taxable = (it.lineTotal || 0);
      return sum + (taxable * rate) / 100;
    }, 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - invoiceDiscount + vatTotal);
  }, [subtotal, invoiceDiscount, vatTotal]);

  const dueAmount = useMemo(() => {
    return Math.max(0, total - paidAmount);
  }, [total, paidAmount]);

  const changeAmount = useMemo(() => {
    return Math.max(0, paidAmount - total);
  }, [total, paidAmount]);

  const estimatedProfit = useMemo(() => {
    const totalCost = items.reduce((sum, it) => {
      const cost = it.purchasePrice || 0;
      return sum + cost * it.qty;
    }, 0);
    return Math.round(total - totalCost);
  }, [items, total]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('অন্তত একটি পণ্য থাকতে হবে!');
      return;
    }

    const updatedSale: Sale = {
      ...sale,
      invoiceNo,
      createdAt: new Date(createdAt).toISOString(),
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      cashierName: cashierName.trim(),
      status,
      items,
      subtotal,
      invoiceDiscount,
      vatTotal,
      total,
      paidAmount,
      dueAmount,
      changeAmount,
      profit: estimatedProfit,
      payments: [
        {
          method: paymentMethod,
          amount: paidAmount > total ? total : paidAmount,
        },
      ],
      notes: notes.trim(),
    };

    onSave(updatedSale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                ইনভয়েস এডিট ও সংশোধন
                <span className="font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-xs">
                  {invoiceNo}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                এডমিন প্যানেল থেকে ইনভয়েস তথ্য, পণ্য ও পেমেন্ট হিস্ট্রি পরিবর্তন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Row 1: Invoice Details & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> ইনভয়েস নম্বর
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> বিক্রয়ের তারিখ ও সময়
              </label>
              <input
                type="datetime-local"
                required
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                লেনদেন অবস্থা (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'posted' | 'returned')}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              >
                <option value="posted">সম্পন্ন (Posted)</option>
                <option value="returned">ফেরত / বাতিল (Returned)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" /> কাস্টমার নির্বাচন
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              >
                <option value="">সাধারণ ক্রেতা (Walk-in Customer)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - বর্তমান বাকি: {c.currentDue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                ক্যাশিয়ার / অপারেটর
              </label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Row 2: Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" /> পণ্যের তালিকা ({items.length} টি)
              </h4>

              {/* Add Product Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="text-xs py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-w-[200px]"
                >
                  <option value="">+ নতুন পণ্য যোগ করুন...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMoney(p.salePrice, currencySymbol)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddItem(selectedProductId)}
                  disabled={!selectedProductId}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> যোগ করুন
                </button>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3">পণ্যের বিবরণ</th>
                    <th className="py-2 px-2 w-24 text-center">পরিমাণ</th>
                    <th className="py-2 px-2 w-28 text-right">দর ({currencySymbol})</th>
                    <th className="py-2 px-2 w-24 text-right">ছাড় ({currencySymbol})</th>
                    <th className="py-2 px-3 w-28 text-right">মোট</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={it.productId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {it.name}
                        {canViewBuyPrice && it.purchasePrice !== undefined && (
                          <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                            কেনা: {formatMoney(it.purchasePrice, currencySymbol)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.qty}
                          onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                          className="w-16 text-center text-xs font-bold py-1 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          value={it.rate}
                          onChange={(e) => handleUpdateRate(idx, Number(e.target.value))}
                          className="w-20 text-right text-xs font-bold py-1 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={it.discount}
                          onChange={(e) => handleUpdateDiscount(idx, Number(e.target.value))}
                          className="w-16 text-right text-xs py-1 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(it.lineTotal, currencySymbol)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="পণ্যটি মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Financials & Payment Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Payment & Notes */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> পেমেন্ট মাধ্যম
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                >
                  <option value="cash">ক্যাশ (নগদ টাকা)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="rocket">রকেট (Rocket)</option>
                  <option value="card">ব্যাংক কার্ড (Card)</option>
                  <option value="bank">ব্যাংক ট্রান্সফার (Bank)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  নোট / বিশেষ বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ইনভয়েস সম্পর্কে কোনো অতিরিক্ত তথ্য..."
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100 resize-none"
                />
              </div>

              {/* Informational Alerts */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                <p className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                  <AlertCircle className="w-3 h-3" /> স্টক স্বয়ংক্রিয়ভাবে পরিমাণের ব্যবধান অনুযায়ী সমন্বয় হবে।
                </p>
                <p className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                  <AlertCircle className="w-3 h-3" /> কাস্টমারের পূর্বের বাকি ও মোট বিক্রয়ের হিসাব আপডেট হবে।
                </p>
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>উপ-মোট (Subtotal):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatMoney(subtotal, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">বিশেষ ছাড় (Discount):</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                  className="w-24 text-right text-xs font-bold py-1 px-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
                />
              </div>

              {vatTotal > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ভ্যাট (VAT):</span>
                  <span className="font-bold tabular-nums">{formatMoney(vatTotal, currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-slate-100">
                <span>সর্বমোট বিল (Net Total):</span>
                <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatMoney(total, currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">জমা / পরিশোধ (Paid):</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-28 text-right text-xs font-black py-1 px-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div className="flex justify-between text-xs font-bold pt-1">
                <span className={dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
                  বাকি (Due):
                </span>
                <span className={`tabular-nums ${dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                  {formatMoney(dueAmount, currencySymbol)}
                </span>
              </div>

              {changeAmount > 0 && (
                <div className="flex justify-between text-xs font-bold text-blue-600 dark:text-blue-400 pt-0.5">
                  <span>ফেরত (Change):</span>
                  <span className="tabular-nums">{formatMoney(changeAmount, currencySymbol)}</span>
                </div>
              )}

              {canViewBuyPrice && (
                <div className="flex justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>আনুমানিক নিট লাভ:</span>
                  <span className="tabular-nums">+{formatMoney(estimatedProfit, currencySymbol)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>পরিবর্তন সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
