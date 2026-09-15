import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Printer,
  Share2,
  Check,
  Phone,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  MessageSquare,
  Building2,
  FileText,
  BadgePercent,
  CreditCard,
  Hash,
  Image as ImageIcon,
  FileDown,
  Download,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { Sale, ShopSettings, Language } from '../types';
import { formatMoney, formatDate } from '../utils/formatters';
import { BarcodeSvg } from '../components/BarcodeSvg';
import { InvoiceQrCode } from '../components/InvoiceQrCode';
import {
  downloadInvoiceJpg,
  downloadInvoicePdf,
  shareInvoiceFile,
} from '../utils/invoiceExport';

interface InvoiceViewProps {
  sale: Sale;
  shopSettings: ShopSettings;
  currencySymbol: string;
  lang: Language;
  onBack: () => void;
}

type InvoiceFormat = 'digital' | 'thermal-80' | 'thermal-58' | 'corporate-a4';

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  sale,
  shopSettings,
  currencySymbol,
  lang: _lang,
  onBack,
}) => {
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormat>('digital');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<'jpg' | 'pdf' | 'share' | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Total discounts calculation
  const itemDiscountsTotal = (sale.items || []).reduce(
    (acc, it) => acc + (Number(it.discount) || 0) * (Number(it.qty) || 1),
    0
  );
  const totalSavings = itemDiscountsTotal + (Number(sale.invoiceDiscount) || 0);

  // Verification QR data string
  const qrVerificationData = `SMARTSHOP VERIFIED E-INVOICE\nInvoice: #${sale.invoiceNo}\nDate: ${new Date(sale.createdAt).toLocaleDateString()}\nShop: ${shopSettings.shopName} (${shopSettings.phone || ''})\nCustomer: ${sale.customerName || 'General Customer'}\nItems: ${(sale.items || []).length}\nTotal: ${currencySymbol} ${sale.total.toFixed(2)}\nPaid: ${currencySymbol} ${sale.paidAmount.toFixed(2)}\nDue: ${currencySymbol} ${sale.dueAmount.toFixed(2)}\nStatus: ${sale.dueAmount <= 0 ? 'PAID' : 'DUE'}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJpg = async () => {
    try {
      setExporting('jpg');
      setExportStatus('JPG তৈরি হচ্ছে...');
      await downloadInvoiceJpg('printBlock', `Invoice_${sale.invoiceNo}`);
      setExportStatus('JPG সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Failed to export JPG:', err);
      setExportStatus('JPG তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setExportStatus(null), 3500);
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setExporting('pdf');
      setExportStatus('PDF ফাইল প্রস্তুত হচ্ছে...');
      await downloadInvoicePdf('printBlock', `Invoice_${sale.invoiceNo}`, invoiceFormat);
      setExportStatus('PDF সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setExportStatus('PDF তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setExportStatus(null), 3500);
    } finally {
      setExporting(null);
    }
  };

  const handleShareFile = async (type: 'jpg' | 'pdf') => {
    try {
      setExporting('share');
      setExportStatus(type === 'jpg' ? 'JPG ছবি শেয়ার প্রস্তুত হচ্ছে...' : 'PDF ফাইল প্রস্তুত হচ্ছে...');
      const res = await shareInvoiceFile(
        'printBlock',
        type,
        sale.invoiceNo,
        shopSettings.shopName,
        invoiceFormat
      );
      if (res === 'shared') {
        setExportStatus('শেয়ার সম্পন্ন হয়েছে!');
      } else if (res === 'downloaded') {
        setExportStatus('ডিভাইসে ফাইল ডাউনলোড হয়েছে!');
      }
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      console.error('Share error:', err);
      setExportStatus('শেয়ার সম্পন্ন করা যায়নি');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setExporting(null);
      setShowShareModal(false);
    }
  };

  const handleShareText = () => {
    const text = `🧾 ডিজিটাল ইনভয়েস #${sale.invoiceNo}
🏪 প্রতিষ্ঠান: ${shopSettings.shopName}
📞 মোবাইল: ${shopSettings.phone || '-'}
👤 কাস্টমার: ${sale.customerName}
🧑‍💼 বিক্রেতা: ${sale.sellerName || sale.cashierName || 'এডমিন'}
📅 তারিখ: ${formatDate(sale.createdAt, true)}
--------------------------------
🛒 আইটেম সংখ্যা: ${(sale.items || []).length} টি
💰 মোট বিল: ${formatMoney(sale.total, currencySymbol)}
✅ পরিশোধ: ${formatMoney(sale.paidAmount, currencySymbol)}
${sale.dueAmount > 0 ? `⚠️ বাকি: ${formatMoney(sale.dueAmount, currencySymbol)}` : '🎉 সম্পূর্ণ পরিশোধিত'}
--------------------------------
${shopSettings.invoiceFooter || 'ধন্যবাদ, আবার আসবেন!'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    const text = `*ডিজিটাল ক্যাশ মেমো / ইনভয়েস*
*প্রতিষ্ঠান:* ${shopSettings.shopName}
*ইনভয়েস:* #${sale.invoiceNo}
*তারিখ:* ${formatDate(sale.createdAt, true)}
*কাস্টমার:* ${sale.customerName}
*বিক্রেতা:* ${sale.sellerName || sale.cashierName || 'এডমিন'}

*ক্রয়কৃত পণ্যের বিবরণ:*
${(sale.items || []).map((it) => `• ${it.name} (${it.qty} টি) = ${formatMoney(it.lineTotal, currencySymbol)}`).join('\n')}

---------------------------
*সর্বমোট বিল:* ${formatMoney(sale.total, currencySymbol)}
*পরিশোধিত:* ${formatMoney(sale.paidAmount, currencySymbol)}
${sale.dueAmount > 0 ? `*বকেয়া বাকি:* ${formatMoney(sale.dueAmount, currencySymbol)}` : '*পরিশোধ স্ট্যাটাস:* সম্পূর্ণ পরিশোধিত'}
---------------------------
_${shopSettings.invoiceFooter || 'আমাদের সাথে থাকার জন্য আন্তরিক ধন্যবাদ!'}_`;

    let phone = (sale.customerPhone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('01')) {
      phone = '88' + phone;
    }
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isPaid = (sale.dueAmount || 0) <= 0;
  const isPartial = (sale.dueAmount || 0) > 0 && (sale.paidAmount || 0) > 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification Banner */}
      {exportStatus && (
        <div className="no-print fixed top-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-slate-700 dark:border-slate-300">
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400 dark:text-emerald-600" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          )}
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Back and Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                ই-ইনভয়েস
              </span>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                #{sale.invoiceNo}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(sale.createdAt, true)}
            </p>
          </div>
        </div>

        {/* Format Selector & Digital Sharing Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setInvoiceFormat('digital')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                invoiceFormat === 'digital'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ডিজিটাল</span>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFormat('thermal-80')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                invoiceFormat === 'thermal-80'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>থার্মাল ৮০মিমি</span>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFormat('thermal-58')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                invoiceFormat === 'thermal-58'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>৫৮মিমি</span>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFormat('corporate-a4')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                invoiceFormat === 'corporate-a4'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 করপোরেট</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* JPG Image Download Button */}
          <button
            type="button"
            onClick={handleDownloadJpg}
            disabled={exporting !== null}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="ইনভয়েস JPG ছবি হিসেবে ডাউনলোড করুন"
          >
            {exporting === 'jpg' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>JPG ছবি</span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting !== null}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="ইনভয়েস PDF হিসেবে ডাউনলোড করুন"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <span>PDF ফাইল</span>
          </button>

          {/* Share Hub Button */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="JPG, PDF ও WhatsApp-এ শেয়ার করুন"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>শেয়ার</span>
          </button>

          {/* Print / System Dialog Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="প্রিন্টার দিয়ে প্রিন্ট করুন"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Share Hub Modal Popup */}
      {showShareModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    ইনভয়েস শেয়ার করুন
                  </h3>
                  <p className="text-xs text-slate-500">
                    ইনভয়েস #{sale.invoiceNo} • {sale.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Share Options Grid */}
            <div className="space-y-2.5">
              {/* Option 1: Share as JPG Image */}
              <button
                type="button"
                onClick={() => handleShareFile('jpg')}
                disabled={exporting !== null}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                      JPG ছবি শেয়ার করুন
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      সোশ্যাল মিডিয়া, মেসেঞ্জার বা গ্যালারিতে ছবি হিসেবে পাঠান
                    </p>
                  </div>
                </div>
                {exporting === 'share' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                )}
              </button>

              {/* Option 2: Share as PDF File */}
              <button
                type="button"
                onClick={() => handleShareFile('pdf')}
                disabled={exporting !== null}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      PDF ডকুমেন্ট শেয়ার করুন
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      অফিসিয়াল PDF ডকুমেন্ট আকারে ফাইল শেয়ার করুন
                    </p>
                  </div>
                </div>
                {exporting === 'share' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                )}
              </button>

              {/* Option 3: WhatsApp Direct Text */}
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  handleSendWhatsApp();
                }}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      WhatsApp-এ মেসেজ পাঠান
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      কাস্টমারের হোয়াটসঅ্যাপে ইনভয়েস বিবরণী সহ সরাসরি পাঠান
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              {/* Option 4: Copy Text Summary */}
              <button
                type="button"
                onClick={handleShareText}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {copied ? 'টেক্সট কপি সম্পন্ন হয়েছে!' : 'ইনভয়েস টেক্সট কপি করুন'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      এসএমএস বা যেকোনো চ্যাটবক্সে পেস্ট করার জন্য
                    </p>
                  </div>
                </div>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : null}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Printable Container */}
      <div className="flex justify-center">
        {/* ============================================================ */}
        {/* FORMAT 1: MODERN DIGITAL E-RECEIPT (ডিজিটাল ই-রসিদ)           */}
        {/* ============================================================ */}
        {invoiceFormat === 'digital' && (
          <div
            id="printBlock"
            className="w-full max-w-[430px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative"
          >
            {/* Top Digital Brand Header */}
            <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 p-6 text-white text-center overflow-hidden">
              {/* Decorative digital circuit aura */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

              {/* Verified Digital E-Invoice Pill */}
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 border border-white/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>অফিসিয়াল ডিজিটাল ই-রসিদ</span>
              </div>

              {/* Shop Logo & Name */}
              {shopSettings.logoUrl ? (
                <img
                  src={shopSettings.logoUrl}
                  alt={shopSettings.shopName}
                  referrerPolicy="no-referrer"
                  className="max-h-12 max-w-[140px] mx-auto mb-2 object-contain bg-white/90 p-1.5 rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-2 font-black text-xl text-white shadow-xs">
                  {shopSettings.shopName.charAt(0)}
                </div>
              )}

              <h1 className="text-xl font-black tracking-tight text-white">
                {shopSettings.shopName}
              </h1>

              {shopSettings.tagline && (
                <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                  {shopSettings.tagline}
                </p>
              )}

              <div className="mt-2 text-[11px] text-emerald-100/80 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                {shopSettings.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-emerald-300" />
                    {shopSettings.phone}
                  </span>
                )}
                {shopSettings.address && (
                  <span className="truncate max-w-[280px]">
                    📍 {shopSettings.address}
                  </span>
                )}
              </div>

              {/* Grand Total Highlight Badge */}
              <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 inline-block w-full">
                <span className="text-[11px] font-semibold tracking-wider text-emerald-200 uppercase">
                  সর্বমোট প্রদেয় বিল
                </span>
                <div className="text-2xl font-black tracking-tight text-white tabular-nums mt-0.5">
                  {formatMoney(sale.total, currencySymbol)}
                </div>
              </div>
            </div>

            {/* Ticket Notches & Perforation Strip */}
            <div className="relative flex items-center justify-between px-3 -mt-3 z-10">
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 -ml-6" />
              <div className="flex-1 border-b-2 border-dashed border-slate-300 dark:border-slate-700 mx-3" />
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 -mr-6" />
            </div>

            {/* Invoice Meta Grid */}
            <div className="p-5 pt-3 space-y-4">
              {/* Status Stamp & Meta */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span>ইনভয়েস নং:</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    #{sale.invoiceNo}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatDate(sale.createdAt, true)}</span>
                  </div>
                </div>

                {/* Digital Stamp */}
                <div className="text-right">
                  {isPaid ? (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black tracking-wide uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        পরিশোধিত
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">PAID IN FULL</span>
                    </div>
                  ) : isPartial ? (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-black tracking-wide uppercase">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        আংশিক বাকি
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">PARTIAL DUE</span>
                    </div>
                  ) : (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-black tracking-wide uppercase">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        বকেয়া
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">UNPAID</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Cashier Section */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    গ্রাহক / কাস্টমার
                  </span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {sale.customerName || 'সাধারণ কাস্টমার'}
                  </div>
                  {sale.customerPhone && (
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {sale.customerPhone}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    বিক্রেতা / ক্যাশিয়ার
                  </span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {sale.sellerName || sale.cashierName || 'এডমিন'}
                  </div>
                  {sale.sellerEmail && (
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {sale.sellerEmail}
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    টার্মিনাল #০১
                  </div>
                </div>
              </div>

              {/* Items List - Modern Cards style */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>পণ্যের বিবরণ ({sale.items?.length || 0})</span>
                  <span>মূল্য</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(sale.items || []).map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 leading-snug truncate">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                            {item.qty} টি
                          </span>
                          <span>×</span>
                          <span>{formatMoney(item.rate, currencySymbol)}</span>
                          {item.discount > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              (ছাড়: {formatMoney(item.discount, currencySymbol)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums text-right pt-0.5">
                        {formatMoney(item.lineTotal, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Savings Celebration Chip (if any discount) */}
              {totalSavings > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <BadgePercent className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold">স্মার্ট সেভিংস!</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      এই ইনভয়েসে আপনি মোট {formatMoney(totalSavings, currencySymbol)} সাশ্রয় করেছেন।
                    </p>
                  </div>
                </div>
              )}

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>সাবটোটাল (Subtotal):</span>
                  <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                    {formatMoney(sale.subtotal, currencySymbol)}
                  </span>
                </div>

                {sale.invoiceDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>বিশেষ ডিসকাউন্ট:</span>
                    <span className="tabular-nums font-semibold">
                      -{formatMoney(sale.invoiceDiscount, currencySymbol)}
                    </span>
                  </div>
                )}

                {sale.vatTotal > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>ভ্যাট (VAT):</span>
                    <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      +{formatMoney(sale.vatTotal, currencySymbol)}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-black text-slate-900 dark:text-slate-100">
                  <span>সর্বমোট বিল (Net Total):</span>
                  <span className="text-base tabular-nums font-black text-emerald-700 dark:text-emerald-400">
                    {formatMoney(sale.total, currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
                  <span className="font-medium">পরিশোধিত টাকা:</span>
                  <span className="tabular-nums font-bold text-slate-900 dark:text-slate-100">
                    {formatMoney(sale.paidAmount, currencySymbol)}
                  </span>
                </div>

                {sale.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                    <span>বকেয়া বাকি (Due):</span>
                    <span className="tabular-nums">
                      {formatMoney(sale.dueAmount, currencySymbol)}
                    </span>
                  </div>
                )}

                {sale.changeAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>ফেরত টাকা (Change):</span>
                    <span className="tabular-nums">
                      {formatMoney(sale.changeAmount, currencySymbol)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method Badges */}
              {sale.payments && sale.payments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    পেমেন্ট মেথড:
                  </span>
                  {sale.payments.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 text-[11px]"
                    >
                      {p.method} ({formatMoney(p.amount, currencySymbol)})
                    </span>
                  ))}
                </div>
              )}

              {/* QR Code & Barcode Digital Verification Card */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center text-center space-y-3">
                <div className="flex items-center justify-center gap-4 w-full">
                  {/* Real Scannable QR Code */}
                  <InvoiceQrCode data={qrVerificationData} size={90} />

                  {/* Verification Note */}
                  <div className="text-left space-y-1">
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ডিজিটাল রসিদ যাচাই
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-[170px]">
                      মোবাইল ক্যামেরা দিয়ে কিউআর কোড স্ক্যান করে এই ইনভয়েসের সত্যতা নিশ্চিত করুন।
                    </p>
                  </div>
                </div>

                {/* Vector Barcode */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 w-full flex justify-center">
                  <BarcodeSvg value={sale.invoiceNo} height={36} />
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-2 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {shopSettings.invoiceFooter || 'ধন্যবাদ, আপনার দিনটি শুভ হোক!'}
                </p>
                <p className="text-[10px] text-slate-400">
                  SmartShop POS • সিকিউর ডিজিটাল ইনভয়েসিং সিস্টেম
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FORMAT 2: THERMAL 80MM (রিসিপ্ট প্রিন্টার ৮০মিমি)            */}
        {/* ============================================================ */}
        {invoiceFormat === 'thermal-80' && (
          <div
            id="printBlock"
            className="w-full max-w-[340px] bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 font-sans"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              {shopSettings.logoUrl && (
                <img
                  src={shopSettings.logoUrl}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="max-h-11 mx-auto mb-1.5 object-contain"
                />
              )}
              <h1 className="text-base font-black tracking-tight text-slate-950 uppercase">
                {shopSettings.shopName}
              </h1>
              {shopSettings.tagline && (
                <p className="text-[11px] text-slate-600 font-medium">
                  {shopSettings.tagline}
                </p>
              )}
              <p className="text-[11px] text-slate-600">{shopSettings.address}</p>
              {shopSettings.phone && (
                <p className="text-[11px] text-slate-600 font-mono">
                  📞 {shopSettings.phone}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span>ইনভয়েস: <strong>#{sale.invoiceNo}</strong></span>
                <span className="text-[11px]">{formatDate(sale.createdAt, true)}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span>কাস্টমার: <strong>{sale.customerName}</strong></span>
                {sale.customerPhone && (
                  <span className="font-mono text-slate-600">{sale.customerPhone}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-700 font-sans flex justify-between">
                <span>বিক্রেতা: <strong>{sale.sellerName || sale.cashierName || 'এডমিন'}</strong></span>
                {sale.sellerEmail && <span className="text-[10px] text-slate-500">{sale.sellerEmail}</span>}
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs my-3 border-collapse">
              <thead>
                <tr className="border-b border-slate-400 text-slate-800">
                  <th className="py-1 font-bold">আইটেম</th>
                  <th className="py-1 text-center font-bold">পরিমাণ</th>
                  <th className="py-1 text-right font-bold">দর</th>
                  <th className="py-1 text-right font-bold">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(sale.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 pr-1">
                      <p className="font-semibold leading-tight">{it.name}</p>
                      {it.discount > 0 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          (ছাড়: {formatMoney(it.discount, currencySymbol)})
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-center tabular-nums font-bold">
                      {it.qty}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatMoney(it.rate, currencySymbol)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-bold">
                      {formatMoney(it.lineTotal, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-dashed border-slate-400 pt-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>সাবটোটাল:</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(sale.subtotal, currencySymbol)}
                </span>
              </div>

              {sale.invoiceDiscount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>ইনভয়েস ছাড়:</span>
                  <span className="tabular-nums">
                    -{formatMoney(sale.invoiceDiscount, currencySymbol)}
                  </span>
                </div>
              )}

              {sale.vatTotal > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>ভ্যাট:</span>
                  <span className="tabular-nums">
                    +{formatMoney(sale.vatTotal, currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-400 pt-1">
                <span>সর্বমোট বিল:</span>
                <span className="tabular-nums">
                  {formatMoney(sale.total, currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between text-slate-800 pt-0.5">
                <span>পরিশোধিত:</span>
                <span className="tabular-nums font-bold">
                  {formatMoney(sale.paidAmount, currencySymbol)}
                </span>
              </div>

              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>বকেয়া বাকি:</span>
                  <span className="tabular-nums">
                    {formatMoney(sale.dueAmount, currencySymbol)}
                  </span>
                </div>
              )}

              {sale.changeAmount > 0 && (
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>ফেরত:</span>
                  <span className="tabular-nums">
                    {formatMoney(sale.changeAmount, currencySymbol)}
                  </span>
                </div>
              )}
            </div>

            {/* Thermal QR & Barcode */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-400 flex flex-col items-center space-y-2">
              <InvoiceQrCode data={qrVerificationData} size={75} />
              <BarcodeSvg value={sale.invoiceNo} height={32} />
              <p className="text-xs font-semibold text-slate-800 text-center mt-2">
                {shopSettings.invoiceFooter || 'ধন্যবাদ, আবার আসবেন!'}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FORMAT 3: MINI THERMAL 58MM (৫৮মিমি পকেট প্রিন্টার)         */}
        {/* ============================================================ */}
        {invoiceFormat === 'thermal-58' && (
          <div
            id="printBlock"
            className="w-full max-w-[270px] bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 text-[11px] font-mono"
          >
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h1 className="font-black text-sm uppercase leading-tight">
                {shopSettings.shopName}
              </h1>
              <p className="text-[10px]">{shopSettings.phone}</p>
            </div>

            <div className="py-1.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div>ইনভয়েস: #{sale.invoiceNo}</div>
              <div>তারিখ: {formatDate(sale.createdAt, false)}</div>
              <div>কাস্টমার: {sale.customerName}</div>
              <div>বিক্রেতা: <strong>{sale.sellerName || sale.cashierName || 'এডমিন'}</strong></div>
            </div>

            <div className="py-2 divide-y divide-slate-200">
              {(sale.items || []).map((it, idx) => (
                <div key={idx} className="py-1 flex justify-between">
                  <div className="flex-1 pr-1 truncate">
                    {it.name} <span className="text-[10px]">({it.qty})</span>
                  </div>
                  <div className="font-bold tabular-nums">
                    {formatMoney(it.lineTotal, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>মোট:</span>
                <span>{formatMoney(sale.total, currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>জমা:</span>
                <span>{formatMoney(sale.paidAmount, currencySymbol)}</span>
              </div>
              {sale.dueAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>বাকি:</span>
                  <span>{formatMoney(sale.dueAmount, currencySymbol)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-dashed border-slate-400 text-center flex flex-col items-center">
              <InvoiceQrCode data={qrVerificationData} size={65} />
              <p className="text-[10px] mt-1">ধন্যবাদ!</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FORMAT 4: CORPORATE A4 TAX INVOICE (করপোরেট ফরম্যাট)         */}
        {/* ============================================================ */}
        {invoiceFormat === 'corporate-a4' && (
          <div
            id="printBlock"
            className="w-full max-w-[780px] bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-8 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Corporate Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-6">
              <div className="space-y-1.5">
                {shopSettings.logoUrl && (
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    referrerPolicy="no-referrer"
                    className="max-h-14 mb-2 object-contain"
                  />
                )}
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {shopSettings.shopName}
                </h1>
                {shopSettings.tagline && (
                  <p className="text-xs font-semibold text-slate-600">
                    {shopSettings.tagline}
                  </p>
                )}
                <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                  {shopSettings.address}
                </p>
                <div className="text-xs text-slate-600 font-mono space-x-4">
                  {shopSettings.phone && <span>📞 {shopSettings.phone}</span>}
                  {shopSettings.email && <span>✉️ {shopSettings.email}</span>}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block bg-slate-900 text-white font-black text-sm px-4 py-1.5 rounded-lg tracking-wider uppercase mb-2">
                  ট্যাক্স ইনভয়েস
                </div>
                <div className="text-xs font-mono">
                  <span className="text-slate-500">ইনভয়েস নং: </span>
                  <strong className="text-sm text-slate-900">#{sale.invoiceNo}</strong>
                </div>
                <div className="text-xs text-slate-600">
                  তারিখ: <strong>{formatDate(sale.createdAt, true)}</strong>
                </div>
                <div className="text-xs text-slate-600">
                  বিক্রেতা / অপারেটর: <strong>{sale.sellerName || sale.cashierName || 'এডমিন'}</strong>
                </div>
                {sale.sellerEmail && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    {sale.sellerEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-2 gap-8 my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  বিল প্রাপক (BILL TO):
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {sale.customerName}
                </h3>
                {sale.customerPhone && (
                  <p className="text-slate-600 font-mono mt-0.5">
                    মোবাইল: {sale.customerPhone}
                  </p>
                )}
                {sale.customerAddress && (
                  <p className="text-slate-600 mt-0.5">
                    ঠিকানা: {sale.customerAddress}
                  </p>
                )}
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  পেমেন্ট স্ট্যাটাস:
                </span>
                <div>
                  {isPaid ? (
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-black rounded-md text-xs border border-emerald-300">
                      ✓ পরিশোধিত (PAID)
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 font-black rounded-md text-xs border border-rose-300">
                      ⚠️ বকেয়া বাকি ({formatMoney(sale.dueAmount, currencySymbol)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Formal Items Table */}
            <table className="w-full text-left text-xs border border-slate-300 my-4">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">পণ্যের বিবরণ (Description)</th>
                  <th className="p-3 text-center w-24">পরিমাণ (Qty)</th>
                  <th className="p-3 text-right w-28">দর (Rate)</th>
                  <th className="p-3 text-right w-24">ছাড় (Dis.)</th>
                  <th className="p-3 text-right w-32">মোট (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(sale.items || []).map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800">{it.name}</td>
                    <td className="p-3 text-center tabular-nums font-bold">{it.qty}</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(it.rate, currencySymbol)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-600">
                      {it.discount > 0 ? formatMoney(it.discount, currencySymbol) : '-'}
                    </td>
                    <td className="p-3 text-right tabular-nums font-bold text-slate-900">
                      {formatMoney(it.lineTotal, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Signature Layout */}
            <div className="grid grid-cols-2 gap-8 pt-4 items-start">
              {/* Terms & QR */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <InvoiceQrCode data={qrVerificationData} size={85} />
                  <div className="text-xs space-y-1">
                    <BarcodeSvg value={sale.invoiceNo} height={32} />
                    <p className="text-[10px] text-slate-500 mt-1">
                      ডিজিটাল সত্যতা যাচাইয়ের জন্য কিউআর কোড স্ক্যান করুন।
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <span className="font-bold text-slate-700 block mb-1">শর্তাবলী:</span>
                  <p>১. বিক্রিত পণ্য অক্ষত অবস্থায় ৩ দিনের মধ্যে ক্যাশ মেমোসহ পরিবর্তনযোগ্য।</p>
                  <p>২. বিশেষ ছাড়ে বিক্রিত পণ্য ফেরতযোগ্য নহে।</p>
                </div>
              </div>

              {/* Totals Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">সাবটোটাল (Subtotal):</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(sale.subtotal, currencySymbol)}
                  </span>
                </div>

                {sale.invoiceDiscount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                    <span>বিশেষ ছাড় (Discount):</span>
                    <span className="font-bold tabular-nums">
                      -{formatMoney(sale.invoiceDiscount, currencySymbol)}
                    </span>
                  </div>
                )}

                {sale.vatTotal > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">ভ্যাট (VAT):</span>
                    <span className="font-bold tabular-nums">
                      +{formatMoney(sale.vatTotal, currencySymbol)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b-2 border-slate-800 text-sm font-black text-slate-900">
                  <span>সর্বমোট বিল (Net Amount):</span>
                  <span className="tabular-nums text-base">
                    {formatMoney(sale.total, currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-700 font-medium">পরিশোধিত টাকা:</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(sale.paidAmount, currencySymbol)}
                  </span>
                </div>

                {sale.dueAmount > 0 && (
                  <div className="flex justify-between py-1 text-rose-700 font-bold">
                    <span>বকেয়া বাকি (Due Amount):</span>
                    <span className="tabular-nums">
                      {formatMoney(sale.dueAmount, currencySymbol)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Authorized Signatures */}
            <div className="flex justify-between items-end pt-16 text-xs text-slate-700">
              <div className="text-center border-t border-slate-400 pt-1.5 w-44">
                ক্রেতার স্বাক্ষর
              </div>
              <div className="text-center border-t border-slate-400 pt-1.5 w-44">
                কর্তৃপক্ষের স্বাক্ষর ও সিল
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
