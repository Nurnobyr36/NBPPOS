import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  ShoppingBag,
  Receipt,
  Users,
  Truck,
  Settings,
  X,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/formatters';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  lowStockCount?: number;
  shopName?: string;
  logoUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  lang,
  isOpenMobile,
  onCloseMobile,
  lowStockCount = 0,
  shopName = 'SmartShop POS',
  logoUrl,
}) => {
  const t = translations[lang];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'pos', label: t.pos, icon: ShoppingCart, highlight: true },
    { id: 'products', label: t.products, icon: Package },
    {
      id: 'stock',
      label: t.stock,
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'purchases', label: t.purchases, icon: ShoppingBag },
    { id: 'sales', label: t.sales, icon: Receipt },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'suppliers', label: t.suppliers, icon: Truck },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const isItemActive = (id: string) => {
    if (currentTab === id) return true;
    if (id === 'products' && (currentTab === 'product-new' || currentTab === 'product-edit')) return true;
    if (id === 'purchases' && currentTab === 'purchase-new') return true;
    if (id === 'sales' && currentTab === 'invoice-view') return true;
    return false;
  };

  const handleNav = (id: string) => {
    onSelectTab(id);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 h-full shrink-0 bg-emerald-950 text-emerald-50 flex flex-col border-r border-emerald-900/70 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-900/60 bg-emerald-950/80 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer group"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Shop Logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-emerald-700/60 shadow-md shrink-0 bg-white"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-900/40 shrink-0 transition-colors">
                SS
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-tight text-white truncate">
                {shopName || 'SmartShop POS'}
              </h1>
              <p className="text-[11px] text-emerald-400/90 font-medium">স্মার্টশপ পিওএস</p>
            </div>
          </button>
          <button
            type="button"
            id="sidebar-close-mobile-btn"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/50 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick POS Launch Button */}
        <div className="p-3">
          <button
            type="button"
            id="sidebar-quick-pos-btn"
            onClick={() => handleNav('pos')}
            className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              currentTab === 'pos'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t.pos} টার্মিনাল</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-thin">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-inner font-bold'
                    : 'text-emerald-200/80 hover:bg-emerald-900/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-3 border-t border-emerald-900/60 bg-emerald-950/90 text-xs">
          {lowStockCount > 0 && (
            <button
              type="button"
              id="sidebar-low-stock-alert"
              onClick={() => handleNav('stock')}
              className="w-full mb-2 p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-center gap-2 cursor-pointer hover:bg-rose-900/80 transition-colors text-left"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-[11px] leading-tight">
                {lowStockCount} টি পণ্যের স্টক শেষ বা কম!
              </span>
            </button>
          )}
          <div className="flex items-center justify-between text-emerald-400/80 text-[11px]">
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> অনলাইন অ্যাক্টিভ
            </span>
            <span>v2.5 Pro</span>
          </div>
        </div>
      </aside>
    </>
  );
};
