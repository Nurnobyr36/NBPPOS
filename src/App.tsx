import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TabType, Language, Product, Sale, Customer, Supplier, Purchase, ShopSettings } from './types';
import {
  getProducts,
  getSales,
  getPurchases,
  getCustomers,
  getSuppliers,
  getStockMovements,
  getShopSettings,
  saveProducts,
  saveSales,
  savePurchases,
  saveCustomers,
  saveSuppliers,
  saveShopSettings,
  isDeletedId,
} from './services/storage';
import {
  testConnection,
  subscribeToProducts,
  subscribeToSales,
  subscribeToPurchases,
  subscribeToCustomers,
  subscribeToSuppliers,
  subscribeToStockMovements,
  subscribeToShopSettings,
  syncProductToFirestore,
  syncCustomerToFirestore,
  syncSupplierToFirestore,
  syncSaleToFirestore,
  syncPurchaseToFirestore,
  syncStockMovementToFirestore,
  syncShopSettingsToFirestore,
  isLegacyMockId,
  purgeLegacyMockDataFromFirestore,
  reconnectFirestoreNetwork,
  fetchLatestCloudData,
} from './services/firebase';
import { subscribeToSync } from './services/realtimeSync';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { ProductsView } from './views/ProductsView';
import { ProductFormView } from './views/ProductFormView';
import { StockView } from './views/StockView';
import { PurchasesView } from './views/PurchasesView';
import { PurchaseFormView } from './views/PurchaseFormView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { SalesView } from './views/SalesView';
import { InvoiceView } from './views/InvoiceView';
import { SettingsView } from './views/SettingsView';
import { AuthModal } from './components/AuthModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { useAuth } from './context/AuthContext';

