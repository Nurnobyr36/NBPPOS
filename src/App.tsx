import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  syncShopSettingsToFirestore,
  isLegacyMockId,
  purgeLegacyMockDataFromFirestore,
} from './services/firebase';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
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

export function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

    // Automatically purge any remaining legacy mock items in Firestore collections
    purgeLegacyMockDataFromFirestore().catch((err) =>
      console.warn('purgeLegacyMockDataFromFirestore notice:', err)
    );

    // Real-time synchronization listeners (excluding any legacy mock objects)
    const unsubProducts = subscribeToProducts(
      (cloudProds) => {
        const cleanProds = (cloudProds || []).filter((p) => !isLegacyMockId(p.id));
        if (cleanProds.length > 0 || (cloudProds && cloudProds.length > 0)) {
          setProducts(cleanProds);
          saveProducts(cleanProds);
        } else {
          const locals = (getProducts() || []).filter((p) => !isLegacyMockId(p.id));
          setProducts(locals);
        }
        setCloudStatus('connected');
      },
      () => setCloudStatus('offline')
    );

    const unsubSales = subscribeToSales(
      (cloudSales) => {
        const cleanSales = (cloudSales || []).filter((s) => !isLegacyMockId(s.id));
        if (cleanSales.length > 0 || (cloudSales && cloudSales.length > 0)) {
          setSales(cleanSales);
          saveSales(cleanSales);
        } else {
          const locals = (getSales() || []).filter((s) => !isLegacyMockId(s.id));
          setSales(locals);
        }
      },
      () => setCloudStatus('offline')
    );

    const unsubPurchases = subscribeToPurchases(
      (cloudPurchases) => {
        const cleanPurchases = (cloudPurchases || []).filter((p) => !isLegacyMockId(p.id));
        if (cleanPurchases.length > 0 || (cloudPurchases && cloudPurchases.length > 0)) {
          setPurchases(cleanPurchases);
          savePurchases(cleanPurchases);
        } else {
          const locals = (getPurchases() || []).filter((p) => !isLegacyMockId(p.id));
          setPurchases(locals);
        }
      },
      () => setCloudStatus('offline')
    );

    const unsubCustomers = subscribeToCustomers(
      (cloudCusts) => {
        const cleanCusts = (cloudCusts || []).filter((c) => !isLegacyMockId(c.id));
        if (cleanCusts.length > 0 || (cloudCusts && cloudCusts.length > 0)) {
          setCustomers(cleanCusts);
          saveCustomers(cleanCusts);
        } else {
          const locals = (getCustomers() || []).filter((c) => !isLegacyMockId(c.id));
          setCustomers(locals);
        }
      },
      () => setCloudStatus('offline')
    );

    const unsubSuppliers = subscribeToSuppliers(
      (cloudSups) => {
        const cleanSups = (cloudSups || []).filter((s) => !isLegacyMockId(s.id));
        if (cleanSups.length > 0 || (cloudSups && cloudSups.length > 0)) {
          setSuppliers(cleanSups);
          saveSuppliers(cleanSups);
        } else {
          const locals = (getSuppliers() || []).filter((s) => !isLegacyMockId(s.id));
          setSuppliers(locals);
        }
      },
      () => setCloudStatus('offline')
    );

    const unsubMovements = subscribeToStockMovements(
      (cloudMovs) => {
        const cleanMovs = (cloudMovs || []).filter((m) => !isLegacyMockId(m.id));
        setStockMovements(cleanMovs);
      },
      () => setCloudStatus('offline')
    );

    const unsubSettings = subscribeToShopSettings(
      (cloudSettings) => {
        if (cloudSettings && cloudSettings.shopName) {
          setShopSettings(cloudSettings);
          saveShopSettings(cloudSettings);
        } else {
          const locals = getShopSettings();
          if (locals) {
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
              onBack={() => setActiveTab('products')}
              onSaved={() => {
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
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
