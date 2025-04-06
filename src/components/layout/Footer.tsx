import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-0 p-8 pt-4 pb-4 border-t border-divider" role="contentinfo">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <Image src="/images/logo.png" alt="BTC Tooling Logo" width={32} height={32} className="w-8 h-8 mr-3" />
            <span className="text-xl font-fuji-bold">BTC Tooling</span>
          </div>
        </div>
        
        <div className="flex space-x-6">
          <p className="text-[#81919e] text-sm mt-2">Bitcoin data and analytics</p>
        </div>
      </div>
    </footer>
  );
}