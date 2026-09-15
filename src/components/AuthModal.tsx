import React, { useState } from 'react';
import {
  User,
  LogIn,
  LogOut,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Edit3,
  Crown,
  UserPlus,
  ShieldAlert,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onOpenStaffManagement?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onOpenStaffManagement,
}) => {
  const {
    currentUser,
    userProfile,
    isSuperAdmin,
    hasAnySuperAdmin,
    canManageStaff,
    staffAccounts,
    loginWithStaffCode,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    quickCashierLogin,
    updateCurrentSellerName,
    logout,
    sellerName,
  } = useAuth();

  const [tab, setTab] = useState<'staff' | 'quick' | 'google' | 'email' | 'super_admin_create'>('staff');
  const [staffCodeInput, setStaffCodeInput] = useState('');
  const [staffPinInput, setStaffPinInput] = useState('');
  const [showStaffPin, setShowStaffPin] = useState(false);
  const [quickNameInput, setQuickNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'cashier' | 'admin' | 'seller' | 'super_admin'>('cashier');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit current name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(sellerName);

  if (!isOpen) return null;

  // Can the current user access register mode?
  // Only Super Admin can register accounts, OR if no super admin exists yet in the entire system (initial setup).
  const canRegisterAccounts = isSuperAdmin || !hasAnySuperAdmin;

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffCodeInput.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে স্টাফ কোড বা আইডি প্রদান করুন।' : 'Please enter your Staff Code.');
      return;
    }
    if (!staffPinInput.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে পিন কোড দিন।' : 'Please enter your PIN code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithStaffCode(staffCodeInput.trim(), staffPinInput.trim());
      setSuccessMsg(lang === 'bn' ? 'স্টাফ হিসেবে সফলভাবে লগইন হয়েছে!' : 'Logged in as staff successfully!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || (lang === 'bn' ? 'স্টাফ লগইন ব্যর্থ হয়েছে' : 'Staff login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNameInput.trim()) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে আপনার নাম লিখুন।' : 'Please enter your seller name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await quickCashierLogin(quickNameInput.trim());
      setSuccessMsg(lang === 'bn' ? 'সফলভাবে বিক্রেতা হিসেবে যুক্ত হয়েছেন!' : 'Logged in as seller successfully!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg(lang === 'bn' ? 'গুগল দিয়ে সফলভাবে লগিন হয়েছে!' : 'Logged in with Google successfully!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || (lang === 'bn' ? 'গুগল লগইনে সমস্যা হয়েছে' : 'Google login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setError(lang === 'bn' ? 'ইমেইল ও পাসওয়ার্ড প্রদান করুন।' : 'Email and password are required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isRegisterMode) {
        if (!canRegisterAccounts) {
          setError(
            lang === 'bn'
              ? 'নিরাপত্তা সতর্কবার্তা: শুধুমাত্র সুপার এডমিন নতুন অ্যাকাউন্ট তৈরি করতে পারেন।'
              : 'Security restriction: Only Super Admin can register new staff accounts.'
          );
          setLoading(false);
          return;
        }

        if (!fullNameInput.trim()) {
          setError(lang === 'bn' ? 'বিক্রেতার পুরো নাম দিন।' : 'Full name is required.');
          setLoading(false);
          return;
        }
        await registerWithEmail(fullNameInput.trim(), emailInput, passwordInput, selectedRole);
        setSuccessMsg(
          lang === 'bn'
            ? 'নতুন অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!'
            : 'New account registered successfully!'
        );
      } else {
        await loginWithEmail(emailInput, passwordInput);
        setSuccessMsg(lang === 'bn' ? 'লগিন সফল হয়েছে!' : 'Logged in successfully!');
      }
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Error';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = lang === 'bn' ? 'ভুল ইমেইল বা পাসওয়ার্ড!' : 'Invalid email or password!';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = lang === 'bn' ? 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে।' : 'Email already in use.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditedName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameValue.trim()) return;
    setLoading(true);
    try {
      await updateCurrentSellerName(editNameValue.trim());
      setIsEditingName(false);
      setSuccessMsg(lang === 'bn' ? 'বিক্রেতার নাম সফলভাবে আপডেট হয়েছে!' : 'Seller name updated!');
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setSuccessMsg(lang === 'bn' ? 'লগআউট সম্পন্ন হয়েছে' : 'Logged out');
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (e: any) {
      setError(e.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const isLoggedIn = Boolean(currentUser || userProfile);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {lang === 'bn' ? 'বিক্রেতা / ক্যাশিয়ার লগইন' : 'Seller / Cashier Login'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'bn'
              ? 'নিরাপদ পিওএস টার্মিনাল: লগইন ছাড়া বিক্রয় করা যাবে না'
              : 'Secure POS terminal: Login required to process sales'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If Already Logged In */}
        {isLoggedIn && (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'bn' ? 'বর্তমান সক্রিয় বিক্রেতা' : 'Currently Active Seller'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  userProfile?.role === 'super_admin'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : userProfile?.role === 'admin'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {userProfile?.role === 'super_admin' && <Crown className="w-3 h-3 text-amber-500" />}
                {userProfile?.role === 'super_admin'
                  ? 'সুপার এডমিন'
                  : userProfile?.role === 'admin'
                  ? 'এডমিন'
                  : 'ক্যাশিয়ার'}
              </span>
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveEditedName} className="space-y-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  placeholder="বিক্রেতার নাম লিখুন"
                  className="w-full text-sm font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    সেভ করুন
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-black text-base flex items-center justify-center shadow-xs">
                    {sellerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {sellerName}
                      {userProfile?.role === 'super_admin' && (
                        <Crown className="w-3.5 h-3.5 text-amber-500" title="Super Admin" />
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {currentUser?.email || (lang === 'bn' ? 'লোকাল ক্যাশিয়ার প্রোফাইল' : 'Local cashier profile')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditNameValue(sellerName);
                    setIsEditingName(true);
                  }}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  title="নাম পরিবর্তন করুন"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Super Admin / Designated Admin Special Panel */}
            {canManageStaff && (
              <div className="mt-3 p-3.5 bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/40 dark:to-emerald-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'bn' ? 'স্টাফ আইডি ও কেনা দাম নিয়ন্ত্রণ' : 'Staff IDs & Buy Price Control'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200/90 dark:bg-amber-900 text-amber-950 dark:text-amber-100 rounded-full font-bold">
                    এডমিন সক্রিয়
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'bn'
                    ? 'আপনি অনুমোদিত এডমিন হিসেবে লগইন আছেন। আপনি কেনা দাম দেখতে পারছেন এবং ক্যাশিয়ারদের জন্য স্টাফ আইডি ও পিন কোড তৈরি করতে পারবেন।'
                    : 'You are logged in as an authorized admin. You can view buy prices and create staff IDs for sellers.'}
                </p>
                {onOpenStaffManagement && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStaffManagement();
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>স্টাফ আইডি তৈরি ও পরিচালনা করুন ({staffAccounts.length} জন)</span>
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগআউট বা বিক্রেতা পরিবর্তন' : 'Logout or switch seller'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
              >
                {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {/* If Not Logged In or Super Admin wants to register new staff */}
        {(!isLoggedIn || isSuperAdmin) && (
          <div>
            {isLoggedIn && isSuperAdmin && (
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'bn' ? 'নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন:' : 'Create New Staff Account:'}</span>
              </div>
            )}

            {/* Tabs */}
            {!isLoggedIn && (
              <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('staff');
                    setError(null);
                    setIsRegisterMode(false);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all text-center truncate cursor-pointer ${
                    tab === 'staff'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? 'স্টাফ আইডি' : 'Staff ID'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('quick');
                    setError(null);
                    setIsRegisterMode(false);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all text-center truncate cursor-pointer ${
                    tab === 'quick'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? 'দ্রুত নাম' : 'Quick'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('google');
                    setError(null);
                    setIsRegisterMode(false);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all text-center truncate cursor-pointer ${
                    tab === 'google'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? 'গুগল' : 'Google'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('email');
                    setError(null);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all text-center truncate cursor-pointer ${
                    tab === 'email'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {lang === 'bn' ? 'ইমেইল' : 'Email'}
                </button>
              </div>
            )}

            {/* TAB: STAFF CODE & PIN LOGIN */}
            {!isLoggedIn && tab === 'staff' && (
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'bn' ? 'স্টাফ কোড / ইউজারনেম:' : 'Staff Code / ID:'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={staffCodeInput}
                        onChange={(e) => setStaffCodeInput(e.target.value.toUpperCase())}
                        placeholder="যেমন: STF-01"
                        className="w-full text-sm font-bold uppercase font-mono pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'bn' ? '৪ ডিজিটের পিন কোড:' : 'PIN Code:'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showStaffPin ? 'text' : 'password'}
                        required
                        value={staffPinInput}
                        onChange={(e) => setStaffPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full text-sm font-mono tracking-widest font-bold pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPin((prev) => !prev)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showStaffPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Active staff quick click pills if any */}
                  {staffAccounts.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                        সক্রিয় স্টাফ আইডি তালিকা:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {staffAccounts
                          .filter((s) => s.status === 'active')
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setStaffCodeInput(s.staffCode)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                                staffCodeInput === s.staffCode
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              {s.staffCode} ({s.name})
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
                    <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      স্টাফ আইডি দিয়ে লগইন করলে বিক্রয় করা যাবে। কিন্তু <strong>পণ্যের কেনা দাম সম্পূর্ণ গোপন থাকবে</strong>।
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>{lang === 'bn' ? 'স্টাফ লগইন করুন' : 'Login with Staff Code'}</span>
                </button>
              </form>
            )}

            {/* TAB 1: QUICK NAME (Fastest for busy retail shift) */}
            {!isLoggedIn && tab === 'quick' && (
              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'বিক্রেতার পুরো নাম (ক্যাশিয়ার):' : 'Cashier / Seller Name:'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={quickNameInput}
                      onChange={(e) => setQuickNameInput(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: মোঃ আরিফ হাসান' : 'e.g. Arif Hasan'}
                      className="w-full text-sm font-semibold pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {lang === 'bn'
                      ? 'পাসওয়ার্ড ছাড়াই সরাসরি নাম দিয়ে দ্রুত কাউন্টারে সেল শুরু করুন।'
                      : 'Instantly start selling with your name on the receipt without password.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{lang === 'bn' ? 'লগইন করে পিওএস শুরু করুন' : 'Login & Open POS'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: GOOGLE AUTH */}
            {!isLoggedIn && tab === 'google' && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center">
                  {lang === 'bn'
                    ? 'আপনার গুগল একাউন্ট দিয়ে সহজে লগইন করুন। ইনভয়েসে আপনার নাম উঠবে।'
                    : 'Sign in with Google to automatically use your verified name on sales receipts.'}
                </p>

                <button
                  type="button"
                  onClick={handleGoogleSubmit}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>{lang === 'bn' ? 'গুগল দিয়ে লগইন করুন' : 'Sign In with Google'}</span>
                </button>
              </div>
            )}

            {/* TAB 3: EMAIL / PASSWORD */}
            {(!isLoggedIn || isSuperAdmin) && (tab === 'email' || isSuperAdmin) && (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {/* Notice if not super admin and register is attempted */}
                {!isLoggedIn && isRegisterMode && !canRegisterAccounts && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">সুপার এডমিন অনুমতি আবশ্যক:</span>
                      <p className="mt-0.5 text-[11px] leading-tight">
                        সাধারণ ব্যবহারকারী সাইন আপ করতে পারবে না। শুধুমাত্র সুপার এডমিন নতুন অ্যাকাউন্ট তৈরি করে দিতে পারেন।
                      </p>
                    </div>
                  </div>
                )}

                {isRegisterMode && canRegisterAccounts && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'bn' ? 'পুরো নাম:' : 'Full Name:'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={fullNameInput}
                          onChange={(e) => setFullNameInput(e.target.value)}
                          placeholder="স্টাফের নাম"
                          className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'bn' ? 'ভূমিকা (Role):' : 'Role:'}
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-slate-100 font-semibold"
                      >
                        <option value="cashier">ক্যাশিয়ার (Cashier)</option>
                        <option value="seller">বিক্রেতা (Seller / Sales Staff)</option>
                        <option value="admin">এডমিন (Shop Admin)</option>
                        <option value="super_admin">সুপার এডমিন (Super Admin)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'ইমেইল:' : 'Email Address:'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seller@smartshop.com"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'পাসওয়ার্ড:' : 'Password:'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="কমপক্ষে ৬ ডিজিট"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || (isRegisterMode && !canRegisterAccounts)}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {isRegisterMode
                      ? lang === 'bn'
                        ? 'নতুন অ্যাকাউন্ট তৈরি করুন'
                        : 'Register Account'
                      : lang === 'bn'
                      ? 'লগইন করুন'
                      : 'Login'}
                  </span>
                </button>

                {/* Only Super Admin can see register toggle, or first user setup */}
                {!isLoggedIn && (
                  <div className="text-center pt-1">
                    {canRegisterAccounts ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(!isRegisterMode);
                          setError(null);
                        }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        {isRegisterMode
                          ? lang === 'bn'
                            ? 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন'
                            : 'Already have an account? Login'
                          : lang === 'bn'
                          ? 'নতুন স্টাফ তৈরি করতে চান? (সুপার এডমিন)'
                          : 'Create staff account (Super Admin)'}
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {lang === 'bn'
                          ? '⚠️ নতুন সাইন আপ শুধুমাত্র সুপার এডমিন করতে পারেন'
                          : '⚠️ Sign up is restricted to Super Admin only'}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
