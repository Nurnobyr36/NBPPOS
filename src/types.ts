export type Language = 'bn' | 'en';

export type TabType =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'product-new'
  | 'product-edit'
  | 'stock'
  | 'purchases'
  | 'purchase-new'
  | 'customers'
  | 'suppliers'
  | 'sales'
  | 'invoice-view'
  | 'settings';


export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryName: string;
  brandName?: string;
  unitName: string; // 'pcs' | 'kg' | 'gm' | 'litre' | 'pack' | 'box' | 'dozen'
  supplierId?: string;
  supplierName?: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  specialPrice?: number;
  minSalePrice?: number;
  vatRate?: number; // percentage, e.g. 5
  currentStock: number;
  minStock: number; // low stock alert threshold
  maxStock?: number;
  status: 'active' | 'inactive';
  warranty?: string;
  expiryDate?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  purchasePrice?: number;
  discount: number;
  vatRate: number;
  lineTotal: number;
  imageUrl?: string;
}

export interface SalePayment {
  method: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'card';
  amount: number;
  note?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  invoiceDiscount: number;
  vatTotal: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  profit?: number;
  payments: SalePayment[];
  notes?: string;
  status: 'posted' | 'returned';
  cashierName: string;
  sellerId?: string;
  sellerName?: string;
  sellerEmail?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: 'super_admin' | 'admin' | 'cashier' | 'seller';
  phoneNumber?: string | null;
  createdAt?: string;
  createdBy?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  discount: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  transportCost: number;
  otherCost: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  totalPurchase: number;
  currentDue: number;
  openingDue?: number;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  address?: string;
  totalPurchase: number;
  currentDue: number;
  openingDue?: number;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'return';
  qtyChange: number; // positive or negative
  resultingStock: number;
  reason?: string;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  defaultVatRate: number;
  invoiceFooter: string;
  logoUrl?: string;
  imgbbApiKey: string;
}
