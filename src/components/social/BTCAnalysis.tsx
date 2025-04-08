import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AnalysisData {
  title: string;
  date: string;
  executiveSummary: string;
  link: string;
}

// Function to format the executive summary with bullet points and styling
function formatExecutiveSummary(summary: string): JSX.Element {
  // Remove "Current Context" line if present
  let cleanedSummary = summary.replace(/Current\s+Context.*?:\s*\n+/i, '');
  
  // Extract just the bullet points with BTC Price, Macro, and Sentiment
  const lines = cleanedSummary.split('\n');
  const relevantPoints = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && 
        (trimmed.includes('BTC Price') || 
         trimmed.includes('Bitcoin Price') || 
         trimmed.includes('Macro Environment') || 
         trimmed.includes('Sentiment'))) {
      relevantPoints.push(trimmed);
    }
  }
  
  // If we found bullet points, format them nicely
  if (relevantPoints.length > 0) {
    return (
      <>
        {relevantPoints.map((point, index) => {
          // Extract the title and content
          let title, content;
          
          if (point.includes('BTC Price:') || point.includes('Bitcoin Price:')) {
            const match = point.match(/(?:•|-|)\s*(?:BTC|Bitcoin)\s+Price\s*:\s*(.*)/i);
            title = 'BTC Price';
            content = match ? match[1].trim() : '';
          } else if (point.includes('Macro Environment:')) {
            const match = point.match(/(?:•|-|)\s*Macro\s+Environment\s*:\s*(.*)/i);
            title = 'Macro Environment';
            content = match ? match[1].trim() : '';
          } else if (point.includes('Sentiment:')) {
            const match = point.match(/(?:•|-|)\s*Sentiment\s*:\s*(.*)/i);
            title = 'Sentiment';
            content = match ? match[1].trim() : '';
          } else {
            // Fallback - generic parsing
            const parts = point.split(':');
            title = parts[0].replace(/^[•-]\s*/, '').trim();
            content = parts.slice(1).join(':').trim();
          }
          
          return (
            <p key={index} className="mb-3">
              <span className="font-fuji-bold text-base">
                <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> {title}:
              </span> {content}
            </p>
          );
        })}
      </>
    );
  }
  
  // If we couldn't find specific bullet points, use the fallback style
  return (
    <>
      <p className="mb-3">
        <span className="font-fuji-bold text-base">
          <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> BTC Price:
        </span> ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).
      </p>
      
      <p className="mb-3">
        <span className="font-fuji-bold text-base">
          <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Macro Environment:
        </span> Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.
      </p>
      
      <p className="mb-3">
        <span className="font-fuji-bold text-base">
          <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Sentiment:
        </span> CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.
      </p>
    </>
  );
}

interface BTCAnalysisProps {
  date?: string;
  content?: string;
}

export default function BTCAnalysis({ date: fallbackDate, content: fallbackContent }: BTCAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        const response = await fetch('/api/substack');
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis data');
        }
        
        const data = await response.json();
        setAnalysisData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to load the latest analysis');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalysis();
    
    // Refresh the data every hour
    const intervalId = setInterval(fetchAnalysis, 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Use live data or fallback
  const displayDate = analysisData?.date || fallbackDate || 'APR 7, 2025';
  
  return (
    <div>
      <h2 className="text-xl font-fuji-bold mb-6">BTC Analysis</h2>
      <div>
        <div className="flex items-start mb-4">
          <div className="w-10 h-10 rounded-full bg-btc flex-shrink-0 mr-3 overflow-hidden">
            <Image 
              src="/images/hestia.jpg" 
              alt="Profile picture of HestiaAI"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="font-fuji-bold text-base">HestiaAI</p>
            <p className="text-[#8a919e] text-sm font-gotham-medium">{displayDate}</p>
          </div>
        </div>
        
        <div className="text-sm">
          {loading ? (
            // While loading, show a loading message
            <p>Loading latest analysis...</p>
          ) : error ? (
            // If there's an error, show fallback content if available
            fallbackContent ? (
              <>
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> BTC Price:</span> ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).
                </p>
                
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Macro Environment:</span> Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.
                </p>
                
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Sentiment:</span> CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.
                </p>
              </>
            ) : (
              <p>{error}</p>
            )
          ) : analysisData ? (
            // Format and display the executive summary from live data
            formatExecutiveSummary(analysisData.executiveSummary)
          ) : (
            // Fallback if no data but no error
            fallbackContent ? (
              <>
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> BTC Price:</span> ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).
                </p>
                
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Macro Environment:</span> Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.
                </p>
                
                <p className="mb-3">
                  <span className="font-fuji-bold text-base"><i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> Sentiment:</span> CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.
                </p>
              </>
            ) : (
              <p>No analysis available right now.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}