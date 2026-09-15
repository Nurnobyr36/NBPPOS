import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Sale, Purchase, Customer, Supplier, StockMovement, ShopSettings } from '../types';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// CRITICAL: Connect directly to the provisioned database ID with long-polling
// Long-polling prevents WebChannel streaming connection failures in container and proxy environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

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
    await getDocFromServer(doc(db, 'test', 'connection'));
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
    await setDoc(doc(db, 'products', product.id), product);
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
    await setDoc(doc(db, 'sales', sale.id), sale);
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
    await setDoc(doc(db, 'purchases', purchase.id), purchase);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `purchases/${purchase.id}`);
  }
}

export async function syncCustomerToFirestore(customer: Customer): Promise<void> {
  try {
    await setDoc(doc(db, 'customers', customer.id), customer);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
  }
}

export async function syncSupplierToFirestore(supplier: Supplier): Promise<void> {
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), supplier);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `suppliers/${supplier.id}`);
  }
}

export async function syncStockMovementToFirestore(movement: StockMovement): Promise<void> {
  try {
    await setDoc(doc(db, 'stockMovements', movement.id), movement);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `stockMovements/${movement.id}`);
  }
}

export async function syncShopSettingsToFirestore(settings: ShopSettings): Promise<void> {
  try {
    await setDoc(doc(db, 'shopSettings', 'default'), settings);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shopSettings/default');
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
