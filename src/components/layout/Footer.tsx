import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-0 p-8 pt-12 pb-12 sm:pt-8 sm:pb-8 border-t border-divider" role="contentinfo">
      <div className="flex flex-col md:flex-row justify-between md:items-center items-start">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <Image src="/images/logo.png" alt="BTC Tooling Logo" width={32} height={32} className="w-8 h-8 mr-3" />
            <span className="text-xl font-fuji-bold">BTC Tooling</span>
          </div>
        </div>
        
        <div className="flex space-x-6">
          <p className="text-[#8a919e] text-sm mt-2 font-proxima-nova">
            Real-time Bitcoin market tools by <a href="https://x.com/douvy_" className="text-primary hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer">@douvy_</a> <span className="mx-3 text-[4px] text-[#d0d2d8] inline-flex items-center"><i className="fa-solid fa-circle align-middle relative -top-[2px]"></i></span> <a href="https://github.com/douvy/btc-tooling" className="text-[#8a919e] hover:text-[#8a919e]/90 transition-colors border-b border-[#8a919e] hover:border-[#8a919e]/90 pb-[1px]" target="_blank" rel="noopener noreferrer">Star on <i className="fa-brands fa-github ml-1"></i></a>
          </p>
        </div>
      </div>
    </footer>
  );
}