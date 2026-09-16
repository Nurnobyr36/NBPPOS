import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Globe,
  PlusCircle,
  Search,
  Store,
  ShoppingCart,
  X,
  Package,
  Receipt,
  ArrowRight,
  Cloud,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { Language, Product, Sale } from '../types';
import { formatMoney } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  onToggleMobileMenu: () => void;
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onQuickAddProduct: () => void;
  onQuickPos?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  shopName: string;
  currencySymbol: string;
  products?: Product[];
  sales?: Sale[];
  onSelectProduct?: (product: Product) => void;
  onSelectSale?: (sale: Sale) => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  onOpenAuthModal?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileMenu,
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onQuickAddProduct,
  onQuickPos,
  searchQuery,
  onSearchChange,
  shopName,
  currencySymbol,
  products = [],
  sales = [],
  onSelectProduct,
  onSelectSale,
  cloudStatus = 'connected',
  onOpenAuthModal,
}) => {
  const { sellerName, currentUser, userProfile } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = searchQuery.toLowerCase().trim();

  const matchedProducts = q
    ? (products || [])
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const matchedSales = q
    ? (sales || [])
        .filter(
          (s) =>
            s.invoiceNo.toLowerCase().includes(q) ||
            (s.customerName || '').toLowerCase().includes(q) ||
            (s.customerPhone || '').includes(q)
        )
        .slice(0, 4)
    : [];

  const hasResults = matchedProducts.length > 0 || matchedSales.length > 0;

  return (
    <header
      id="app-topbar"
      className="no-print h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs"
    >
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg">
        <button
          type="button"
          id="topbar-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div ref={searchContainerRef} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="topbar-search-input"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder={
              lang === 'bn'
                ? 'পণ্য, বারকোড বা ইনভয়েস নম্বর দিয়ে খুঁজুন...'
                : 'Search product, barcode or invoice...'
            }
            className="w-full text-xs pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 border border-transparent dark:border-slate-700/60 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-all dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              id="topbar-clear-search-btn"
              onClick={() => {
                onSearchChange('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {isSearchOpen && q && (
            <div
              id="topbar-search-results-dropdown"
              className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-xs max-h-96 overflow-y-auto"
            >
              {!hasResults ? (
                <div className="p-4 text-center text-slate-400">
                  {lang === 'bn'
                    ? `"${searchQuery}" এর জন্য কিছু পাওয়া যায়নি`
                    : `No results found for "${searchQuery}"`}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {/* Matching Products */}
                  {matchedProducts.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{lang === 'bn' ? 'পণ্যসমূহ' : 'Products'}</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchedProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectProduct?.(p);
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {p.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                SKU: {p.sku} • স্টক: {p.currentStock || 0}{' '}
                                {p.unitName}
                              </p>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {formatMoney(p.salePrice, currencySymbol)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Sales / Invoices */}
                  {matchedSales.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
                      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {lang === 'bn' ? 'বিক্রয় ইনভয়েস' : 'Sales Invoices'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {matchedSales.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onSelectSale?.(s);
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-emerald-700 dark:text-emerald-400 font-mono truncate">
                                {s.invoiceNo}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                কাস্টমার: {s.customerName || 'Walk-in'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {formatMoney(s.total, currencySymbol)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline-block ml-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick actions, Lang, Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Firebase Cloud Status Indicator */}
        <div
          id="topbar-cloud-status"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all select-none bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          title={
            cloudStatus === 'connected'
              ? 'ফায়ারব্যাস ক্লাউড সক্রিয় ও সংযুক্ত'
              : cloudStatus === 'syncing'
              ? 'ক্লাউডে সিঙ্ক হচ্ছে...'
              : 'অফলাইন মোড'
          }
        >
          {cloudStatus === 'syncing' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
          ) : cloudStatus === 'connected' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="text-[11px]">
            {cloudStatus === 'connected' ? (lang === 'bn' ? 'ফায়ারব্যাস সংযুক্ত' : 'Firebase Live') : (lang === 'bn' ? 'অফলাইন' : 'Offline')}
          </span>
        </div>

        {/* Quick POS Launch Button (desktop) */}
        {onQuickPos && (
          <button
            type="button"
            id="topbar-quick-pos-btn"
            onClick={onQuickPos}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'POS বিক্রয়' : 'POS Terminal'}</span>
          </button>
        )}

        {/* Quick Add Product Button */}
        <button
          type="button"
          id="topbar-quick-add-btn"
          onClick={onQuickAddProduct}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {lang === 'bn' ? 'পণ্য যোগ' : 'Add Product'}
          </span>
          <span className="sm:hidden">{lang === 'bn' ? 'পণ্য' : 'Add'}</span>
        </button>

        {/* Shop Name Tag (on desktop) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium">
          <Store className="w-3.5 h-3.5" />
          <span className="truncate max-w-[130px]">{shopName}</span>
          <span className="font-bold text-emerald-600">({currencySymbol})</span>
        </div>

        {/* Active Seller / Cashier Badge & Login Trigger */}
        <button
          type="button"
          id="topbar-seller-auth-btn"
          onClick={onOpenAuthModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300/80 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
          title="ক্যাশিয়ার বা বিক্রেতা প্রোফাইল / লগইন"
        >
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={sellerName}
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <div className={`w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center ${
              userProfile?.role === 'super_admin' ? 'bg-amber-600' : 'bg-emerald-700'
            }`}>
              {sellerName.charAt(0)}
            </div>
          )}
          <span className="max-w-[85px] sm:max-w-[120px] truncate font-bold flex items-center gap-1">
            {sellerName}
            {userProfile?.role === 'super_admin' && (
              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
            )}
          </span>
          <span className="hidden sm:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
            {userProfile?.role === 'super_admin' ? '(সুপার এডমিন)' : (userProfile?.role === 'admin' || userProfile?.staffCode) ? '(এডমিন)' : '(বিক্রেতা)'}
          </span>
        </button>

        {/* Language Toggle */}
        <button
          type="button"
          id="topbar-lang-toggle-btn"
          onClick={onToggleLang}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          title="ভাষা পরিবর্তন করুন / Switch language"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          id="topbar-theme-toggle-btn"
          onClick={onToggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle theme"
          title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
