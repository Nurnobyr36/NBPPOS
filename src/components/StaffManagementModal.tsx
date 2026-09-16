import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  KeyRound,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  User,
  Copy,
  Check,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StaffAccount, DESIGNATED_ADMIN_EMAILS } from '../types';
import { formatDate } from '../utils/formatters';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    canManageStaff,
    staffAccounts,
    createStaffAccount,
    deleteStaffAccount,
    updateStaffAccount,
    currentUser,
    userProfile,
  } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'seller'>('admin');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEmail = currentUser?.email || userProfile?.email || userProfile?.staffCode || '';

  // Auto generate next staff code
  const handleAutoGenerateCode = () => {
    const count = staffAccounts.length + 1;
    const pad = count < 10 ? `0${count}` : `${count}`;
    setStaffCode(`NBP-${pad}`);
    if (!pin) {
      // 4 digit random pin
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      setPin(randomPin);
    }
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!canManageStaff) {
      setError(
        'নিরাপত্তা সতর্কতা: শুধুমাত্র অনুমোদিত এডমিন বা স্টাফ আইডি দিয়ে লগইন করলে স্টাফ অ্যাকাউন্ট তৈরি করা যাবে।'
      );
      return;
    }

    if (!name.trim()) {
      setError('স্টাফের পুরো নাম লিখুন।');
      return;
    }
    if (!staffCode.trim()) {
      setError('স্টাফ আইডি বা কোড দিন (যেমন: NBP-01)।');
      return;
    }
    if (!pin.trim() || pin.trim().length < 3) {
      setError('কমপক্ষে ৩ অথবা ৪ ডিজিটের পিন কোড প্রদান করুন।');
      return;
    }

    setLoading(true);
    try {
      await createStaffAccount({
        name: name.trim(),
        staffCode: staffCode.trim().toUpperCase(),
        pin: pin.trim(),
        role,
        phone: phone.trim(),
      });

      setSuccessMsg(`স্টাফ আইডি "${staffCode.trim().toUpperCase()}" সফলভাবে তৈরি করা হয়েছে!`);
      setName('');
      setStaffCode('');
      setPin('');
      setPhone('');
      setRole('admin');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'স্টাফ আইডি তৈরিতে সমস্যা হয়েছে!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${staffName}"-এর স্টাফ অ্যাকাউন্ট ডিলিট করতে চান?`)) {
      return;
    }
    try {
      await deleteStaffAccount(id);
      setSuccessMsg(`স্টাফ অ্যাকাউন্ট মুছে ফেলা হয়েছে।`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'ডিলিট করতে সমস্যা হয়েছে!');
    }
  };

  const handleToggleStatus = async (staff: StaffAccount) => {
    const nextStatus = staff.status === 'active' ? 'suspended' : 'active';
    try {
      await updateStaffAccount(staff.id, { status: nextStatus });
    } catch (err: any) {
      setError(err.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white border-b border-emerald-800/60 relative">
          <button
            type="button"
            id="close-staff-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              এডমিন এক্সক্লুসিভ ফিচার
            </span>
            <span className="text-xs text-emerald-300/80 font-mono">
              {currentEmail}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            স্টাফ আইডি ও বিক্রয়কর্মী পরিচালনা
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            ক্যাশিয়ার ও স্টাফদের জন্য স্বতন্ত্র স্টাফ আইডি ও পিন কোড তৈরি করুন। স্টাফ আইডি দিয়ে লগইন করলে এডমিনের মতো <strong>কেনা দাম, লাভ-ক্ষতি, পণ্য ও স্টক পরিচালনাসহ সমস্ত এক্সেস</strong> থাকবে।
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Permission warning if not designated admin */}
          {!canManageStaff ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1">অ্যাক্সেস সংরক্ষিত!</p>
                <p className="leading-relaxed">
                  স্টাফ আইডি তৈরি বা পরিচালনা করার ক্ষমতা শুধুমাত্র অনুমোদিত ৪টি এডমিন ইমেইলের জন্য সংরক্ষিত:
                </p>
                <ul className="list-disc list-inside mt-2 font-mono text-[11px] space-y-0.5">
                  {DESIGNATED_ADMIN_EMAILS.map((em) => (
                    <li key={em}>{em}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Alert Messages */}
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form: Add New Staff Account */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    নতুন স্টাফ আইডি খুলুন (Create New Staff ID)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    স্বয়ংক্রিয় আইডি ও পিন তৈরি করুন
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Staff Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        স্টাফের পুরো নাম *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="যেমন: মো: শাকিল আহমেদ"
                          className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Staff Code */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        স্টাফ কোড / ইউজারনেম *
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={staffCode}
                          onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                          placeholder="যেমন: NBP-01"
                          className="w-full text-xs pl-8 pr-3 py-2 uppercase font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* PIN Code */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        লগইন পিন কোড (৩-৬ ডিজিট) *
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="যেমন: 1234"
                          className="w-full text-xs pl-8 pr-3 py-2 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Role & Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        পদবী / রোল
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                      >
                        <option value="admin">এডমিন (সমস্ত এক্সেস ও কেনা দাম)</option>
                        <option value="cashier">ক্যাশিয়ার (POS বিলিং ও এডমিন এক্সেস)</option>
                        <option value="seller">বিক্রয়কর্মী (বিক্রয় ও এডমিন এক্সেস)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                    <div className="relative w-full sm:w-64">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      id="save-staff-account-btn"
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'স্টাফ অ্যাকাউন্ট তৈরি করুন'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Staff Accounts List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    বিদ্যমান স্টাফ আইডি তালিকা ({staffAccounts.length} জন)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    স্টাফরা এই আইডি ও পিন দিয়ে সরাসরি POS-এ লগইন করতে পারবে
                  </span>
                </div>

                {staffAccounts.length === 0 ? (
                  <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      এখনো কোনো স্টাফ অ্যাকাউন্ট তৈরি করা হয়নি
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      উপরের ফর্মটি পূরণ করে প্রথম স্টাফ আইডি তৈরি করুন।
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                          <th className="py-2.5 px-3">স্টাফ কোড</th>
                          <th className="py-2.5 px-3">নাম ও মোবাইল</th>
                          <th className="py-2.5 px-3">পদবী</th>
                          <th className="py-2.5 px-3">লগইন পিন</th>
                          <th className="py-2.5 px-3">অনুমতি স্ট্যাটাস</th>
                          <th className="py-2.5 px-3">তৈরির সময়</th>
                          <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {staffAccounts.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              <div className="flex items-center gap-1.5">
                                <span>{s.staffCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(s.staffCode)}
                                  title="কোড কপি করুন"
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  {copiedCode === s.staffCode ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {s.name}
                              </div>
                              {s.phone && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {s.phone}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {s.role === 'admin' ? 'এডমিন (পূর্ণ এক্সেস)' : s.role === 'cashier' ? 'ক্যাশিয়ার (এডমিন এক্সেস)' : 'বিক্রয়কর্মী (এডমিন এক্সেস)'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {visiblePins[s.id] ? s.pin : '••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePinVisibility(s.id)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  {visiblePins[s.id] ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(s)}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                                  s.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
                                }`}
                              >
                                {s.status === 'active' ? 'সক্রিয় (Active)' : 'স্থগিত (Suspended)'}
                              </button>
                            </td>

                            <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                              {formatDate(s.createdAt)}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(s.id, s.name)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="স্টাফ অ্যাকাউন্ট ডিলিট"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Informational Guidance */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs space-y-2 text-emerald-950 dark:text-emerald-200">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <BadgeCheck className="w-4 h-4" />
                  স্টাফ আইডি ও কেনা দাম গোপনীয়তা নীতি:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-300/90">
                  <li>স্টাফরা লগইন উইন্ডোতে <strong>স্টাফ আইডি ও পিন কোড</strong> দিয়ে লগইন করে বিক্রয় সম্পন্ন করতে পারবে।</li>
                  <li>স্টাফ লগইনে পণ্যের কেনা দাম (ক্রয় মূল্য) এবং মোট আর্থিক মুনাফা সবসময় গোপন থাকবে। শুধুমাত্র নির্ধারিত ৪টি এডমিন ইমেইল এই তথ্য দেখতে পারবে।</li>
                  <li>রশিদ ও ইনভয়েসে স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট স্টাফ/ক্যাশিয়ারের নাম প্রদর্শিত হবে।</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
