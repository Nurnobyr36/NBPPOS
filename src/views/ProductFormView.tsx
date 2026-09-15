import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Package,
  Barcode,
  Sparkles,
  DollarSign,
  Boxes,
  Calendar,
  ShieldCheck,
  Building2,
  Layers,
} from 'lucide-react';
import { Product, Supplier, Language } from '../types';
import { generateSku, generateBarcode, formatMoney, translations } from '../utils/formatters';
import { addProduct, updateProduct } from '../services/storage';
import { ImageUploadWidget } from '../components/ImageUploadWidget';

interface ProductFormViewProps {
  initialProduct?: Product | null;
  suppliers?: Supplier[];
  currencySymbol?: string;
  lang: Language;
  onBack: () => void;
  onSaved: (product: Product) => void;
}

export const ProductFormView: React.FC<ProductFormViewProps> = ({
  initialProduct,
  suppliers = [],
  currencySymbol = '৳',
  lang,
  onBack,
  onSaved,
}) => {
  const t = translations[lang];
  const isEditing = Boolean(initialProduct);

  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [barcode, setBarcode] = useState(initialProduct?.barcode || '');
  const [categoryName, setCategoryName] = useState(initialProduct?.categoryName || '');
  const [brandName, setBrandName] = useState(initialProduct?.brandName || '');
  const [unitName, setUnitName] = useState(initialProduct?.unitName || 'pcs');
  const [supplierId, setSupplierId] = useState(initialProduct?.supplierId || '');
  const [imageUrl, setImageUrl] = useState(initialProduct?.imageUrl || '');

  // Pricing
  const [purchasePrice, setPurchasePrice] = useState<number>(initialProduct?.purchasePrice || 0);
  const [salePrice, setSalePrice] = useState<number>(initialProduct?.salePrice || 0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(initialProduct?.wholesalePrice || 0);
  const [specialPrice, setSpecialPrice] = useState<number>(initialProduct?.specialPrice || 0);
  const [minSalePrice, setMinSalePrice] = useState<number>(initialProduct?.minSalePrice || 0);
  const [vatRate, setVatRate] = useState<number>(initialProduct?.vatRate || 0);

  // Stock
  const [currentStock, setCurrentStock] = useState<number>(initialProduct?.currentStock || 0);
  const [minStock, setMinStock] = useState<number>(initialProduct?.minStock || 5);
  const [maxStock, setMaxStock] = useState<number>(initialProduct?.maxStock || 100);
  const [status, setStatus] = useState<'active' | 'inactive'>(initialProduct?.status || 'active');

  // Others
  const [warranty, setWarranty] = useState(initialProduct?.warranty || '');
  const [expiryDate, setExpiryDate] = useState(initialProduct?.expiryDate || '');
  const [description, setDescription] = useState(initialProduct?.description || '');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sku && !isEditing) {
      setSku(generateSku());
    }
  }, [sku, isEditing]);

  const handleGenBarcode = () => {
    setBarcode(generateBarcode());
  };

  const handleGenSku = () => {
    setSku(generateSku());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('পণ্যের নাম অবশ্যই দিতে হবে!');
      return;
    }
    if (!sku.trim()) {
      setErrorMessage('SKU কোড প্রদান করুন!');
      return;
    }
    if (salePrice < 0 || purchasePrice < 0) {
      setErrorMessage('মূল্য ঋণাত্মক হতে পারবে না!');
      return;
    }

    const supplier = suppliers.find((s) => s.id === supplierId);

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      categoryName: categoryName.trim() || 'সাধারণ',
      brandName: brandName.trim(),
      unitName,
      supplierId: supplierId || undefined,
      supplierName: supplier?.name,
      imageUrl,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      specialPrice: Number(specialPrice) || 0,
      minSalePrice: Number(minSalePrice) || 0,
      vatRate: Number(vatRate) || 0,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 5,
      maxStock: Number(maxStock) || 0,
      status,
      warranty: warranty.trim(),
      expiryDate,
      description: description.trim(),
    };

    let result: Product | null = null;
    if (isEditing && initialProduct) {
      result = updateProduct(initialProduct.id, payload);
    } else {
      result = addProduct(payload);
    }

    if (result) {
      onSaved(result);
    } else {
      setErrorMessage('পণ্য সংরক্ষণ করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    }
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
              {isEditing ? 'পণ্য সম্পাদনা (Edit Product)' : 'নতুন পণ্য যোগ করুন (Add Product)'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ImgBB এপিআই বা লিংক দিয়ে ছবি আপলোড ও বিস্তারিত তথ্য পূরণ করুন
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information & ImgBB Image Upload */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <Package className="w-4 h-4 text-emerald-600" />
            সাধারণ তথ্য ও ছবি
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পণ্যের নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: চিনি ১ কেজি, মিনিকেট চাল ইত্যাদি"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            {/* ImgBB Image Upload Widget (Gallery or Link) */}
            <div>
              <ImageUploadWidget
                value={imageUrl}
                onChange={setImageUrl}
                label="পণ্যের ছবি (ImgBB গ্যালারি / লিংক)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* SKU */}
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
                  placeholder="PRD-10293"
                  className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleGenSku}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  অটো কোড
                </button>
              </div>
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বারকোড (Barcode)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="8901234567890"
                  className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleGenBarcode}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                  তৈরি করুন
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিমাপ একক (Unit)
              </label>
              <select
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              >
                <option value="pcs">পিস (pcs)</option>
                <option value="kg">কেজি (kg)</option>
                <option value="gm">গ্রাম (gm)</option>
                <option value="litre">লিটার (litre)</option>
                <option value="pack">প্যাকেট (pack)</option>
                <option value="box">বক্স (box)</option>
                <option value="dozen">ডজন (dozen)</option>
                <option value="bag">বস্তা / ব্যাগ (bag)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                সাপ্লায়ার
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              >
                <option value="">— নির্বাচন করুন —</option>
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.company ? `(${s.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            মূল্য ও লাভ (Pricing)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                কেনা দাম / ক্রয় মূল্য ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full text-xs font-bold text-amber-800 dark:text-amber-300 px-3 py-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বিক্রয় মূল্য ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full text-xs font-bold text-emerald-700 dark:text-emerald-400 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ভ্যাট / VAT (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                placeholder="0"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>
          </div>

          {/* Real-time Profit & Margin Breakdown */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">প্রতি ইউনিটে লাভ বিশ্লেষণ:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">কেনা: {formatMoney(purchasePrice, currencySymbol)}</span>
              <span>→</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">বিক্রয়: {formatMoney(salePrice, currencySymbol)}</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <span className={salePrice >= purchasePrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                একক লাভ: {formatMoney(salePrice - purchasePrice, currencySymbol)}
              </span>
              {purchasePrice > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  {Math.round(((salePrice - purchasePrice) / purchasePrice) * 100)}% মার্জিন
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পাইকারি মূল্য (Wholesale)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                স্পেশাল মূল্য (Special Offer)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={specialPrice}
                onChange={(e) => setSpecialPrice(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                সর্বনিম্ন বিক্রয় মূল্য (Min Price)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minSalePrice}
                onChange={(e) => setMinSalePrice(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Stock Management */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <Boxes className="w-4 h-4 text-emerald-600" />
            স্টক ও সতর্কবার্তা (Stock)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                প্রারম্ভিক / বর্তমান স্টক *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                সর্বনিম্ন সতর্কবার্তা স্টক (Min Alert) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                অবস্থা (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100 font-semibold"
              >
                <option value="active">সক্রিয় (Active)</option>
                <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Other details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            অন্যান্য বিবরণ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ওয়ারেন্টি (যেমন: ১ বছর বা ৬ মাস)
              </label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="যেমন: ১ বছর ওয়ারেন্টি"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মেয়াদ উত্তীর্ণের তারিখ (Expiry Date)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              পণ্যের সংক্ষিপ্ত বিবরণ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="পণ্যটির বিশেষ বৈশিষ্ট্য বা অতিরিক্ত তথ্য..."
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            বাতিল করুন
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'পরিবর্তন সংরক্ষণ করুন' : 'পণ্য সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
