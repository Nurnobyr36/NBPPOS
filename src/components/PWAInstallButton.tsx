import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Apple, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone app mode
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      // Show guided install modal (iOS Safari or desktop browser guidance)
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Button Render according to variant */}
      {variant === 'compact' && (
        <button
          id="pwa-install-btn-topbar"
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs transition-all active:scale-95 ${className}`}
          title="পিওএস অ্যাপ ইনস্টল করুন (Install PWA App)"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span className="hidden sm:inline">অ্যাপ ইনস্টল</span>
          <span className="sm:hidden">ইনস্টল</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          id="pwa-install-btn-sidebar"
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60 transition-all ${className}`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-300" />
            <div className="text-left">
              <div className="font-bold text-white">অ্যাপ ইনস্টল করুন</div>
              <div className="text-[10px] text-emerald-300">মোবাইল বা পিসিতে ইনস্টল</div>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded-md font-mono">PWA</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          id="pwa-install-btn-full"
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>স্মার্টশপ পিওএস অ্যাপ ইনস্টল করুন (PWA)</span>
        </button>
      )}

      {variant === 'banner' && (
        <div
          id="pwa-install-banner"
          className="p-3 bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-emerald-950 text-white rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-100">SmartShop POS ইনস্টল করুন</div>
              <div className="text-xs text-emerald-300/90">
                এক ক্লিকেই ডেস্কটপ বা মোবাইলে কোনো ইন্টারনেট ব্রাউজার বার ছাড়া ফুলস্ক্রিন ব্যবহার করুন
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all text-center shrink-0"
          >
            এখনই ইনস্টল করুন
          </button>
        </div>
      )}

      {/* Success Toast */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>স্মার্টশপ POS অ্যাপ সফলভাবে ইনস্টল হয়েছে!</span>
        </div>
      )}

      {/* Guided Installation Modal (for iOS or Desktop when prompt isn't fired yet) */}
      {showGuideModal && (
        <div
          id="pwa-install-guide-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img src="/icon.svg" alt="SmartShop POS" className="w-12 h-12 rounded-xl shadow-sm" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  স্মার্টশপ পিওএস অ্যাপ ইনস্টলেশন
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  মোবাইল ও পিসিতে দ্রুত ও অফলাইনে ব্যবহারের উপায়
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Apple className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                  <span>iPhone / iPad এ ইনস্টল করার নিয়ম:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    সাফারি (Safari) ব্রাউজারের নিচে <strong>শেয়ার (Share)</strong> আইকনে ট্যাপ করুন।
                  </li>
                  <li>
                    নিচে স্ক্রোল করে <strong>'Add to Home Screen' (+ হোম স্ক্রিনে যোগ করুন)</strong> চাপুন।
                  </li>
                  <li>উপরে ডানে <strong>'Add'</strong> বাটনে ট্যাপ করলেই হোম স্ক্রিনে অ্যাপ আইকন চলে আসবে।</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Android বা Chrome / Edge ব্রাউজারে ইনস্টল:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    ব্রাউজারের এড্রেস বারের ডানে <strong>ইনস্টল (Install / ⊕)</strong> আইকনে ক্লিক করুন।
                  </li>
                  <li>
                    অথবা ব্রাউজারের ৩ ডট মেনু (⋮) থেকে <strong>'Install SmartShop POS'</strong> বা <strong>'Add to Home screen'</strong> সিলেক্ট করুন।
                  </li>
                  <li>
                    ইনস্টল হয়ে গেলে এটি সরাসরি আপনার কম্পিউটার বা মোবাইলে আলাদা অ্যাপ হিসেবে ওপেন হবে।
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              বুঝেছি, বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </>
  );
};