export function App() {
  const { isPOSAuthorized, loading: authLoading } = useAuth();
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // App settings & theme
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('smartshop_dark_mode') === 'true';
  });
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('smartshop_lang') as Language) || 'bn';
  });

  // Core data states
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(getShopSettings());

  // Transient selection states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);

  // Low stock calculation for sidebar badge & alerts
  const lowStockCount = useMemo(() => {
    return (products || []).filter(
      (p) => (p.currentStock || 0) <= (p.minStock || 5)
    ).length;
  }, [products]);

  // Cloud sync status state
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [realtimeNotice, setRealtimeNotice] = useState<{
    message: string;
    type: 'sale' | 'stock' | 'sync';
  } | null>(null);

  // Tracking refs to detect remote changes from other phones/devices
  const isInitialLoadDoneRef = useRef(false);
  const knownSaleIdsRef = useRef<Set<string>>(new Set());
  const knownStockMapRef = useRef<Map<string, number>>(new Map());

  // Load all data from storage
  const loadData = useCallback(() => {
    setProducts(getProducts() || []);
    setSales(getSales() || []);
    setPurchases(getPurchases() || []);
    setCustomers(getCustomers() || []);
    setSuppliers(getSuppliers() || []);
    setStockMovements(getStockMovements() || []);
    setShopSettings(getShopSettings());
  }, []);

  useEffect(() => {
    // Initial local load
    loadData();

    // Test cloud connection as required by Firebase skill
    testConnection()
      .then((connected) => {
        setCloudStatus(connected ? 'connected' : 'offline');
      })
      .catch(() => {
        setCloudStatus('offline');
      });

    // Real-time synchronization listeners with bidirectional persistence
    const unsubProducts = subscribeToProducts(
      (cloudProds) => {
        const cleanCloud = (cloudProds || []).filter((p) => !isLegacyMockId(p.id));
        const localProds = (getProducts() || []).filter((p) => !isLegacyMockId(p.id));

        const cloudMap = new Map<string, Product>();
        cleanCloud.forEach((p) => cloudMap.set(p.id, p));

        const localMap = new Map<string, Product>();
        localProds.forEach((p) => localMap.set(p.id, p));

        const allIds = new Set<string>([...cloudMap.keys(), ...localMap.keys()]);
        const resultMap = new Map<string, Product>();

        allIds.forEach((id) => {
          if (isDeletedId('products', id)) {
            return;
          }
          const cloudItem = cloudMap.get(id);
          const localItem = localMap.get(id);

          if (cloudItem && localItem) {
            const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();

            if (localTime > cloudTime) {
              // Local product was edited more recently! Keep local version and push to cloud
              resultMap.set(id, localItem);
              syncProductToFirestore(localItem).catch((e) =>
                console.warn('Sync newer local product to Firestore:', e)
              );
            } else {
              // Cloud product is newer or equal (e.g. from another mobile phone)
              resultMap.set(id, cloudItem);
            }
          } else if (cloudItem) {
            resultMap.set(id, cloudItem);
          } else if (localItem) {
            resultMap.set(id, localItem);
            if (isInitialLoadDoneRef.current) {
              syncProductToFirestore(localItem).catch((e) =>
                console.warn('Auto-sync product to Firestore notice:', e)
              );
            }
          }
        });

        const merged = Array.from(resultMap.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Detect remote stock changes from other mobile phones
        if (isInitialLoadDoneRef.current) {
          let stockChanged = false;
          cleanCloud.forEach((cp) => {
            const oldStock = knownStockMapRef.current.get(cp.id);
            if (oldStock !== undefined && oldStock !== cp.currentStock) {
              stockChanged = true;
            }
          });
          if (stockChanged) {
            setRealtimeNotice({
              message: '⚡ অটো-সিঙ্ক: অন্য মোবাইল থেকে পণ্যের স্টক রিয়েল-টাইমে আপডেট হয়েছে!',
              type: 'stock',
            });
            setTimeout(() => setRealtimeNotice((prev) => prev?.type === 'stock' ? null : prev), 3500);
          }
        }

        // Update known stocks
        merged.forEach((p) => knownStockMapRef.current.set(p.id, p.currentStock || 0));

        setProducts(merged);
        saveProducts(merged);
        setCloudStatus('connected');
      },
      () => setCloudStatus('offline')
    );

    const unsubSales = subscribeToSales(
      (cloudSales) => {
        const cleanCloud = (cloudSales || []).filter((s) => !isLegacyMockId(s.id));
        const localSales = (getSales() || []).filter((s) => !isLegacyMockId(s.id));

        const cloudMap = new Map<string, Sale>();
        cleanCloud.forEach((s) => cloudMap.set(s.id, s));

        const localMap = new Map<string, Sale>();
        localSales.forEach((s) => localMap.set(s.id, s));

        const allIds = new Set<string>([...cloudMap.keys(), ...localMap.keys()]);
        const resultMap = new Map<string, Sale>();

        allIds.forEach((id) => {
          if (isDeletedId('sales', id)) {
            return;
          }
          const cloudItem = cloudMap.get(id);
          const localItem = localMap.get(id);

          if (cloudItem && localItem) {
            const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();

            if (localTime > cloudTime) {
              resultMap.set(id, localItem);
              syncSaleToFirestore(localItem).catch(() => {});
            } else {
              resultMap.set(id, cloudItem);
            }
          } else if (cloudItem) {
            resultMap.set(id, cloudItem);
          } else if (localItem) {
            resultMap.set(id, localItem);
            syncSaleToFirestore(localItem).catch(() => {});
          }
        });

        const merged = Array.from(resultMap.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Detect new remote sales from other phones
        if (isInitialLoadDoneRef.current) {
          const newRemoteSales = cleanCloud.filter((s) => !knownSaleIdsRef.current.has(s.id));
          if (newRemoteSales.length > 0) {
            const newest = newRemoteSales[0];
            setRealtimeNotice({
              message: `⚡ অটো-সিঙ্ক: অন্য মোবাইল থেকে নতুন বিক্রয় সম্পন্ন হয়েছে (#${newest.invoiceNo}) • স্টক ও হিসাব আপডেট হয়েছে!`,
              type: 'sale',
            });
            setTimeout(() => setRealtimeNotice((prev) => prev?.message.includes(newest.invoiceNo) ? null : prev), 4500);
          }
        }

        // Update known sales
        merged.forEach((s) => knownSaleIdsRef.current.add(s.id));

        setSales(merged);
        saveSales(merged);
      },
      () => setCloudStatus('offline')
    );

    const unsubPurchases = subscribeToPurchases(
      (cloudPurchases) => {
        const cleanCloud = (cloudPurchases || []).filter((p) => !isLegacyMockId(p.id));
        const localPurchases = (getPurchases() || []).filter((p) => !isLegacyMockId(p.id));

        const map = new Map<string, Purchase>();
        cleanCloud.forEach((p) => map.set(p.id, p));

        localPurchases.forEach((local) => {
          if (!map.has(local.id) && !isDeletedId('purchases', local.id)) {
            map.set(local.id, local);
            syncPurchaseToFirestore(local).catch((e) =>
              console.warn('Auto-sync purchase to Firestore notice:', e)
            );
          }
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPurchases(merged);
        savePurchases(merged);
      },
      () => setCloudStatus('offline')
    );

    const unsubCustomers = subscribeToCustomers(
      (cloudCusts) => {
        const cleanCloud = (cloudCusts || []).filter((c) => !isLegacyMockId(c.id));
        const localCusts = (getCustomers() || []).filter((c) => !isLegacyMockId(c.id));

        const map = new Map<string, Customer>();
        cleanCloud.forEach((c) => map.set(c.id, c));

        localCusts.forEach((local) => {
          if (!map.has(local.id) && !isDeletedId('customers', local.id)) {
            map.set(local.id, local);
            syncCustomerToFirestore(local).catch((e) =>
              console.warn('Auto-sync customer to Firestore notice:', e)
            );
          }
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setCustomers(merged);
        saveCustomers(merged);
      },
      () => setCloudStatus('offline')
    );

    const unsubSuppliers = subscribeToSuppliers(
      (cloudSups) => {
        const cleanCloud = (cloudSups || []).filter((s) => !isLegacyMockId(s.id));
        const localSups = (getSuppliers() || []).filter((s) => !isLegacyMockId(s.id));

        const map = new Map<string, Supplier>();
        cleanCloud.forEach((s) => map.set(s.id, s));

        localSups.forEach((local) => {
          if (!map.has(local.id) && !isDeletedId('suppliers', local.id)) {
            map.set(local.id, local);
            syncSupplierToFirestore(local).catch((e) =>
              console.warn('Auto-sync supplier to Firestore notice:', e)
            );
          }
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSuppliers(merged);
        saveSuppliers(merged);
      },
      () => setCloudStatus('offline')
    );

    const unsubMovements = subscribeToStockMovements(
      (cloudMovs) => {
        const cleanCloud = (cloudMovs || []).filter((m) => !isLegacyMockId(m.id));
        const localMovs = (getStockMovements() || []).filter((m) => !isLegacyMockId(m.id));

        const map = new Map<string, any>();
        cleanCloud.forEach((m) => map.set(m.id, m));
        localMovs.forEach((local) => {
          if (!map.has(local.id)) {
            map.set(local.id, local);
            syncStockMovementToFirestore(local).catch(() => {});
          }
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setStockMovements(merged);
      },
      () => setCloudStatus('offline')
    );

    const unsubSettings = subscribeToShopSettings(
      (cloudSettings) => {
        if (cloudSettings && cloudSettings.shopName && cloudSettings.shopName !== 'স্মার্টশপ জেনারেল স্টোর') {
          setShopSettings(cloudSettings);
          saveShopSettings(cloudSettings);
        } else {
          const locals = getShopSettings();
          if (locals && locals.shopName) {
            setShopSettings(locals);
            saveShopSettings(locals);
            syncShopSettingsToFirestore(locals).catch(() => {});
          }
        }
      },
      () => setCloudStatus('offline')
    );

    return () => {
      unsubProducts();
      unsubSales();
      unsubPurchases();
      unsubCustomers();
      unsubSuppliers();
      unsubMovements();
      unsubSettings();
    };
  }, [loadData]);

  // Mark initial load done after first sync cycle so subsequent updates show notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoadDoneRef.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Multi-device & mobile lifecycle listeners:
  // Wakes up network and fetches fresh data when mobile phone screen is unlocked or app tab focused
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        reconnectFirestoreNetwork().catch(console.warn);
        fetchLatestCloudData()
          .then(({ products: cp, sales: cs, stockMovements: cm }) => {
            if (cp && cp.length > 0) {
              setProducts(cp);
              saveProducts(cp);
            }
            if (cs && cs.length > 0) {
              setSales(cs);
              saveSales(cs);
            }
            if (cm && cm.length > 0) {
              setStockMovements(cm);
            }
            setCloudStatus('connected');
          })
          .catch(() => {});
      }
    };

    const handleOnline = () => {
      reconnectFirestoreNetwork().catch(console.warn);
      loadData();
      setCloudStatus('connected');
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    window.addEventListener('online', handleOnline);

    // Cross-tab broadcast listener on same device
    const unsubBroadcast = subscribeToSync(() => {
      loadData();
    });

    // Periodic heartbeat (every 12s) to keep mobile sockets active & verify connection
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        testConnection()
          .then((ok) => setCloudStatus(ok ? 'connected' : 'offline'))
          .catch(() => setCloudStatus('offline'));
      }
    }, 12000);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('online', handleOnline);
      unsubBroadcast();
      clearInterval(heartbeatTimer);
    };
  }, [loadData]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartshop_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartshop_dark_mode', 'false');
    }
  }, [darkMode]);

  // Language effect
  const handleToggleLang = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    localStorage.setItem('smartshop_lang', nextLang);
  };

  const currencySymbol = shopSettings.currencySymbol || '৳';

  // Navigation handlers
  const handleGoToPos = () => {
    setActiveTab('pos');
    setMobileMenuOpen(false);
    if (!isPOSAuthorized && !authLoading) {
      setIsAuthModalOpen(true);
    }
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setActiveTab('product-new');
    setMobileMenuOpen(false);
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setActiveTab('product-edit');
  };

  const handleViewInvoice = (sale: Sale) => {
    setActiveInvoice(sale);
    setActiveTab('invoice-view');
  };

  const handleOpenStockAdjust = (p: Product) => {
    setAdjustModalProduct(p);
    setActiveTab('stock');
  };

  const handleCheckoutComplete = (newSale: Sale) => {
    loadData();
    setActiveInvoice(newSale);
    setActiveTab('invoice-view');
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab as TabType);
          setMobileMenuOpen(false);
        }}
        lang={lang}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        lowStockCount={lowStockCount}
        shopName={shopSettings.shopName}
        logoUrl={shopSettings.logoUrl}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenStaffManagement={() => setIsStaffModalOpen(true)}
      />

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar Navigation */}
        <Topbar
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          lang={lang}
          onToggleLang={handleToggleLang}
          isDark={darkMode}
          onToggleTheme={() => setDarkMode((prev) => !prev)}
          onQuickAddProduct={handleAddNewProduct}
          onQuickPos={handleGoToPos}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          shopName={shopSettings.shopName}
          currencySymbol={currencySymbol}
          products={products}
          sales={sales}
          cloudStatus={cloudStatus}
          onRefreshData={loadData}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSelectProduct={(product) => {
            setEditingProduct(product);
            setActiveTab('product-edit');
            setSearchQuery('');
          }}
          onSelectSale={(sale) => {
            setActiveInvoice(sale);
            setActiveTab('invoice-view');
            setSearchQuery('');
          }}
        />

        {/* Real-time Multi-Device Sync Live Notification Toast */}
        {realtimeNotice && (
          <div className="fixed top-16 right-3 sm:right-6 z-50 animate-bounce bg-emerald-700 dark:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center gap-2.5 text-xs font-bold transition-all max-w-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="flex-1">{realtimeNotice.message}</span>
            <button
              type="button"
              onClick={() => setRealtimeNotice(null)}
              className="p-1 hover:bg-white/20 rounded-md shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              sales={sales}
              customers={customers}
              currencySymbol={currencySymbol}
              lang={lang}
              onNavigate={(tab) => setActiveTab(tab as TabType)}
              onViewInvoice={handleViewInvoice}
              onAdjustStockModal={handleOpenStockAdjust}
            />
          )}

          {activeTab === 'pos' && (
            <PosView
              products={products}
              customers={customers}
              currencySymbol={currencySymbol}
              lang={lang}
              defaultVatRate={shopSettings.defaultVatRate || 0}
              onSaleComplete={handleCheckoutComplete}
              onCheckoutComplete={handleCheckoutComplete}
              onRefreshData={loadData}
              onOpenProductForm={handleAddNewProduct}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              currencySymbol={currencySymbol}
              lang={lang}
              onAddNew={handleAddNewProduct}
              onEdit={handleEditProduct}
              onAdjustStock={handleOpenStockAdjust}
              onRefreshData={loadData}
            />
          )}

          {(activeTab === 'product-new' || activeTab === 'product-edit') && (
            <ProductFormView
              initialProduct={editingProduct}
              suppliers={suppliers}
              currencySymbol={currencySymbol}
              lang={lang}
              onBack={() => {
                setEditingProduct(null);
                setActiveTab('products');
              }}
              onSaved={() => {
                setEditingProduct(null);
                loadData();
                setActiveTab('products');
              }}
            />
          )}

          {activeTab === 'stock' && (
            <StockView
              products={products}
              movements={stockMovements}
              currencySymbol={currencySymbol}
              lang={lang}
              onRefreshData={loadData}
              activeProductForModal={adjustModalProduct}
              onCloseModal={() => setAdjustModalProduct(null)}
              onEditProduct={handleEditProduct}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              purchases={purchases}
              suppliers={suppliers}
              currencySymbol={currencySymbol}
              lang={lang}
              onNewPurchase={() => setActiveTab('purchase-new')}
            />
          )}

          {activeTab === 'purchase-new' && (
            <PurchaseFormView
              products={products}
              suppliers={suppliers}
              currencySymbol={currencySymbol}
              lang={lang}
              onBack={() => setActiveTab('purchases')}
              onSaved={() => {
                loadData();
                setActiveTab('purchases');
              }}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              currencySymbol={currencySymbol}
              lang={lang}
              onRefreshData={loadData}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              currencySymbol={currencySymbol}
              lang={lang}
              onRefreshData={loadData}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={sales}
              products={products}
              customers={customers}
              currencySymbol={currencySymbol}
              lang={lang}
              onViewInvoice={handleViewInvoice}
              onNewSale={handleGoToPos}
              onRefreshData={loadData}
            />
          )}

          {activeTab === 'invoice-view' && activeInvoice && (
            <InvoiceView
              sale={activeInvoice}
              products={products}
              shopSettings={shopSettings}
              currencySymbol={currencySymbol}
              lang={lang}
              onBack={() => setActiveTab('sales')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={shopSettings}
              lang={lang}
              onSaved={(updated) => {
                setShopSettings(updated);
                loadData();
              }}
              onResetDemo={loadData}
              onOpenStaffManagement={() => setIsStaffModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Auth & Seller Management Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        onOpenStaffManagement={() => setIsStaffModalOpen(true)}
      />

      {/* Staff Management Modal for Designated Admins */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* PWA Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default App;
