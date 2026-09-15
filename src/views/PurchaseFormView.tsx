import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Product, Supplier, PurchaseItem, Language } from '../types';
import { formatMoney, translations } from '../utils/formatters';
import { createPurchase } from '../services/storage';

interface PurchaseFormViewProps {
  products?: Product[];
  suppliers?: Supplier[];
  currencySymbol?: string;
  lang: Language;
  onBack: () => void;
  onSaved: () => void;
}

export const PurchaseFormView: React.FC<PurchaseFormViewProps> = ({
  products = [],
  suppliers = [],
  currencySymbol = '৳',
  lang,
  onBack,
  onSaved,
}) => {
  const t = translations[lang];

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>(() => [
    {
      productId: products[0]?.id || '',
      name: products[0]?.name || '',
      qty: 10,
      rate: products[0]?.purchasePrice || 100,
      discount: 0,
      lineTotal: (products[0]?.purchasePrice || 100) * 10,
    },
  ]);

  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [error, setError] = useState<string | null>(null);

  // Line item change
  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    setItems((prev) => {
      const next = [...prev];
      const rate = prod.purchasePrice || 0;
      next[index] = {
        ...next[index],
        productId: prod.id,
        name: prod.name,
        rate,
        lineTotal: next[index].qty * rate - next[index].discount,
      };
      return next;
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: 'qty' | 'rate' | 'discount',
    val: number
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: val };
      item.lineTotal = Math.max(0, item.qty * item.rate - item.discount);
      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd?.id || '',
        name: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchasePrice || 0,
        discount: 0,
        lineTotal: defaultProd?.purchasePrice || 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const grandTotal = Math.max(
    0,
    subtotal - overallDiscount + transportCost + otherCost
  );
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('অন্তত একটি পণ্য যোগ করুন');
      return;
    }

    const supplier = suppliers.find((s) => s.id === supplierId);
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const rand = Math.floor(100 + Math.random() * 900);
    const invoiceNo = `PUR-${dateStr}-${rand}`;

    createPurchase({
      invoiceNo,
      supplierId: supplierId || '',
      supplierName: supplier?.name || 'সাধারণ সাপ্লায়ার',
      items,
      subtotal,
      discount: overallDiscount,
      transportCost,
      otherCost,
      total: grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      notes,
    });

    onSaved();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              নতুন ক্রয় চালান (New Purchase)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সাপ্লায়ার থেকে স্টক ক্রয়ের তথ্য ও খরচ সংরক্ষণ করুন
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Supplier & Notes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              সাপ্লায়ার নির্বাচন করুন
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="">— নির্বাচন করুন —</option>
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company ? `(${s.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              নোট বা চালান রেফারেন্স
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: ট্রাক চালান নং ৩৪০১"
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Purchase Line Items Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              ক্রয়কৃত পণ্যের তালিকা
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> আইটেম যোগ করুন
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 px-2 font-semibold">পণ্য</th>
                  <th className="py-2 px-2 font-semibold w-24">পরিমাণ (Qty)</th>
                  <th className="py-2 px-2 font-semibold w-28">দর / Rate</th>
                  <th className="py-2 px-2 font-semibold w-24">ডিসকাউন্ট</th>
                  <th className="py-2 px-2 font-semibold w-28">মোট (Total)</th>
                  <th className="py-2 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        {(products || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemFieldChange(idx, 'qty', Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemFieldChange(idx, 'rate', Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums font-semibold"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        onChange={(e) =>
                          handleItemFieldChange(idx, 'discount', Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2 font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatMoney(item.lineTotal, currencySymbol)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses & Payments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ওভারঅল ডিসকাউন্ট ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিবহন খরচ ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                অন্যান্য খরচ ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={otherCost}
                onChange={(e) => setOtherCost(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পেমেন্ট মেথড
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="cash">নগদ (Cash)</option>
                <option value="bank">ব্যাংক (Bank)</option>
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="card">কার্ড (Card)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিশোধিত পরিমাণ ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold tabular-nums"
              />
            </div>
          </div>

          {/* Grand Totals Box */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>আইটেম সাবটোটাল:</span>
              <span className="tabular-nums font-semibold">
                {formatMoney(subtotal, currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-200 border-t border-emerald-200 dark:border-emerald-800 pt-1.5">
              <span>সর্বমোট চালান মূল্য:</span>
              <span className="tabular-nums">{formatMoney(grandTotal, currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-1">
              <span>বকেয়া দেনা থাকবে:</span>
              <span className="tabular-nums">{formatMoney(dueAmount, currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            বাতিল
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ক্রয় চালান সংরক্ষণ করুন</span>
          </button>
        </div>
      </form>
    </div>
  );
};
