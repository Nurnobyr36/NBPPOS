import React, { useState } from 'react';
import {
  Settings,
  Save,
  Key,
  Store,
  RotateCcw,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  Users,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { ShopSettings, Language } from '../types';
import {
  saveShopSettings,
  resetToDemoData,
  clearAllData,
  getProducts,
  getSales,
  getCustomers,
  getSuppliers,
} from '../services/storage';
import { clearAllFirestoreMockData } from '../services/firebase';
import { DEFAULT_IMGBB_KEY } from '../services/imgbb';
import { ImageUploadWidget } from '../components/ImageUploadWidget';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  settings: ShopSettings;
  lang: Language;
  onSaved: (updated: ShopSettings) => void;
  onResetDemo: () => void;
  onOpenStaffManagement?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  lang,
  onSaved,
  onResetDemo,
  onOpenStaffManagement,
}) => {
  const { canManageStaff, staffAccounts, currentUser, userProfile } = useAuth();
  const [shopName, setShopName] = useState(settings.shopName || '');
  const [tagline, setTagline] = useState(settings.tagline || '');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [email, setEmail] = useState(settings.email || '');
  const [address, setAddress] = useState(settings.address || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '৳');
  const [defaultVatRate, setDefaultVatRate] = useState<number>(settings.defaultVatRate || 0);
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoiceFooter || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [imgbbApiKey, setImgbbApiKey] = useState(settings.imgbbApiKey || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: ShopSettings = {
      shopName: shopName.trim(),
      tagline: tagline.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      currencySymbol: currencySymbol.trim() || '৳',
      defaultVatRate: Number(defaultVatRate) || 0,
      invoiceFooter: invoiceFooter.trim(),
      logoUrl,
      imgbbApiKey: imgbbApiKey.trim(),
    };

    saveShopSettings(updated);
    onSaved(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const data = {
      settings,
      products: getProducts(),
      sales: getSales(),
      customers: getCustomers(),
      suppliers: getSuppliers(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartshop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [clearedMockSuccess, setClearedMockSuccess] = useState(false);

  const handleClearAllMockData = async () => {
    if (
      confirm(
        'সতর্কতা: আপনি কি নিশ্চিত যে সমস্ত মক/টেস্ট ডাটা সম্পূর্ণ মুছে ফেলতে চান? এটি লোকালস্টোরেজ এবং ফায়ারবেস ক্লাউড ডাটাবেস উভয় স্থান থেকেই সমস্ত মক ডাটা মুছে ফেলবে।'
      )
    ) {
      clearAllData();
      await clearAllFirestoreMockData();
      onResetDemo();
      setClearedMockSuccess(true);
      setTimeout(() => setClearedMockSuccess(false), 4000);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'আপনি কি নিশ্চিত যে ডেমো ডেটা রিসেট করতে চান? আপনার বর্তমান টেস্ট ডাটা পূর্বাবস্থায় ফিরে আসবে।'
      )
    ) {
      resetToDemoData();
      onResetDemo();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            দোকান ও সিস্টেম সেটিংস
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            দোকানের নাম, ঠিকানা, ImgBB API কি এবং ইনভয়েস সেটিংস পরিচালনা করুন
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>সেটিংস সফলভাবে সংরক্ষিত হয়েছে!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Shop Info Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <Store className="w-4 h-4 text-emerald-600" />
            দোকানের পরিচিতি ও ইনভয়েস তথ্য
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                দোকানের নাম *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                স্লোগান / ট্যাগলাইন
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="যেমন: ন্যায্য মূল্যে সেরা পণ্যের প্রতিশ্রুতি"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মালিকের নাম
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মোবাইল নম্বর (ইনভয়েসে প্রদর্শিত)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ইমেইল
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মুদ্রার প্রতীক (Currency Symbol)
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="৳"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              দোকানের সম্পূর্ণ ঠিকানা
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ইনভয়েস ফুটার বার্তা
            </label>
            <textarea
              rows={2}
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Shop Logo Widget */}
          <div>
            <ImageUploadWidget
              value={logoUrl}
              onChange={setLogoUrl}
              label="দোকানের লোগো (ImgBB গ্যালারি / লিংক)"
            />
          </div>
        </div>

        {/* ImgBB API Configuration Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              ImgBB API ইমেজ হোস্টিং কনফিগারেশন
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {imgbbApiKey.trim() ? 'কাস্টম API সক্রিয়' : 'ডিফল্ট ফ্রি API সক্রিয়'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            ImgBB এপিআই-এর মাধ্যমে আপনার সকল পণ্যের ছবি সরাসরি ক্লাউডে সংরক্ষিত থাকে এবং লাইভ ইউআরএল তৈরি হয়। আপনি চাইলে নিজের ফ্রি API Key এখানে সেট করতে পারেন।
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              আপনার ImgBB API Key:
            </label>
            <input
              type="text"
              value={imgbbApiKey}
              onChange={(e) => setImgbbApiKey(e.target.value)}
              placeholder={`ডিফল্ট কী: ${DEFAULT_IMGBB_KEY}`}
              className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>

          <a
            href="https://api.imgbb.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            বিনামূল্যে নিজের ImgBB API Key পেতে ক্লিক করুন
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Staff Management Section for Designated Admins */}
        {canManageStaff && (
          <div className="bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-100 dark:border-emerald-900/60 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                স্টাফ আইডি ও বিক্রয়কর্মী পরিচালনা (Staff Management)
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
                মোট স্টাফ: {staffAccounts.length} জন
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              অনুমোদিত এডমিন হিসেবে আপনি ক্যাশিয়ার ও বিক্রয়কর্মীদের জন্য নতুন স্টাফ আইডি ও পিন কোড তৈরি করতে পারবেন। স্টাফরা তাদের আইডি ও পিন দিয়ে POS-এ বিক্রি করতে পারবে, তবে <strong>পণ্যের কেনা দাম (ক্রয় মূল্য) এবং আর্থিক লাভ কখনো দেখতে পাবে না</strong>।
            </p>

            <div className="pt-1">
              <button
                type="button"
                id="settings-open-staff-modal-btn"
                onClick={onOpenStaffManagement}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>স্টাফ আইডি তৈরি ও পরিচালনা উইন্ডো খুলুন</span>
              </button>
            </div>
          </div>
        )}

        {/* Backup & Demo Reset */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <Download className="w-4 h-4 text-emerald-600" />
            ডেটা ব্যাকআপ ও রিসেট
          </h3>

          {clearedMockSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>সমস্ত মক ডাটা লোকালস্টোরেজ এবং ফায়ারবেস ক্লাউড ডাটাবেস থেকে সফলভাবে মুছে ফেলা হয়েছে।</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>সম্পূর্ণ ডেটা ব্যাকআপ ডাউনলোড (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllMockData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="সকল মক ডাটা মুছে নতুনভাবে শুরু করুন"
            >
              <Trash2 className="w-4 h-4" />
              <span>সমস্ত মক ডাটা চিরতরে মুছুন</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ডেমো ডাটা পুনঃস্থাপন</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>সেটিংস সংরক্ষণ করুন</span>
          </button>
        </div>
      </form>
    </div>
  );
};
