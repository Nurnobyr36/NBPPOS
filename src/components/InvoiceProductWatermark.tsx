import React, { useState } from 'react';
import { Package, Tag, CheckCircle } from 'lucide-react';
import { Sale, Product, SaleItem } from '../types';

export type WatermarkStyle = 'both' | 'image' | 'text';
export type WatermarkOpacity = 'light' | 'medium' | 'strong';

interface InvoiceProductWatermarkProps {
  sale: Sale;
  products?: Product[];
  format: 'digital' | 'thermal-80' | 'thermal-58' | 'corporate-a4';
  enabled?: boolean;
  style?: WatermarkStyle;
  opacity?: WatermarkOpacity;
  selectedItemId?: string; // 'all' or productId
}

export const InvoiceProductWatermark: React.FC<InvoiceProductWatermarkProps> = ({
  sale,
  products = [],
  format,
  enabled = true,
  style = 'both',
  opacity = 'medium',
  selectedItemId = 'all',
}) => {
  const [imageError, setImageError] = useState(false);

  if (!enabled || !sale.items || sale.items.length === 0) {
    return null;
  }

  // Determine which item(s) to highlight
  let primaryItem: SaleItem = sale.items[0];
  if (selectedItemId !== 'all') {
    const found = sale.items.find((it) => it.productId === selectedItemId);
    if (found) primaryItem = found;
  }

  // Look up full product if available to get high-res image
  const fullProduct = products.find((p) => p.id === primaryItem.productId);
  const imageUrl = primaryItem.imageUrl || fullProduct?.imageUrl;
  const productName = primaryItem.name;
  const productSku = fullProduct?.sku || (primaryItem as any).sku;
  const multipleItems = sale.items.length > 1 && selectedItemId === 'all';

  // Opacity styles based on level
  const opacityValues: Record<WatermarkOpacity, { container: number; cssClass: string }> = {
    light: { container: 0.08, cssClass: 'opacity-[0.08]' },
    medium: { container: 0.14, cssClass: 'opacity-[0.14]' },
    strong: { container: 0.22, cssClass: 'opacity-[0.22]' },
  };

  const currentOpacity = opacityValues[opacity] || opacityValues.medium;

  // Format-specific sizing & spacing
  const isA4 = format === 'corporate-a4';
  const isDigital = format === 'digital';
  const isThermal80 = format === 'thermal-80';
  const isThermal58 = format === 'thermal-58';

  return (
    <div
      aria-hidden="true"
      style={{
        opacity: currentOpacity.container,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
      className={`absolute inset-0 z-0 pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden p-4 transition-opacity duration-200 ${
        isDigital ? 'text-slate-900 dark:text-white' : 'text-slate-900'
      }`}
    >
      {/* Background Product Image Watermark */}
      {(style === 'both' || style === 'image') && (
        <div className="relative flex items-center justify-center mb-3 max-w-full">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={productName}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className={`object-contain filter grayscale contrast-125 transition-all ${
                isA4
                  ? 'max-w-[440px] max-h-[380px] w-auto h-auto'
                  : isDigital
                  ? 'max-w-[290px] max-h-[250px] w-auto h-auto'
                  : isThermal80
                  ? 'max-w-[190px] max-h-[170px] w-auto h-auto'
                  : 'max-w-[130px] max-h-[110px] w-auto h-auto'
              }`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-3xl border-4 border-dashed border-current ${
                isA4
                  ? 'w-64 h-64'
                  : isDigital
                  ? 'w-44 h-44'
                  : isThermal80
                  ? 'w-32 h-32'
                  : 'w-24 h-24'
              }`}
            >
              <Package
                className={
                  isA4
                    ? 'w-32 h-32'
                    : isDigital
                    ? 'w-24 h-24'
                    : isThermal80
                    ? 'w-16 h-16'
                    : 'w-12 h-12'
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Foreground Bold Slanted Watermark Text Badge */}
      {(style === 'both' || style === 'text') && (
        <div
          className={`transform -rotate-12 border-2 sm:border-4 border-dashed border-current rounded-2xl sm:rounded-3xl text-center backdrop-blur-[0.5px] max-w-[90%] transition-transform ${
            isA4
              ? 'p-5 sm:p-6 shadow-xs'
              : isDigital
              ? 'p-3 sm:p-4'
              : isThermal80
              ? 'p-2.5'
              : 'p-1.5'
          }`}
        >
          {/* Header Label */}
          <div
            className={`font-black uppercase tracking-widest block ${
              isA4
                ? 'text-xs sm:text-sm mb-1'
                : isDigital
                ? 'text-[10px] sm:text-xs mb-0.5'
                : isThermal80
                ? 'text-[9px] mb-0.5'
                : 'text-[8px]'
            }`}
          >
            ★ বিক্রিত পণ্য • SOLD PRODUCT ★
          </div>

          {/* Product Name */}
          <div
            className={`font-black uppercase tracking-tight leading-tight line-clamp-2 break-words ${
              isA4
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : isDigital
                ? 'text-xl sm:text-2xl md:text-3xl'
                : isThermal80
                ? 'text-base sm:text-lg'
                : 'text-xs sm:text-sm'
            }`}
          >
            {productName}
          </div>

          {/* Additional details: SKU or Multiple items indicator */}
          <div
            className={`flex items-center justify-center gap-2 font-mono font-bold mt-1 ${
              isA4
                ? 'text-xs sm:text-sm'
                : isDigital
                ? 'text-[10px] sm:text-xs'
                : 'text-[9px]'
            }`}
          >
            {productSku && <span>SKU: {productSku}</span>}
            {multipleItems && (
              <span className="font-sans">
                (মোট {sale.items.length} টি পণ্য অন্তর্ভুক্ত)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
