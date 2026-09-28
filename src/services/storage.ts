import { Product, Customer, Supplier, Sale, Purchase, ShopSettings, StockMovement } from '../types';
import {
  initialProducts,
  initialCustomers,
  initialSuppliers,
  initialSales,
  initialPurchases,
  initialShopSettings,
  initialStockMovements,
} from '../data/mockData';
import {
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncSaleToFirestore,
  deleteSaleFromFirestore,
  syncPurchaseToFirestore,
  syncCustomerToFirestore,
  syncSupplierToFirestore,
  syncStockMovementToFirestore,
  syncShopSettingsToFirestore,
  syncSaleAndStockBatchToFirestore,
  syncStockAdjustmentBatchToFirestore,
  syncPurchaseAndStockBatchToFirestore,
} from './firebase';
import { broadcastSync } from './realtimeSync';

const STORAGE_KEYS = {
  PRODUCTS: 'ssp_products_v1',
  CUSTOMERS: 'ssp_customers_v1',
  SUPPLIERS: 'ssp_suppliers_v1',
  SALES: 'ssp_sales_v1',
  PURCHASES: 'ssp_purchases_v1',
  SETTINGS: 'ssp_settings_v1',
  STOCK_MOVEMENTS: 'ssp_movements_v1',
  LANG: 'ssp_lang_v1',
  THEME: 'ssp_theme_v1',
};

const DELETED_KEYS_PREFIX = 'ssp_deleted_ids_';

export function markDeletedId(collectionName: string, id: string): void {
  try {
    const key = DELETED_KEYS_PREFIX + collectionName;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      if (list.length > 300) list.shift();
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('markDeletedId error:', e);
  }
}

export function unmarkDeletedId(collectionName: string, id: string): void {
  try {
    const key = DELETED_KEYS_PREFIX + collectionName;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const list: string[] = JSON.parse(raw);
    const filtered = list.filter((item) => item !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.warn('unmarkDeletedId error:', e);
  }
}

export function isDeletedId(collectionName: string, id: string): boolean {
  try {
    const key = DELETED_KEYS_PREFIX + collectionName;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return list.includes(id);
  } catch {
    return false;
  }
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// ---------------- PRODUCTS ----------------
export function getProducts(): Product[] {
  return safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
}

export function saveProducts(products: Product[]): void {
  safeSet(STORAGE_KEYS.PRODUCTS, products);
}

export function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    id: 'prod-' + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  unmarkDeletedId('products', newProduct.id);
  products.unshift(newProduct);
  saveProducts(products);

  // Cloud sync
  syncProductToFirestore(newProduct).catch((e) => console.warn('Firestore syncProduct error:', e));
  broadcastSync('product', 'create', newProduct, newProduct.id);

  // Record opening stock movement if any
  if (newProduct.currentStock > 0) {
    addStockMovement({
      productId: newProduct.id,
      productName: newProduct.name,
      type: 'purchase',
      qtyChange: newProduct.currentStock,
      resultingStock: newProduct.currentStock,
      reason: 'প্রারম্ভিক স্টক এন্ট্রি',
    });
  }

  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveProducts(products);

  // Cloud sync
  syncProductToFirestore(products[index]).catch((e) => console.warn('Firestore syncProduct error:', e));
  broadcastSync('product', 'update', products[index], products[index].id);

  return products[index];
}

export function deleteProduct(id: string): boolean {
  markDeletedId('products', id);
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  saveProducts(filtered);

  // Cloud sync
  deleteProductFromFirestore(id).catch((e) => console.warn('Firestore deleteProduct error:', e));
  broadcastSync('product', 'delete', { id }, id);

  return true;
}

// ---------------- STOCK ADJUSTMENT ----------------
export function adjustProductStock(productId: string, qtyChange: number, reason: string): boolean {
  const products = getProducts();
  const p = products.find((item) => item.id === productId);
  if (!p) return false;

  const newStock = Math.max(0, (p.currentStock || 0) + qtyChange);
  p.currentStock = newStock;
  p.updatedAt = new Date().toISOString();
  saveProducts(products);

  const newMov: StockMovement = {
    id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    productId: p.id,
    productName: p.name,
    type: 'adjustment',
    qtyChange,
    resultingStock: newStock,
    reason,
    createdAt: new Date().toISOString(),
  };

  const allMovs = getStockMovements();
  allMovs.unshift(newMov);
  safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, allMovs);

  // Atomic batch to Firestore
  syncStockAdjustmentBatchToFirestore(p, newMov).catch((e) =>
    console.warn('Firestore adjustStock sync error:', e)
  );

  // Instant broadcast to all tabs
  broadcastSync('stock', 'update', { productId: p.id, newStock, product: p });

  return true;
}

