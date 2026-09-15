import { Product, Customer, Supplier, Sale, Purchase, ShopSettings, StockMovement } from '../types';

export const initialShopSettings: ShopSettings = {
  shopName: 'স্মার্টশপ জেনারেল স্টোর',
  tagline: 'ন্যায্য মূল্যে সেরা পণ্যের বিশ্বস্ত প্রতিষ্ঠান',
  ownerName: 'মো: রফিকুল ইসলাম',
  phone: '01712-345678',
  email: 'smartshop.pos@gmail.com',
  address: 'দোকান নং ১২, নিউ মার্কেট রোড, ঢাকা-১২০৫',
  currencySymbol: '৳',
  defaultVatRate: 0,
  invoiceFooter: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! বিক্রিত মাল ৭ দিনের মধ্যে পরিবর্তনযোগ্য।',
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
