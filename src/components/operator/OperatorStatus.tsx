'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { OPERATOR_SERVICE_NAME } from '@/lib/vm/constants';
import { VSCodeModal } from './VSCodeModal';

export function OperatorStatus({ instanceId }: { instanceId: string }) {
  const { data } = trpc.morph.instances.get.useQuery(
    { instanceId },
    { refetchInterval: 5000 }
  );
  
  const pauseMutation = trpc.morph.instance.pause.useMutation();
  const resumeMutation = trpc.morph.instance.resume.useMutation();
  const stopMutation = trpc.morph.instances.stop.useMutation();
  
  const [copied, setCopied] = useState(false);
  const [showVSCode, setShowVSCode] = useState(false);
  
  // The Morph API returns 'status' field, not 'state'
  const status = data?.status;
  const isPaused = status === 'paused';
  const isRunning = status === 'ready'; // Morph uses 'ready' not 'running'
  
  // Get the service URL
  const serviceUrl = data?.networking?.httpServices?.find(s => s.name === OPERATOR_SERVICE_NAME)?.url;
  
  const handleCopyUrl = () => {
    if (serviceUrl) {
      navigator.clipboard.writeText(serviceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-green-500' : 
            isPaused ? 'bg-yellow-500' : 
            'bg-gray-400'
          } animate-pulse`} />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
            {status || 'starting'}
          </span>
        </div>
        
        {/* VM ID */}
        <div className="text-xs text-gray-500 font-mono">
          {instanceId.slice(0, 12)}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Copy URL */}
        {serviceUrl && (
          <button
            onClick={handleCopyUrl}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Copy URL"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
        
        {/* Open in new tab */}
        {serviceUrl && (
          <button
            onClick={() => window.open(serviceUrl, '_blank')}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Open in new tab"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
        
        {/* VSCode */}
        <button
          onClick={() => setShowVSCode(true)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="Open VSCode"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
          </svg>
        </button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* Pause/Resume */}
        {isRunning && (
          <button
            onClick={() => pauseMutation.mutate({ instanceId })}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Pause VM"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
          </button>
        )}
        
        {isPaused && (
          <button
            onClick={() => resumeMutation.mutate({ instanceId })}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Resume VM"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </button>
        )}
        
        {/* Stop */}
        <button
          onClick={() => {
            if (confirm('Stop this VM? This will end your session.')) {
              stopMutation.mutate({ instanceId });
              window.location.href = '/';
            }
          }}
          className="p-1.5 hover:bg-red-50 rounded transition-colors group"
          title="Stop VM"
        >
          <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* VSCode Modal */}
      <VSCodeModal 
        instanceId={instanceId}
        isOpen={showVSCode}
        onClose={() => setShowVSCode(false)}
      />
    </div>
  );
}