import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AnalysisData {
  title: string;
  date: string;
  executiveSummary: string;
  link: string;
}

// Default fallback bullet points
const fallbackBullets = [
  {
    title: 'BTC Price',
    content: '~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).'
  },
  {
    title: 'Macro Environment',
    content: 'Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.'
  },
  {
    title: 'Sentiment',
    content: 'CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.'
  }
];

// Function to parse and format bullet points from the executive summary
function parseBulletPoints(summary: string): Array<{title: string, content: string}> {
  // If no summary, return fallback
  if (!summary || summary.trim().length === 0) {
    return fallbackBullets;
  }
  
  // Extract bullet points from the summary
  const lines = summary.split('\n');
  const bulletPoints: Array<{title: string, content: string}> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    
    // Check for BTC Price
    if (trimmed.includes('BTC Price:') || trimmed.includes('Bitcoin Price:')) {
      const parts = trimmed.split(':');
      if (parts.length > 1) {
        bulletPoints.push({
          title: 'BTC Price',
          content: parts.slice(1).join(':').trim()
        });
      }
    } 
    // Check for Macro Environment
    else if (trimmed.includes('Macro Environment:')) {
      const parts = trimmed.split(':');
      if (parts.length > 1) {
        bulletPoints.push({
          title: 'Macro Environment',
          content: parts.slice(1).join(':').trim()
        });
      }
    } 
    // Check for Sentiment
    else if (trimmed.includes('Sentiment:')) {
      const parts = trimmed.split(':');
      if (parts.length > 1) {
        bulletPoints.push({
          title: 'Sentiment',
          content: parts.slice(1).join(':').trim()
        });
      }
    }
  }
  
  // If we didn't find all three bullet points, fill in missing ones from fallback
  if (!bulletPoints.some(b => b.title === 'BTC Price')) {
    bulletPoints.push(fallbackBullets[0]);
  }
  if (!bulletPoints.some(b => b.title === 'Macro Environment')) {
    bulletPoints.push(fallbackBullets[1]);
  }
  if (!bulletPoints.some(b => b.title === 'Sentiment')) {
    bulletPoints.push(fallbackBullets[2]);
  }
  
  return bulletPoints;
}

// Render bullet points as JSX
function renderBulletPoints(bulletPoints: Array<{title: string, content: string}>): JSX.Element {
  return (
    <>
      {bulletPoints.map((bullet, index) => (
        <p key={index} className="mb-3">
          <span className="font-fuji-bold text-base">
            <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"></i> {bullet.title}:
          </span> {bullet.content}
        </p>
      ))}
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
            <p>Loading latest analysis...</p>
          ) : error ? (
            renderBulletPoints(parseBulletPoints(fallbackContent || ''))
          ) : analysisData ? (
            renderBulletPoints(parseBulletPoints(analysisData.executiveSummary))
          ) : (
            renderBulletPoints(parseBulletPoints(fallbackContent || ''))
          )}
        </div>
      </div>
    </div>
  );
}