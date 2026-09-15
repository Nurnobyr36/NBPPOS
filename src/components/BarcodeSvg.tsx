import React from 'react';

interface BarcodeSvgProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 42,
  showText = true,
  className = '',
}) => {
  // Generate consistent pseudo Code128 pattern based on character codes
  const generateBars = (str: string) => {
    const bars: { width: number; isSpace: boolean }[] = [];
    // Start quiet zone & start code
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 2, isSpace: true });

    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const b1 = (code % 3) + 1;
      const s1 = ((code >> 1) % 3) + 1;
      const b2 = ((code >> 2) % 3) + 1;
      const s2 = ((code >> 3) % 2) + 1;
      bars.push({ width: b1, isSpace: false });
      bars.push({ width: s1, isSpace: true });
      bars.push({ width: b2, isSpace: false });
      bars.push({ width: s2, isSpace: true });
    }

    // Stop pattern & quiet zone
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 3, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 2, isSpace: false });

    return bars;
  };

  const bars = generateBars(value || 'INVOICE');
  const totalWidth = bars.reduce((acc, bar) => acc + bar.width, 0);

  let currentX = 0;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[260px] h-10 overflow-visible"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (bar.isSpace) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="currentColor"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-widest text-slate-600 dark:text-slate-400 mt-1 font-semibold uppercase">
          {value}
        </span>
      )}
    </div>
  );
};
