import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Link as LinkIcon,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Key,
  ExternalLink,
} from 'lucide-react';
import { uploadToImgBB, isValidImageUrl } from '../services/imgbb';
import { getShopSettings } from '../services/storage';

interface ImageUploadWidgetProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  compact?: boolean;
}

export const ImageUploadWidget: React.FC<ImageUploadWidgetProps> = ({
  value = '',
  onChange,
  label = 'পণ্যের ছবি (ImgBB)',
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'camera'>('upload');
  const [linkInput, setLinkInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKey, setCustomKey] = useState(() => getShopSettings().imgbbApiKey || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate size (limit 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'ছবির সাইজ ১৫ মেগাবাইটের বেশি হতে পারবে না।' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setStatusMessage(null);

    try {
      const apiKey = customKey || getShopSettings().imgbbApiKey;
      const result = await uploadToImgBB(file, apiKey, (percent) => {
        setUploadProgress(percent);
      });

      if (result.success && result.url) {
        onChange(result.url);
        setStatusMessage({
          type: 'success',
          text: result.error ? result.error : 'ছবি ImgBB তে সফলভাবে আপলোড হয়েছে!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'আপলোড ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।',
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'আপলোড ত্রুটি ঘটেছে',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleLinkSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkInput.trim()) return;

    if (!isValidImageUrl(linkInput.trim())) {
      setStatusMessage({
        type: 'error',
        text: 'অনুগ্রহ করে একটি সঠিক ছবির লিংক (https://...) প্রদান করুন।',
      });
      return;
    }

    onChange(linkInput.trim());
    setStatusMessage({ type: 'success', text: 'ছবির লিংক সফলভাবে যুক্ত করা হয়েছে!' });
    setLinkInput('');
  };

  const handleClear = () => {
    onChange('');
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
        >
          <Key className="w-3 h-3" />
          ImgBB API কি
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 transition-all">
        {/* Current Image Preview Bar */}
        {value ? (
          <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-3 shadow-xs">
            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-600">
              <img
                src={value}
                alt="Product Preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/100x100?text=Invalid+Image';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ছবি যুক্ত আছে
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={value}>
                {value}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
              title="ছবি মুছে ফেলুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* Upload Mode Switcher Tabs */}
        <div className="flex gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg mb-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            গ্যালারি / ডিভাইস
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('link');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            সরাসরি লিংক (URL)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            ক্যামেরা
          </button>
        </div>

        {/* Tab 1: File / Gallery Upload */}
        {activeTab === 'upload' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileUpload(f);
              }}
              className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                isUploading
                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/70 dark:bg-slate-800/50'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    ImgBB তে আপলোড হচ্ছে ({uploadProgress}%)...
                  </p>
                  <div className="w-48 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    কম্পিউটার বা মোবাইল গ্যালারি থেকে ছবি আপলোড করুন
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ক্লিক করুন অথবা ছবি টেনে এনে এখানে ছাড়ুন (JPG, PNG, WebP)
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-medium">
                    📁 গ্যালারি ব্রাউজ করুন
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Direct Image URL */}
        {activeTab === 'link' && (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLinkSubmit();
                  }
                }}
                placeholder="https://example.com/product-image.jpg"
                className="w-full text-xs px-3 py-2.5 pr-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleLinkSubmit}
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-md cursor-pointer"
              >
                যুক্ত করুন
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ইন্টারনেট বা অন্য কোনো সাইটের সরাসরি ছবির লিংক পেস্ট করুন।
            </p>
          </div>
        )}

        {/* Tab 3: Camera Capture */}
        {activeTab === 'camera' && (
          <div>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <div
              onClick={() => !isUploading && cameraInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-lg p-5 text-center bg-white/70 dark:bg-slate-800/50 cursor-pointer"
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    ক্যামেরার ছবি ImgBB তে আপলোড হচ্ছে...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    মোবাইল বা ওয়েবক্যাম দিয়ে ছবি তুলুন
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    পণ্যটির সরাসরি ছবি তুলে সাথে সাথে ImgBB তে আপলোড করুন
                  </p>
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-medium flex items-center gap-1"
                  >
                    📷 ক্যামেরা চালু করুন
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback / Status */}
        {statusMessage && (
          <div
            className={`mt-2.5 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* ImgBB API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                ImgBB API Key কনফিগারেশন
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ImgBB হল একটি জনপ্রিয় ও নির্ভরযোগ্য ফ্রি ইমেজ হোস্টিং সার্ভিস। আপনার পণ্যের ছবিগুলো ক্লাউডে
                স্থায়ীভাবে রাখতে আপনার নিজস্ব ImgBB API Key ব্যবহার করতে পারেন।
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  আপনার ImgBB API Key:
                </label>
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="যেমন: 2d93e21ea5c490a02f69f2431aa081bb"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <a
                href="https://api.imgbb.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                ফ্রি ImgBB API Key পেতে এখানে ক্লিক করুন
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  const settings = getShopSettings();
                  settings.imgbbApiKey = customKey.trim();
                  localStorage.setItem('ssp_settings_v1', JSON.stringify(settings));
                  setShowKeyModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