// ---------------- SALES ----------------
export function getSales(): Sale[] {
  return safeGet<Sale[]>(STORAGE_KEYS.SALES, initialSales);
}

export function saveSales(sales: Sale[]): void {
  safeSet(STORAGE_KEYS.SALES, sales);
}

export function createSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Sale {
  const sales = getSales();
  const newSale: Sale = {
    ...saleData,
    id: 'sale-' + Date.now(),
    createdAt: new Date().toISOString(),
  };

  sales.unshift(newSale);
  saveSales(sales);

  // Deduct stocks and log movements
  const products = getProducts();
  const updatedProducts: Product[] = [];
  const movements: StockMovement[] = [];

  newSale.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      const resulting = Math.max(0, (prod.currentStock || 0) - item.qty);
      prod.currentStock = resulting;
      prod.updatedAt = new Date().toISOString();
      updatedProducts.push({ ...prod });

      const newMov: StockMovement = {
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        productId: prod.id,
        productName: prod.name,
        type: 'sale',
        qtyChange: -item.qty,
        resultingStock: resulting,
        reason: `ইনভয়েস #${newSale.invoiceNo} বিক্রয়`,
        createdAt: new Date().toISOString(),
      };
      movements.push(newMov);
    }
  });
  saveProducts(products);

  if (movements.length > 0) {
    const allMovs = getStockMovements();
    movements.forEach((m) => allMovs.unshift(m));
    safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, allMovs);
  }

  // Update customer due and total purchase
  let updatedCustomer: Customer | undefined;
  if (newSale.customerId) {
    const customers = getCustomers();
    const cust = customers.find((c) => c.id === newSale.customerId);
    if (cust) {
      cust.totalPurchase = (cust.totalPurchase || 0) + newSale.total;
      cust.currentDue = (cust.currentDue || 0) + newSale.dueAmount;
      saveCustomers(customers);
      updatedCustomer = { ...cust };
    }
  }

  // ATOMIC FIRESTORE CLOUD BATCH WRITE:
  // Guarantees all connected mobiles receive the sale & stock update in the exact same snapshot
  syncSaleAndStockBatchToFirestore(newSale, updatedProducts, movements, updatedCustomer).catch((e) =>
    console.warn('Firestore syncSaleAndStockBatchToFirestore error:', e)
  );

  // Instant broadcast to all tabs on this device
  broadcastSync('sale', 'create', newSale, newSale.id);
  broadcastSync('stock', 'update', { products: updatedProducts });

  return newSale;
}

