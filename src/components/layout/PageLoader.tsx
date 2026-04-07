import React from 'react';
import { Loader2 } from 'lucide-react';

const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full space-y-4 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
        <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <p className="text-sm font-medium text-base-content tracking-wide uppercase">Loading Module</p>
        <div className="h-1 w-24 bg-base-300 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
