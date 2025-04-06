import { TimeFrame } from '@/types';

interface PriceChartProps {
  currentPrice: number;
  timeframe: TimeFrame;
}

export default function PriceChart({ currentPrice, timeframe: _timeframe }: PriceChartProps) {
  // Note: timeframe is renamed to _timeframe as it's not currently used but will be needed later
  return (
    <section className="rounded-xl p-8 pt-6 mb-6 h-[340px] md:h-[400px]" aria-labelledby="chart-title">
      <h2 id="chart-title" className="text-xl font-fuji-bold mb-4">BTC/USD</h2>
      <div className="w-full h-[320px] relative">
        {/* Chart */}
        <div className="w-full h-full rounded-lg overflow-hidden relative" role="img" aria-label="Bitcoin price chart showing upward trend over time">
          {/* SVG with improved accessibility */}
          <svg viewBox="0 0 800 300" className="w-full h-full absolute inset-0" aria-hidden="true">
            {/* Grid lines */}
            <line x1="0" y1="75" x2="800" y2="75" stroke="#333" strokeWidth="1" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#333" strokeWidth="1" />
            <line x1="0" y1="225" x2="800" y2="225" stroke="#333" strokeWidth="1" />
            
            <line x1="100" y1="0" x2="100" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="200" y1="0" x2="200" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="300" y1="0" x2="300" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="400" y1="0" x2="400" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="500" y1="0" x2="500" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="600" y1="0" x2="600" y2="300" stroke="#333" strokeWidth="1" />
            <line x1="700" y1="0" x2="700" y2="300" stroke="#333" strokeWidth="1" />
            
            {/* Chart line */}
            <path d="M0,220 C50,200 100,180 150,190 C200,200 250,100 300,120 C350,140 400,100 450,80 C500,60 550,100 600,120 C650,140 700,130 800,50" stroke="#FF6600" strokeWidth="3" fill="none" />
            
            {/* Volume bars */}
            <rect x="50" y="260" width="10" height="20" fill="#4CAF50" opacity="0.5" />
            <rect x="100" y="270" width="10" height="10" fill="#4CAF50" opacity="0.5" />
            <rect x="150" y="265" width="10" height="15" fill="#4CAF50" opacity="0.5" />
            <rect x="200" y="250" width="10" height="30" fill="#F44336" opacity="0.5" />
            <rect x="250" y="255" width="10" height="25" fill="#4CAF50" opacity="0.5" />
            <rect x="300" y="260" width="10" height="20" fill="#4CAF50" opacity="0.5" />
            <rect x="350" y="245" width="10" height="35" fill="#F44336" opacity="0.5" />
            <rect x="400" y="270" width="10" height="10" fill="#4CAF50" opacity="0.5" />
            <rect x="450" y="260" width="10" height="20" fill="#4CAF50" opacity="0.5" />
            <rect x="500" y="255" width="10" height="25" fill="#F44336" opacity="0.5" />
            <rect x="550" y="265" width="10" height="15" fill="#4CAF50" opacity="0.5" />
            <rect x="600" y="250" width="10" height="30" fill="#4CAF50" opacity="0.5" />
            <rect x="650" y="260" width="10" height="20" fill="#F44336" opacity="0.5" />
            <rect x="700" y="270" width="10" height="10" fill="#4CAF50" opacity="0.5" />
            <rect x="750" y="265" width="10" height="15" fill="#4CAF50" opacity="0.5" />
          </svg>
          
          {/* Price labels */}
          <div className="absolute top-2 right-2 bg-[#1d1d1d] bg-opacity-70 px-3 py-1 rounded text-sm">
            <span className="text-white font-fuji-bold">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}