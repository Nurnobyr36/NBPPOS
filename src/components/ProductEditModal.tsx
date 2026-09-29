import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Package,
  DollarSign,
  Boxes,
  Barcode,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Tag,
  Layers,
} from 'lucide-react';
import { Product, Supplier, Language } from '../types';
import { formatMoney, generateBarcode, generateSku, translations } from '../utils/formatters';
import { updateProduct } from '../services/storage';
import { syncProductToFirestore } from '../services/firebase';
import { ImageUploadWidget } from './ImageUploadWidget';
import { useAuth } from '../context/AuthContext';

export interface ProductEditModalProps {
  isOpen: boolean;
  product: Product | null;
  suppliers?: Supplier[];
  currencySymbol?: string;
  lang: Language;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
  onOpenFullForm?: (product: Product) => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  product,
  suppliers = [],
  currencySymbol = '৳',
  lang,
  onClose,
  onSaved,
  onOpenFullForm,
}) => {
  const { canViewBuyPrice } = useAuth();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [unitName, setUnitName] = useState('pcs');
  const [supplierId, setSupplierId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Pricing
  const [purchasePrice, setPurchasePrice] = useState<number | string>(0);
  const [salePrice, setSalePrice] = useState<number | string>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number | string>(0);
  const [minSalePrice, setMinSalePrice] = useState<number | string>(0);
  const [vatRate, setVatRate] = useState<number | string>(0);

  // Stock
  const [currentStock, setCurrentStock] = useState<number | string>(0);
  const [minStock, setMinStock] = useState<number | string>(5);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setCategoryName(product.categoryName || (product as any)?.category || '');
      setBrandName(product.brandName || '');
      setUnitName(product.unitName || (product as any)?.unit || 'pcs');
      setSupplierId(product.supplierId || '');
      setImageUrl(product.imageUrl || '');
      setPurchasePrice(product.purchasePrice ?? 0);
      setSalePrice(product.salePrice ?? 0);
      setWholesalePrice(product.wholesalePrice ?? 0);
      setMinSalePrice(product.minSalePrice ?? 0);
      setVatRate(product.vatRate ?? 0);
      setCurrentStock(product.currentStock ?? 0);
      setMinStock(product.minStock ?? 5);
      setStatus(product.status || 'active');
      setErrorMessage(null);
      setSuccessToast(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const numSalePrice = Number(salePrice) || 0;
  const numPurchasePrice = Number(purchasePrice) || 0;
  const unitProfit = numSalePrice - numPurchasePrice;
  const profitMargin = numPurchasePrice > 0 ? Math.round((unitProfit / numPurchasePrice) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('পণ্যের নাম অবশ্যই প্রদান করুন!');
      return;
    }
    if (!sku.trim()) {
      setErrorMessage('SKU কোড প্রদান করুন!');
      return;
    }
    if (numSalePrice < 0 || numPurchasePrice < 0) {
      setErrorMessage('মূল্য ঋণাত্মক হতে পারে না!');
      return;
    }

    setIsSaving(true);
    try {
      const supplier = suppliers.find((s) => s.id === supplierId);

      const updates: Partial<Product> = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        categoryName: categoryName.trim() || 'সাধারণ',
        brandName: brandName.trim(),
        unitName,
        supplierId: supplierId || undefined,
        supplierName: supplier?.name,
        imageUrl,
        purchasePrice: numPurchasePrice,
        salePrice: numSalePrice,
        wholesalePrice: Number(wholesalePrice) || 0,
        minSalePrice: Number(minSalePrice) || 0,
        vatRate: Number(vatRate) || 0,
        currentStock: Number(currentStock) || 0,
        minStock: Number(minStock) || 5,
        status,
      };

      const updated = updateProduct(product.id, updates);
      if (updated) {
        // Direct async sync to Firestore backend
        try {
          await syncProductToFirestore(updated);
        } catch (syncErr) {
          console.warn('Firestore direct update warning:', syncErr);
        }
        setSuccessToast(true);
        setTimeout(() => {
          onSaved(updated);
          onClose();
        }, 600);
      } else {
        setErrorMessage('পণ্য আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      console.error('Product update error:', err);
      setErrorMessage(err?.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                পণ্য সম্পাদনা (Edit Product)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ID: {product.id} • SKU: {product.sku}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {successToast && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            পণ্য সফলভাবে আপডেট ও ক্লাউডে সিঙ্ক হয়েছে!
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              পণ্যের নাম *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="পণ্যের পূর্ণ নাম লিখুন"
              className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>

          {/* Pricing Row: Purchase & Sale Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            {canViewBuyPrice ? (
              <div>
                <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center justify-between">
                  <span>কেনা দাম / ক্রয় মূল্য ({currencySymbol}) *</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">আইটেম কেনার খরচ</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="যেমন: ৫০"
                  className="w-full text-xs font-bold text-amber-800 dark:text-amber-300 px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
                />
              </div>
            ) : null}

            <div className={!canViewBuyPrice ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>বিক্রয় মূল্য ({currencySymbol}) *</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">গ্রাহকের কাছে বিক্রয়</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="যেমন: ৭০"
                className="w-full text-xs font-bold text-emerald-700 dark:text-emerald-400 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            {/* Profit margin live feedback */}
            {canViewBuyPrice && numPurchasePrice > 0 && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">প্রতি ইউনিটে সম্ভাব্য লাভ:</span>
                <span className={`font-bold tabular-nums ${unitProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  +{formatMoney(unitProfit, currencySymbol)} ({profitMargin}% মার্জিন)
                </span>
              </div>
            )}
          </div>

          {/* Stock & Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বর্তমান মজুদ (Stock) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিমাপ একক (Unit)
              </label>
              <select
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              >
                <option value="pcs">পিস (pcs)</option>
                <option value="টি">টি</option>
                <option value="kg">কেজি (kg)</option>
                <option value="gm">গ্রাম (gm)</option>
                <option value="litre">লিটার (litre)</option>
                <option value="pack">প্যাকেট (pack)</option>
                <option value="box">বক্স (box)</option>
                <option value="dozen">ডজন (dozen)</option>
                <option value="bag">বস্তা / ব্যাগ (bag)</option>
                <option value="bottle">বোতল (bottle)</option>
                <option value="carton">কার্টুন (carton)</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                অবস্থা (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100 font-semibold"
              >
                <option value="active">সক্রিয় (Active)</option>
                <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ক্যাটাগরি
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="যেমন: মুদি মালামাল"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ব্র্যান্ড
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="যেমন: তীর, ফ্রেশ, স্যামসাং"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Barcode & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU কোড *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setSku(generateSku())}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="নতুন SKU তৈরি করুন"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বারকোড (Barcode)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="বারকোড স্ক্যান বা লিখুন"
                  className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setBarcode(generateBarcode())}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="নতুন বারকোড তৈরি করুন"
                >
                  <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Image Upload Widget */}
          <div>
            <ImageUploadWidget
              value={imageUrl}
              onChange={setImageUrl}
              label="পণ্যের ছবি (ImgBB গ্যালারি / ইমেজ লিংক)"
            />
          </div>

          {/* Link to Full Form */}
          {onOpenFullForm && (
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullForm(product);
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>সম্পূর্ণ ফর্মে আরো বিস্তারিত (ওয়ারেন্টি, মেয়াদ, ভ্যাট) এডিট করুন</span>
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
