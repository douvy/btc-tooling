import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-0 p-8 pt-12 pb-12 sm:pt-8 sm:pb-8 border-t border-divider" role="contentinfo">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <Image src="/images/logo.png" alt="BTC Tooling Logo" width={32} height={32} className="w-8 h-8 mr-3" />
            <span className="text-xl font-fuji-bold">BTC Tooling</span>
          </div>
        </div>
        
        <div className="flex space-x-6">
          <p className="text-[#b4bbc1] text-sm mt-2 font-proxima-nova">
            Real-time Bitcoin market tools by <a href="https://x.com/douvy_" className="text-primary hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer">@douvy_</a>
          </p>
        </div>
      </div>
    </footer>
  );
}