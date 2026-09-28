import React from 'react';
import { Product, Sale } from '../types';
import { ProfitReportModal } from './ProfitReportModal';
import { ProfitPeriod } from '../utils/profitAnalytics';

export interface TodayProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  todaySales?: Sale[];
  sales?: Sale[];
  products: Product[];
  currencySymbol?: string;
  initialPeriod?: ProfitPeriod;
  onViewInvoice?: (sale: Sale) => void;
  onNavigateToPos?: () => void;
}

export const TodayProfitModal: React.FC<TodayProfitModalProps> = ({
  isOpen,
  onClose,
  todaySales = [],
  sales,
  products = [],
  currencySymbol = '৳',
  initialPeriod = 'today',
  onViewInvoice,
  onNavigateToPos,
}) => {
  // Use all sales if provided, otherwise todaySales
  const salesToUse = sales && sales.length > 0 ? sales : todaySales;

  return (
    <ProfitReportModal
      isOpen={isOpen}
      onClose={onClose}
      sales={salesToUse}
      products={products}
      initialPeriod={initialPeriod}
      currencySymbol={currencySymbol}
      onViewInvoice={onViewInvoice}
      onNavigateToPos={onNavigateToPos}
    />
  );
};
