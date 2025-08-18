'use client';

import { useEffect } from 'react';

interface VSCodeModalProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VSCodeModal({ instanceId, isOpen, onClose }: VSCodeModalProps) {
  // Extract the VM ID from instanceId (e.g., morphvm_flt03jt9 -> flt03jt9)
  const vmId = instanceId.replace('morphvm_', '').replace(/_/g, '-');
  const vscodeUrl = `https://vscode-morphvm-${vmId}.http.cloud.morph.so`;
  
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-[90vw] h-[90vh] bg-white border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
            </svg>
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              VSCode - {instanceId.slice(0, 12)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Copy VSCode URL */}
            <button
              onClick={() => navigator.clipboard.writeText(vscodeUrl)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Copy VSCode URL"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* Open in new tab */}
            <button
              onClick={() => window.open(vscodeUrl, '_blank')}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Open in new tab"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            
            <div className="w-px h-5 bg-gray-200 mx-1" />
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* VSCode iframe */}
        <iframe
          src={vscodeUrl}
          className="w-full h-[calc(100%-40px)] border-0"
          title="VSCode Editor"
        />
      </div>
    </div>
  );
}