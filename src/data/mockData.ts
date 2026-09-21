import { Product, Customer, Supplier, Sale, Purchase, ShopSettings, StockMovement } from '../types';

export const initialShopSettings: ShopSettings = {
  shopName: 'নিহাদ বিজনেস পয়েন্ট',
  tagline: 'ন্যায্য মূল্যে সেরা পণ্যের বিশ্বস্ত প্রতিষ্ঠান',
  ownerName: 'নুরনবী রহমান',
  phone: '০১৭৭০২৫০৯৮৮',
  email: 'admin@nihadbp.top',
  address: 'নিহাদ বিজনেস পয়েন্ট, খোন্দকার খুররম মার্কেট, চৌরাস্তা মোড়',
  currencySymbol: '৳',
  defaultVatRate: 0,
  invoiceFooter: 'আমাদের কাছ থেকে পণ্য ক্রয় করার জন্য ধন্যবাদ,আবার আসবে।',
  logoUrl: '',
  imgbbApiKey: '',
};

// All mock data initialized as completely empty arrays per user request
export const initialProducts: Product[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialSales: Sale[] = [];
export const initialPurchases: Purchase[] = [];
export const initialStockMovements: StockMovement[] = [];