export function deleteSale(saleId: string, restoreStock: boolean = true): boolean {
  markDeletedId('sales', saleId);
  const sales = getSales();
  const targetSale = sales.find((s) => s.id === saleId);
  if (!targetSale) return false;

  // 1. If restoreStock is true, return the sold quantities back to inventory
  if (restoreStock && Array.isArray(targetSale.items)) {
    const products = getProducts();
    targetSale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const resulting = (prod.currentStock || 0) + item.qty;
        prod.currentStock = resulting;
        syncProductToFirestore(prod).catch((e) =>
          console.warn('Firestore updateStock sync error on deleteSale:', e)
        );
        addStockMovement({
          productId: prod.id,
          productName: prod.name,
          type: 'adjustment',
          qtyChange: item.qty,
          resultingStock: resulting,
          reason: `ইনভয়েস #${targetSale.invoiceNo} বাতিল/মুছে ফেলায় স্টক ফেরত`,
        });
      }
    });
    saveProducts(products);
  }

  // 2. Adjust customer balances if sale had customerId
  if (targetSale.customerId) {
    const customers = getCustomers();
    const cust = customers.find((c) => c.id === targetSale.customerId);
    if (cust) {
      cust.totalPurchase = Math.max(0, (cust.totalPurchase || 0) - (targetSale.total || 0));
      cust.currentDue = Math.max(0, (cust.currentDue || 0) - (targetSale.dueAmount || 0));
      saveCustomers(customers);
      syncCustomerToFirestore(cust).catch((e) =>
        console.warn('Firestore customer sync error on deleteSale:', e)
      );
    }
  }

  // 3. Remove from sales list and sync deletion to Firestore
  const updatedSales = sales.filter((s) => s.id !== saleId);
  saveSales(updatedSales);
  deleteSaleFromFirestore(saleId).catch((e) =>
    console.warn('Firestore deleteSaleFromFirestore error:', e)
  );

  broadcastSync('sale', 'delete', { id: saleId }, saleId);
  if (restoreStock) {
    broadcastSync('stock', 'update', { products: getProducts() });
  }

  return true;
}

export function updateSale(updatedSale: Sale, adjustStockDiff: boolean = true): Sale {
  const sales = getSales();
  const oldSale = sales.find((s) => s.id === updatedSale.id);

  // 1. Stock delta adjustments
  if (oldSale && adjustStockDiff) {
    const products = getProducts();
    const oldQtyMap: Record<string, number> = {};
    oldSale.items.forEach((item) => {
      oldQtyMap[item.productId] = (oldQtyMap[item.productId] || 0) + item.qty;
    });

    const newQtyMap: Record<string, number> = {};
    updatedSale.items.forEach((item) => {
      newQtyMap[item.productId] = (newQtyMap[item.productId] || 0) + item.qty;
    });

    const allProdIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]);
    allProdIds.forEach((pId) => {
      const oldQ = oldQtyMap[pId] || 0;
      const newQ = newQtyMap[pId] || 0;
      const diff = newQ - oldQ;
      if (diff !== 0) {
        const prod = products.find((p) => p.id === pId);
        if (prod) {
          const resulting = Math.max(0, (prod.currentStock || 0) - diff);
          prod.currentStock = resulting;
          prod.updatedAt = new Date().toISOString();
          syncProductToFirestore(prod).catch((e) =>
            console.warn('Firestore syncProduct error on updateSale:', e)
          );
          addStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'adjustment',
            qtyChange: -diff,
            resultingStock: resulting,
            reason: `ইনভয়েস #${updatedSale.invoiceNo} এডিটে পরিমাণ পরিবর্তন`,
          });
        }
      }
    });
    saveProducts(products);
    broadcastSync('stock', 'update', { products });
  }

  // 2. Adjust customer balances if customer or amounts changed
  if (oldSale) {
    const customers = getCustomers();
    if (oldSale.customerId && oldSale.customerId === updatedSale.customerId) {
      const cust = customers.find((c) => c.id === oldSale.customerId);
      if (cust) {
        cust.totalPurchase = Math.max(0, (cust.totalPurchase || 0) - oldSale.total + updatedSale.total);
        cust.currentDue = Math.max(0, (cust.currentDue || 0) - oldSale.dueAmount + updatedSale.dueAmount);
        saveCustomers(customers);
        syncCustomerToFirestore(cust).catch((e) =>
          console.warn('Firestore customer sync error on updateSale:', e)
        );
      }
    } else {
      if (oldSale.customerId) {
        const oldCust = customers.find((c) => c.id === oldSale.customerId);
        if (oldCust) {
          oldCust.totalPurchase = Math.max(0, (oldCust.totalPurchase || 0) - oldSale.total);
          oldCust.currentDue = Math.max(0, (oldCust.currentDue || 0) - oldSale.dueAmount);
          syncCustomerToFirestore(oldCust).catch(console.warn);
        }
      }
      if (updatedSale.customerId) {
        const newCust = customers.find((c) => c.id === updatedSale.customerId);
        if (newCust) {
          newCust.totalPurchase = (newCust.totalPurchase || 0) + updatedSale.total;
          newCust.currentDue = (newCust.currentDue || 0) + updatedSale.dueAmount;
          syncCustomerToFirestore(newCust).catch(console.warn);
        }
      }
      saveCustomers(customers);
    }
  }

  // 3. Update sale in storage and Firestore
  const newSales = sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));
  saveSales(newSales);
  syncSaleToFirestore(updatedSale).catch((e) =>
    console.warn('Firestore updateSale sync error:', e)
  );

  broadcastSync('sale', 'update', updatedSale, updatedSale.id);

  return updatedSale;
}

