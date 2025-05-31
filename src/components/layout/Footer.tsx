import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-0 p-8 pt-12 pb-12 sm:pt-8 sm:pb-8 border-t border-divider" role="contentinfo">
      <div className="flex flex-col md:flex-row justify-between md:items-center items-start">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <Image src="/images/logo.png" alt="BTC Tooling Logo" width={32} height={32} className="w-10 h-10 mr-3" />
            <span className="text-2xl font-fuji-bold">BTC Tooling</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:block space-y-4 sm:space-y-0">
          <p className="text-muted text-sm mt-2 font-proxima-nova">
            <span className="sm:inline">Real-time Bitcoin market tools by <a href="https://x.com/douvy_" className="text-primary hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer">@douvy_</a></span>
            <span className="hidden sm:inline mx-4 text-[4px] text-light-gray inline-flex items-center"><i className="fa-solid fa-circle align-middle relative -top-[2px]" aria-hidden="true"></i></span>
            <span className="hidden sm:inline"><a href="https://github.com/douvy/btc-tooling" className="text-muted hover:text-muted/90 transition-colors border-b border-muted hover:border-muted/90 pb-[1px]" target="_blank" rel="noopener noreferrer">Star on <i className="fa-brands fa-github ml-1" aria-hidden="true"></i></a></span>
          </p>
          <p className="text-muted text-sm font-proxima-nova mt-4 sm:hidden">
            <a href="https://github.com/douvy/btc-tooling" className="text-muted hover:text-muted/90 transition-colors border-b border-muted hover:border-muted/90 pb-[1px]" target="_blank" rel="noopener noreferrer">Star on <i className="fa-brands fa-github ml-1" aria-hidden="true"></i></a>
          </p>
        </div>
      </div>
    </footer>
  );
}