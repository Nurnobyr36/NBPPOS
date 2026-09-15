import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface InvoiceQrCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export const InvoiceQrCode: React.FC<InvoiceQrCodeProps> = ({
  data,
  size = 110,
  className = '',
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(data, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrSrc(url);
        }
      })
      .catch((err) => {
        console.warn('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [data, size]);

  if (!qrSrc) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center text-[10px] text-slate-400 ${className}`}
      >
        QR
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <img
        src={qrSrc}
        alt="Invoice Verification QR"
        style={{ width: size, height: size }}
        className="rounded-lg border border-slate-200 bg-white p-1 shadow-2xs object-contain"
      />
    </div>
  );
};
