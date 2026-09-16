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
  ShieldCheck,
  Lock,
  LogIn,
  KeyRound,
  ShoppingCart,
  PackageSearch,
  Tag,
  LayoutGrid,
} from 'lucide-react';
import { Product, Customer, Sale, SaleItem, Language } from '../types';
import { formatMoney, generateInvoiceNo, translations } from '../utils/formatters';
import { createSale, addCustomer } from '../services/storage';
import { useAuth } from '../context/AuthContext';

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
  onOpenAuthModal?: () => void;
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
  onOpenAuthModal,
}) => {
  const t = translations[lang];
  const { sellerName, currentUser, userProfile, isPOSAuthorized, loading: authLoading, canViewBuyPrice } = useAuth();

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
    const profit = Math.round(grandTotal - totalCost);

    const effectiveSellerName = sellerName || 'ক্যাশিয়ার';
    const effectiveSellerId = currentUser?.uid || userProfile?.uid || undefined;
    const effectiveSellerEmail = currentUser?.email || userProfile?.email || undefined;

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
      cashierName: effectiveSellerName,
      sellerName: effectiveSellerName,
      sellerId: effectiveSellerId,
      sellerEmail: effectiveSellerEmail,
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

  // RESTRICTION: লগিন ছাড়া পস দেখা যাবে না
  if (!isPOSAuthorized && !authLoading) {
    return (
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-3xl max-w-lg w-full p-8 text-center shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 mb-3">
            <KeyRound className="w-3.5 h-3.5" />
            লগইন প্রয়োজন
          </span>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            লগইন ছাড়া পিওএস (POS) টার্মিনাল দেখা যাবে না
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            নিরাপত্তা ও ইনভয়েস ট্র্যাকিং নিশ্চিত করতে ক্যাশিয়ার বা বিক্রেতাকে অবশ্যই আগে লগইন করতে হবে। লগইন করলে বিক্রয় রশিদ ও ইনভয়েসে স্বয়ংক্রিয়ভাবে বিক্রেতার নাম সংরক্ষিত থাকবে।
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="pos-login-required-btn"
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-800/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন / বিক্রেতা নির্বাচন করুন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Category Filter Chips & Count Toolbar */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              সব পণ্য ({products.length})
            </button>
            {categories.map((cat) => {
              const countInCat = products.filter((p) => p.categoryName === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat} ({countInCat})
                </button>
              );
            })}
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium shrink-0">
            {filteredProducts.length} টি পণ্য
          </span>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
              <PackageSearch className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              কোনো পণ্য পাওয়া যায়নি
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mb-3.5">
              অনুগ্রহ করে ভিন্ন নাম বা বারকোড দিয়ে খুঁজুন অথবা ক্যাটাগরি পরিবর্তন করুন।
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl transition-colors cursor-pointer"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5 p-1">
            {filteredProducts.map((p) => {
              const isOutOfStock = (p.currentStock || 0) <= 0;
              const isLowStock = !isOutOfStock && (p.currentStock || 0) <= (p.minStock || 5);
              const cartItem = cart.find((c) => c.productId === p.id);
              const inCartQty = cartItem ? cartItem.qty : 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isOutOfStock && addToCart(p)}
                  disabled={isOutOfStock}
                  className={`group relative flex flex-col text-left p-3 rounded-2xl border transition-all duration-200 ${
                    isOutOfStock
                      ? 'opacity-55 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                      : inCartQty > 0
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-400 dark:border-emerald-600/60 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98]'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-500/80 hover:shadow-md dark:hover:shadow-emerald-950/20 cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  {/* Image Container with Floating Badges */}
                  <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-700/60 overflow-hidden mb-2.5 relative flex items-center justify-center">
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
                      <Package className="w-9 h-9 text-slate-300 dark:text-slate-600" />
                    )}

                    {/* Category pill on top-left */}
                    {p.categoryName && (
                      <span className="absolute top-2 left-2 max-w-[90px] truncate text-[10px] font-medium bg-slate-900/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-md shadow-xs">
                        {p.categoryName}
                      </span>
                    )}

                    {/* Cart badge or Out of stock badge on top-right */}
                    {inCartQty > 0 ? (
                      <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 ring-2 ring-white dark:ring-slate-800 animate-in zoom-in-75 duration-150">
                        <CheckCircle2 className="w-3 h-3" />
                        {inCartQty}টি কার্টে
                      </span>
                    ) : isOutOfStock ? (
                      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[1px] flex items-center justify-center p-1">
                        <span className="text-[11px] font-bold text-white bg-rose-600 px-2.5 py-1 rounded-full shadow-sm">
                          স্টক শেষ
                        </span>
                      </div>
                    ) : isLowStock ? (
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        কম স্টক
                      </span>
                    ) : null}
                  </div>

                  {/* Product Details */}
                  <h4 className="font-bold text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors min-h-[2.2rem]">
                    {p.name}
                  </h4>

                  {/* SKU & Stock Row */}
                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-400">
                    <span className="font-mono text-[10px] truncate max-w-[90px]">{p.sku}</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        isLowStock
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      মজুদ: {p.currentStock || 0} {p.unitName}
                    </span>
                  </div>

                  {/* Bottom: Price & Quick Add Button */}
                  <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatMoney(p.salePrice, currencySymbol)}
                      </span>
                      {canViewBuyPrice && p.purchasePrice !== undefined && (
                        <div className="text-[10px] text-amber-700/90 dark:text-amber-400/90 font-medium">
                          কেনা: {formatMoney(p.purchasePrice, currencySymbol)}
                        </div>
                      )}
                    </div>

                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all duration-150 shadow-2xs ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                          : inCartQty > 0
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Live POS Cart & Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm shrink-0">
        {/* Active Cashier Row */}
        <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between text-xs rounded-t-2xl">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">বিক্রেতা:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{sellerName}</span>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              বদল / লগইন
            </button>
          )}
        </div>

        {/* Customer Selector Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
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
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              পেমেন্ট গ্রহণ ও বিক্রয় সম্পন্ন
            </h3>

            {/* Seller Tag Indicator */}
            <div className="flex items-center justify-between px-3 py-1.5 mb-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-500">বিক্রেতা:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{sellerName}</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ইনভয়েসে প্রিন্ট হবে
              </span>
            </div>

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
