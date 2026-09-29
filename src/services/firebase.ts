import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Sale, Purchase, Customer, Supplier, StockMovement, ShopSettings } from '../types';

// Suppress internal Firestore network connection/retry logs from polluting console error triggers
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust in-memory cache to prevent IndexedDB quota & target assertion errors
function initFirestoreInstance() {
  const dbId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      },
      dbId
    );
  } catch (err) {
    console.warn('initializeFirestore fallback:', err);
    return getFirestore(app, dbId);
  }
}

export const db = initFirestoreInstance();
export const auth = getAuth(app);

// Helper to remove undefined fields recursively so Firestore setDoc never throws unsupported field value error
export function sanitizeDocData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  try {
    return JSON.parse(
      JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
    );
  } catch (err) {
    console.warn('sanitizeDocData error:', err);
    return obj;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code || '';

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  const isPermissionError =
    errCode === 'permission-denied' ||
    errMessage.toLowerCase().includes('permission') ||
    errMessage.toLowerCase().includes('insufficient');

  if (isPermissionError) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn(`Firestore Notice [${operationType}] at [${path || 'unknown'}]:`, errMessage);
  }
}

// Test cloud connection
export async function testConnection(): Promise<boolean> {
  try {
    // Check connection with getDoc, which respects cache and online channel without throwing fatal offline aborts
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    if (
      errObj?.code === 'unavailable' ||
      errObj?.message?.includes('the client is offline') ||
      errObj?.message?.includes('unavailable') ||
      errObj?.message?.includes('Could not reach Cloud Firestore backend')
    ) {
      console.warn('Firestore backend currently in offline mode or connecting...');
      return false;
    }
    // If doc doesn't exist or other response returned from server, server was reached
    return true;
  }
}

// ---------------- FIRESTORE REAL-TIME SYNC HELPERS ----------------

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Product);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      onError?.(error);
    }
  );
}

export function subscribeToSales(
  onUpdate: (sales: Sale[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'sales'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Sale);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
      onError?.(error);
    }
  );
}

export function subscribeToPurchases(
  onUpdate: (purchases: Purchase[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'purchases'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Purchase);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
      onError?.(error);
    }
  );
}

export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'customers'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Customer);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
      onError?.(error);
    }
  );
}

export function subscribeToSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'suppliers'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Supplier);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
      onError?.(error);
    }
  );
}

export function subscribeToStockMovements(
  onUpdate: (movements: StockMovement[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'stockMovements'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as StockMovement);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stockMovements');
      onError?.(error);
    }
  );
}

export function subscribeToShopSettings(
  onUpdate: (settings: ShopSettings) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    doc(db, 'shopSettings', 'default'),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as ShopSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'shopSettings/default');
      onError?.(error);
    }
  );
}