// ---------------- PURCHASES ----------------
export function getPurchases(): Purchase[] {
  return safeGet<Purchase[]>(STORAGE_KEYS.PURCHASES, initialPurchases);
}

export function savePurchases(purchases: Purchase[]): void {
  safeSet(STORAGE_KEYS.PURCHASES, purchases);
}

export function createPurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt'>): Purchase {
  const purchases = getPurchases();
  const newPurchase: Purchase = {
    ...purchaseData,
    id: 'pur-' + Date.now(),
    createdAt: new Date().toISOString(),
  };

  purchases.unshift(newPurchase);
  savePurchases(purchases);

  // Increase stock
  const products = getProducts();
  const updatedProducts: Product[] = [];
  const movements: StockMovement[] = [];

  newPurchase.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      const resulting = (prod.currentStock || 0) + item.qty;
      prod.currentStock = resulting;
      prod.updatedAt = new Date().toISOString();
      if (item.rate > 0) prod.purchasePrice = item.rate;
      updatedProducts.push({ ...prod });

      const newMov: StockMovement = {
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        productId: prod.id,
        productName: prod.name,
        type: 'purchase',
        qtyChange: item.qty,
        resultingStock: resulting,
        reason: `ক্রয় চালান #${newPurchase.invoiceNo}`,
        createdAt: new Date().toISOString(),
      };
      movements.push(newMov);
    }
  });
  saveProducts(products);

  if (movements.length > 0) {
    const allMovs = getStockMovements();
    movements.forEach((m) => allMovs.unshift(m));
    safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, allMovs);
  }

  // Update supplier due & purchase
  let updatedSupplier: Supplier | undefined;
  if (newPurchase.supplierId) {
    const suppliers = getSuppliers();
    const sup = suppliers.find((s) => s.id === newPurchase.supplierId);
    if (sup) {
      sup.totalPurchase = (sup.totalPurchase || 0) + newPurchase.total;
      sup.currentDue = (sup.currentDue || 0) + newPurchase.dueAmount;
      saveSuppliers(suppliers);
      updatedSupplier = { ...sup };
    }
  }

  // Atomic batch to Firestore
  syncPurchaseAndStockBatchToFirestore(newPurchase, updatedProducts, movements, updatedSupplier).catch((e) =>
    console.warn('Firestore syncPurchaseAndStockBatchToFirestore error:', e)
  );

  broadcastSync('purchase', 'create', newPurchase, newPurchase.id);
  broadcastSync('stock', 'update', { products: updatedProducts });

  return newPurchase;
}

// ---------------- CUSTOMERS ----------------
export function getCustomers(): Customer[] {
  return safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
}

export function saveCustomers(customers: Customer[]): void {
  safeSet(STORAGE_KEYS.CUSTOMERS, customers);
}

export function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'totalPurchase'>): Customer {
  const customers = getCustomers();
  const newCustomer: Customer = {
    ...data,
    id: 'cust-' + Date.now(),
    totalPurchase: 0,
    currentDue: Number(data.currentDue || data.openingDue || 0),
    createdAt: new Date().toISOString(),
  };
  customers.unshift(newCustomer);
  saveCustomers(customers);

  syncCustomerToFirestore(newCustomer).catch((e) => console.warn('Firestore customer sync error:', e));

  return newCustomer;
}

export function collectCustomerDue(customerId: string, amount: number, method: string, note?: string): boolean {
  const customers = getCustomers();
  const cust = customers.find((c) => c.id === customerId);
  if (!cust) return false;

  cust.currentDue = Math.max(0, (cust.currentDue || 0) - amount);
  saveCustomers(customers);
  syncCustomerToFirestore(cust).catch((e) => console.warn('Firestore customer sync error:', e));

  return true;
}

