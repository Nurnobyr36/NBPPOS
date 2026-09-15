import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  PlusCircle,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Product, Customer, Sale, SaleItem, Language } from '../types';
import { formatMoney, generateInvoiceNo, translations } from '../utils/formatters';
import { createSale, addCustomer } from '../services/storage';

interface PosViewProps {
  products?: Product[];
  customers?: Customer[];
  currencySymbol?: string;
  defaultVatRate?: number;
  lang: Language;
  onSaleComplete?: (newSale: Sale) => void;
  onCheckoutComplete?: (newSale: Sale) => void;
  onRefreshData?: () => void;
  onOpenProductForm?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products = [],
  customers = [],
  currencySymbol = '৳',
  defaultVatRate = 0,
  lang,
  onSaleComplete,
  onCheckoutComplete,
  onRefreshData,
  onOpenProductForm,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'card'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Inline New Customer Modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'inactive') return false;
      const matchesCat =
        selectedCategory === 'all' || p.categoryName === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Handle Barcode Scan or Enter
  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchTerm.trim();
      if (!code) return;

      const matched = products.find(
        (p) =>
          p.status === 'active' &&
          (p.barcode === code || p.sku.toLowerCase() === code.toLowerCase())
      );

      if (matched) {
        addToCart(matched);
        setSearchTerm('');
      }
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    if ((product.currentStock || 0) <= 0) {
      alert('দুঃখিত, এই পণ্যটির পর্যাপ্ত স্টক নেই!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.currentStock) {
          alert('স্টকের চেয়ে বেশি পণ্য কার্টে যোগ করা সম্ভব নয়!');
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                lineTotal: (item.qty + 1) * item.rate - item.discount,
              }
            : item
        );
      } else {
        const rate = product.salePrice || 0;
        const newItem: SaleItem = {
          productId: product.id,
          name: product.name,
          qty: 1,
          rate,
          purchasePrice: product.purchasePrice || 0,
          discount: 0,
          vatRate: product.vatRate ?? defaultVatRate,
          lineTotal: rate,
          imageUrl: product.imageUrl,
        };
        return [...prev, newItem];
      }
    });
  };

  // Update Cart Item Quantity
  const updateQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.currentStock : 999;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.qty + delta;
            if (nextQty <= 0) return null;
            if (nextQty > maxStock) {
              alert(`সর্বোচ্চ স্টক উপলব্ধ: ${maxStock}`);
              return item;
            }
            return {
              ...item,
              qty: nextQty,
              lineTotal: nextQty * item.rate - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('আপনি কি নিশ্চিত যে কার্টের সব পণ্য মুছে ফেলতে চান?')) {
      setCart([]);
      setInvoiceDiscount(0);
    }
  };

  // Totals calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const vatTotal = cart.reduce(
    (sum, item) => sum + item.lineTotal * ((item.vatRate || 0) / 100),
    0
  );
  const grandTotal = Math.max(0, subtotal - invoiceDiscount + vatTotal);

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaidAmountInput(grandTotal.toString());
    setCheckoutError(null);
    setIsCheckoutOpen(true);
  };

  // Complete Sale
  const handleConfirmSale = () => {
    const paid = Number(paidAmountInput) || 0;
    const due = Math.max(0, grandTotal - paid);
    const change = Math.max(0, paid - grandTotal);

    if (due > 0 && !selectedCustomerId) {
      setCheckoutError(
        'বাকি রাখার জন্য অনুগ্রহ করে কাস্টমার নির্বাচন করুন অথবা নতুন কাস্টমার যোগ করুন।'
      );
      return;
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const customerName = selectedCust
      ? selectedCust.name
      : 'Walk-in Customer (সাধারণ ক্রেতা)';

    const totalCost = cart.reduce(
      (sum, it) => sum + (it.purchasePrice || 0) * it.qty,
      0
    );
    const profit = Math.max(0, grandTotal - totalCost);

    const newSale = createSale({
      invoiceNo: generateInvoiceNo(),
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone: selectedCust?.phone,
      items: cart,
      subtotal,
      invoiceDiscount,
      vatTotal,
      total: grandTotal,
      paidAmount: Math.min(paid, grandTotal),
      dueAmount: due,
      changeAmount: change,
      profit,
      payments: [{ method: paymentMethod, amount: Math.min(paid, grandTotal) }],
      notes,
      status: 'posted',
      cashierName: 'সুপার এডমিন',
    });

    onRefreshData?.();
    setIsCheckoutOpen(false);
    setCart([]);
    setInvoiceDiscount(0);
    setNotes('');
    if (onSaleComplete) {
      onSaleComplete(newSale);
    } else if (onCheckoutComplete) {
      onCheckoutComplete(newSale);
    }
  };

  // Inline Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      currentDue: 0,
    });

    onRefreshData?.();
    setSelectedCustomerId(created.id);
    setIsNewCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4">
      {/* LEFT: Product Catalog & Scanner */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
        {/* Search Bar with Barcode Scanner Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              placeholder="🔍 বারকোড স্ক্যান করুন বা পণ্যের নাম / SKU দিয়ে খুঁজুন..."
              className="w-full text-xs pl-9 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <Barcode className="w-3 h-3" /> স্ক্যানার
            </span>
          </div>
          {onOpenProductForm && (
            <button
              type="button"
              onClick={onOpenProductForm}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              title="নতুন পণ্য যোগ করুন"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">নতুন পণ্য</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            সব ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
          {filteredProducts.map((p) => {
            const isOutOfStock = (p.currentStock || 0) <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => !isOutOfStock && addToCart(p)}
                disabled={isOutOfStock}
                className={`group flex flex-col text-left p-2.5 rounded-xl border transition-all duration-150 relative ${
                  isOutOfStock
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                }`}
              >
                {/* Product Image */}
                <div className="w-full aspect-square rounded-lg bg-slate-100 dark:bg-slate-700/60 overflow-hidden mb-2 relative flex items-center justify-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://placehold.co/200x200?text=No+Img';
                      }}
                    />
                  ) : (
                    <Package className="w-8 h-8 text-slate-400" />
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center p-1">
                      <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded">
                        স্টক নেই
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2rem]">
                  {p.name}
                </h4>
                <div className="mt-auto pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatMoney(p.salePrice, currencySymbol)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        p.currentStock <= p.minStock
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {p.currentStock} {p.unitName}
                    </span>
                  </div>
                  {p.purchasePrice !== undefined && (
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium mt-0.5 text-left">
                      কেনা: {formatMoney(p.purchasePrice, currencySymbol)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Live POS Cart & Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm shrink-0">
        {/* Customer Selector Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <User className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="text-xs py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="">সাধারণ ক্রেতা (Walk-in Customer)</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - বাকি:{' '}
                    {formatMoney(c.currentDue, currencySymbol)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded-lg cursor-pointer"
              title="নতুন কাস্টমার যোগ করুন"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-800/80">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Barcode className="w-10 h-10 mb-2 stroke-1 opacity-60" />
              <p className="text-xs font-semibold">{t.cart_empty}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                বামে পণ্যে ক্লিক করুন বা বারকোড স্ক্যান করুন
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatMoney(item.rate, currencySymbol)} × {item.qty} ={' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatMoney(item.lineTotal, currencySymbol)}
                    </span>
                  </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-b-2xl space-y-2">
          {/* Invoice Discount Input */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">ইনভয়েস ডিসকাউন্ট:</span>
            <div className="flex items-center gap-1 w-28">
              <span className="text-slate-400 text-xs">{currencySymbol}</span>
              <input
                type="number"
                min="0"
                value={invoiceDiscount || ''}
                onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full text-xs text-right py-1 px-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.subtotal}:</span>
            <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {formatMoney(subtotal, currencySymbol)}
            </span>
          </div>

          {vatTotal > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t.vat}:</span>
              <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                {formatMoney(vatTotal, currencySymbol)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {t.total}:
            </span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatMoney(grandTotal, currencySymbol)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-2.5 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              মুছে ফেলুন
            </button>
            <button
              type="button"
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
              className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-800/20 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <span>পেমেন্ট ও বিক্রয় সম্পন্ন করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              পেমেন্ট গ্রহণ ও বিক্রয় সম্পন্ন
            </h3>

            {/* Total Display */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 mb-4 text-center">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                সর্বমোট প্রদেয় বিল
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
                {formatMoney(grandTotal, currencySymbol)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 mb-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                পেমেন্ট মাধ্যম (Payment Method):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'নগদ (Cash)', icon: Banknote },
                  { id: 'bkash', label: 'বিকাশ', icon: Smartphone },
                  { id: 'nagad', label: 'নগদ', icon: Smartphone },
                  { id: 'rocket', label: 'রকেট', icon: Smartphone },
                  { id: 'bank', label: 'ব্যাংক', icon: CreditCard },
                  { id: 'card', label: 'কার্ড', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paid Amount Input */}
            <div className="space-y-1 mb-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                পরিশোধিত পরিমাণ ({currencySymbol}):
              </label>
              <input
                type="number"
                step="0.01"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                className="w-full text-base font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            {/* Due & Change Calculation Box */}
            {(() => {
              const paid = Number(paidAmountInput) || 0;
              const due = Math.max(0, grandTotal - paid);
              const change = Math.max(0, paid - grandTotal);
              return (
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 mb-4 space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">বকেয়া (Due):</span>
                    <span
                      className={`font-bold tabular-nums ${
                        due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      {formatMoney(due, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">ফেরত (Change):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(change, currencySymbol)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {checkoutError && (
              <div className="p-2 mb-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all cursor-pointer"
              >
                বিক্রয় কনফার্ম করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK INLINE CUSTOMER MODAL */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              নতুন কাস্টমার যোগ করুন
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                কাস্টমারের নাম *
              </label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="যেমন: জামাল উদ্দিন"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="tel"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="01712-XXXXXX"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ঠিকানা
              </label>
              <input
                type="text"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="এলাকা বা ঠিকানা"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
              >
                সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