// Write/Sync helpers
export async function syncProductToFirestore(product: Product): Promise<void> {
  try {
    const clean = sanitizeDocData(product);
    await setDoc(doc(db, 'products', product.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
  }
}

export async function syncSaleToFirestore(sale: Sale): Promise<void> {
  try {
    const clean = sanitizeDocData(sale);
    await setDoc(doc(db, 'sales', sale.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `sales/${sale.id}`);
  }
}

export async function deleteSaleFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sales', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `sales/${id}`);
  }
}

export async function syncPurchaseToFirestore(purchase: Purchase): Promise<void> {
  try {
    const clean = sanitizeDocData(purchase);
    await setDoc(doc(db, 'purchases', purchase.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `purchases/${purchase.id}`);
  }
}

export async function syncCustomerToFirestore(customer: Customer): Promise<void> {
  try {
    const clean = sanitizeDocData(customer);
    await setDoc(doc(db, 'customers', customer.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
  }
}

export async function syncSupplierToFirestore(supplier: Supplier): Promise<void> {
  try {
    const clean = sanitizeDocData(supplier);
    await setDoc(doc(db, 'suppliers', supplier.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `suppliers/${supplier.id}`);
  }
}

export async function syncStockMovementToFirestore(movement: StockMovement): Promise<void> {
  try {
    const clean = sanitizeDocData(movement);
    await setDoc(doc(db, 'stockMovements', movement.id), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `stockMovements/${movement.id}`);
  }
}

export async function syncShopSettingsToFirestore(settings: ShopSettings): Promise<void> {
  try {
    const clean = sanitizeDocData(settings);
    await setDoc(doc(db, 'shopSettings', 'default'), clean, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shopSettings/default');
  }
}

// ---------------- ATOMIC BATCH REAL-TIME SYNC HELPERS ----------------

/**
 * Atomically commits a sale, all associated product stock deductions,
 * stock movement logs, and customer ledger updates to Firestore in a single network transaction.
 * Guarantees all connected mobiles receive the sale & stock update in the exact same snapshot.
 */
export async function syncSaleAndStockBatchToFirestore(
  sale: Sale,
  updatedProducts: Product[],
  stockMovements: StockMovement[],
  updatedCustomer?: Customer
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Add/Update Sale document
    const saleRef = doc(db, 'sales', sale.id);
    batch.set(saleRef, sanitizeDocData(sale), { merge: true });

    // 2. Update each affected product stock
    updatedProducts.forEach((prod) => {
      const prodRef = doc(db, 'products', prod.id);
      batch.set(
        prodRef,
        sanitizeDocData({
          ...prod,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    });

    // 3. Log stock movements
    stockMovements.forEach((mov) => {
      const movRef = doc(db, 'stockMovements', mov.id);
      batch.set(movRef, sanitizeDocData(mov), { merge: true });
    });

    // 4. Update customer balance if applicable
    if (updatedCustomer) {
      const custRef = doc(db, 'customers', updatedCustomer.id);
      batch.set(custRef, sanitizeDocData(updatedCustomer), { merge: true });
    }

    // Commit atomically in a single payload
    await batch.commit();
  } catch (err) {
    console.error('Error in syncSaleAndStockBatchToFirestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `sales_batch/${sale.id}`);
    throw err;
  }
}

/**
 * Atomically commits a manual stock adjustment and its audit movement log to Firestore.
 */
export async function syncStockAdjustmentBatchToFirestore(
  product: Product,
  movement: StockMovement
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const prodRef = doc(db, 'products', product.id);
    batch.set(
      prodRef,
      sanitizeDocData({
        ...product,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );

    const movRef = doc(db, 'stockMovements', movement.id);
    batch.set(movRef, sanitizeDocData(movement), { merge: true });

    await batch.commit();
  } catch (err) {
    console.error('Error in syncStockAdjustmentBatchToFirestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `stock_adjust_batch/${product.id}`);
    throw err;
  }
}

/**
 * Atomically commits a purchase invoice, increased product stocks, movements, and supplier updates.
 */
export async function syncPurchaseAndStockBatchToFirestore(
  purchase: Purchase,
  updatedProducts: Product[],
  stockMovements: StockMovement[],
  updatedSupplier?: Supplier
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const purRef = doc(db, 'purchases', purchase.id);
    batch.set(purRef, sanitizeDocData(purchase), { merge: true });

    updatedProducts.forEach((prod) => {
      const prodRef = doc(db, 'products', prod.id);
      batch.set(
        prodRef,
        sanitizeDocData({
          ...prod,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    });

    stockMovements.forEach((mov) => {
      const movRef = doc(db, 'stockMovements', mov.id);
      batch.set(movRef, sanitizeDocData(mov), { merge: true });
    });

    if (updatedSupplier) {
      const supRef = doc(db, 'suppliers', updatedSupplier.id);
      batch.set(supRef, sanitizeDocData(updatedSupplier), { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error in syncPurchaseAndStockBatchToFirestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `purchase_batch/${purchase.id}`);
    throw err;
  }
}

/**
 * Re-enables Firestore network connection immediately.
 * Call this when a mobile phone wakes up from sleep or when visibility changes to active.
 */
export async function reconnectFirestoreNetwork(): Promise<boolean> {
  try {
    await enableNetwork(db);
    return true;
  } catch (err) {
    console.warn('reconnectFirestoreNetwork notice:', err);
    return false;
  }
}

/**
 * Fetches the latest confirmed cloud collections from Firestore server.
 */
export async function fetchLatestCloudData(): Promise<{
  products: Product[];
  sales: Sale[];
  stockMovements: StockMovement[];
}> {
  try {
    const [prodSnap, saleSnap, movSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'sales')),
      getDocs(collection(db, 'stockMovements')),
    ]);

    const products = prodSnap.docs
      .map((d) => d.data() as Product)
      .filter((p) => !isLegacyMockId(p.id));
    const sales = saleSnap.docs
      .map((d) => d.data() as Sale)
      .filter((s) => !isLegacyMockId(s.id));
    const stockMovements = movSnap.docs
      .map((d) => d.data() as StockMovement)
      .filter((m) => !isLegacyMockId(m.id));

    return { products, sales, stockMovements };
  } catch (err) {
    console.warn('fetchLatestCloudData error:', err);
    return { products: [], sales: [], stockMovements: [] };
  }
}

// Clear mock data helper across all collections
export async function clearFirestoreCollection(collectionName: string): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn(`Error clearing Firestore collection ${collectionName}:`, err);
  }
}

export function isLegacyMockId(id: string): boolean {
  return /^(prod|sale|pur|cust|sup|mov)-\d{1,3}$/.test(id);
}

export async function purgeLegacyMockDataFromFirestore(): Promise<void> {
  const collections = ['products', 'sales', 'purchases', 'customers', 'suppliers', 'stockMovements'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      const deletePromises = snap.docs
        .filter((d) => isLegacyMockId(d.id))
        .map((d) => deleteDoc(d.ref));
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (err) {
      console.warn(`Purging mock data error for ${col}:`, err);
    }
  }
}

export async function clearAllFirestoreMockData(): Promise<void> {
  await Promise.all([
    clearFirestoreCollection('products'),
    clearFirestoreCollection('sales'),
    clearFirestoreCollection('purchases'),
    clearFirestoreCollection('customers'),
    clearFirestoreCollection('suppliers'),
    clearFirestoreCollection('stockMovements'),
  ]);
}