// ---------------- SUPPLIERS ----------------
export function getSuppliers(): Supplier[] {
  return safeGet<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
}

export function saveSuppliers(suppliers: Supplier[]): void {
  safeSet(STORAGE_KEYS.SUPPLIERS, suppliers);
}

export function addSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchase'>): Supplier {
  const suppliers = getSuppliers();
  const newSupplier: Supplier = {
    ...data,
    id: 'sup-' + Date.now(),
    totalPurchase: 0,
    currentDue: Number(data.currentDue || data.openingDue || 0),
    createdAt: new Date().toISOString(),
  };
  suppliers.unshift(newSupplier);
  saveSuppliers(suppliers);

  syncSupplierToFirestore(newSupplier).catch((e) => console.warn('Firestore supplier sync error:', e));

  return newSupplier;
}

export function paySupplierDue(supplierId: string, amount: number, method: string, note?: string): boolean {
  const suppliers = getSuppliers();
  const sup = suppliers.find((s) => s.id === supplierId);
  if (!sup) return false;

  sup.currentDue = Math.max(0, (sup.currentDue || 0) - amount);
  saveSuppliers(suppliers);
  syncSupplierToFirestore(sup).catch((e) => console.warn('Firestore supplier sync error:', e));

  return true;
}

// ---------------- STOCK MOVEMENTS ----------------
export function getStockMovements(): StockMovement[] {
  return safeGet<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, initialStockMovements);
}

export function addStockMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): void {
  const list = getStockMovements();
  const newMov: StockMovement = {
    ...movement,
    id: 'mov-' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(newMov);
  safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, list);

  syncStockMovementToFirestore(newMov).catch((e) => console.warn('Firestore movement sync error:', e));
}

// ---------------- SETTINGS ----------------
export function getShopSettings(): ShopSettings {
  const current = safeGet<ShopSettings>(STORAGE_KEYS.SETTINGS, initialShopSettings);
  if (!current || !current.shopName || current.shopName === 'স্মার্টশপ জেনারেল স্টোর') {
    const upgraded: ShopSettings = {
      ...initialShopSettings,
      ...(current || {}),
      shopName: initialShopSettings.shopName,
      ownerName: initialShopSettings.ownerName,
      phone: initialShopSettings.phone,
      email: initialShopSettings.email,
      address: initialShopSettings.address,
      invoiceFooter: initialShopSettings.invoiceFooter,
    };
    safeSet(STORAGE_KEYS.SETTINGS, upgraded);
    return upgraded;
  }
  return current;
}

export function saveShopSettings(settings: ShopSettings): void {
  safeSet(STORAGE_KEYS.SETTINGS, settings);
  syncShopSettingsToFirestore(settings).catch((e) => console.warn('Firestore settings sync error:', e));
}

export function resetToDemoData(): void {
  safeSet(STORAGE_KEYS.PRODUCTS, initialProducts);
  safeSet(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  safeSet(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
  safeSet(STORAGE_KEYS.SALES, initialSales);
  safeSet(STORAGE_KEYS.PURCHASES, initialPurchases);
  safeSet(STORAGE_KEYS.SETTINGS, initialShopSettings);
  safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, initialStockMovements);
}

export function clearAllData(): void {
  safeSet(STORAGE_KEYS.PRODUCTS, []);
  safeSet(STORAGE_KEYS.CUSTOMERS, []);
  safeSet(STORAGE_KEYS.SUPPLIERS, []);
  safeSet(STORAGE_KEYS.SALES, []);
  safeSet(STORAGE_KEYS.PURCHASES, []);
  safeSet(STORAGE_KEYS.STOCK_MOVEMENTS, []);
}

export function purgeMockData(): void {
  // Manual purge helper if requested from Settings
  try {
    clearAllData();
  } catch (e) {
    console.warn('purgeMockData error:', e);
  }
}

// Do not auto-purge on module load so user's saved entries remain intact

