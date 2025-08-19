'use client';

import { useOperatorServices } from '@/hooks/use-operator-services';
import { useIframeErrorHandler } from '@/hooks/use-iframe-error-handler';
import { useRef, useState, useEffect } from 'react';

export function OperatorFrame({ instanceId }: { instanceId: string }) {
  const { serviceUrl, isReady, isLoading, status } = useOperatorServices(instanceId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(serviceUrl);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [iframeLoadCount, setIframeLoadCount] = useState(0);
  
  // Setup error handler for the iframe
  const { recreate: recreateErrorHandler } = useIframeErrorHandler(
    iframeRef,
    {
      onErrorReceived: (error) => {
        console.log('[OperatorFrame] Error detected in iframe:', error);
      },
      onErrorCleared: () => {
        console.log('[OperatorFrame] Error cleared in iframe');
      },
      onDismiss: () => {
        console.log('[OperatorFrame] User dismissed error overlay');
      },
      overlayHeight: 150, // Smaller overlay for operator frame
      accentColor: '#dc2626', // Red-600 to match the design
    },
    iframeLoadCount // Recreate handler when iframe loads
  );
  
  useEffect(() => {
    if (serviceUrl && navigationHistory.length === 0) {
      setCurrentUrl(serviceUrl);
      setNavigationHistory([serviceUrl]);
      setHistoryIndex(0);
      setIsIframeLoading(true);
    }
  }, [serviceUrl]);
  
  const handleIframeLoad = () => {
    setIsIframeLoading(false);
    
    // Try to get the current URL from the iframe (may fail due to CORS)
    if (iframeRef.current) {
      try {
        const newUrl = iframeRef.current.contentWindow?.location.href;
        if (newUrl && newUrl !== currentUrl) {
          setCurrentUrl(newUrl);
          // Add to history
          const newHistory = [...navigationHistory.slice(0, historyIndex + 1), newUrl];
          setNavigationHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      } catch (e) {
        // Can't access cross-origin iframe URL, that's ok
      }
    }
    
    // Recreate error handler after iframe loads
    // Small delay to ensure iframe content is fully ready
    setTimeout(() => {
      setIframeLoadCount(prev => prev + 1);
    }, 100);
  };
  
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsIframeLoading(true);
      const iframe = iframeRef.current;
      iframe.src = iframe.src;
    }
  };
  
  const handleBack = () => {
    if (historyIndex > 0 && iframeRef.current) {
      const newIndex = historyIndex - 1;
      const newUrl = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      setCurrentUrl(newUrl);
      setIsIframeLoading(true);
      iframeRef.current.src = newUrl;
    }
  };
  
  const handleForward = () => {
    if (historyIndex < navigationHistory.length - 1 && iframeRef.current) {
      const newIndex = historyIndex + 1;
      const newUrl = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      setCurrentUrl(newUrl);
      setIsIframeLoading(true);
      iframeRef.current.src = newUrl;
    }
  };
  
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <div className="mt-3 text-sm text-gray-600">Loading services...</div>
        </div>
      </div>
    );
  }
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="text-sm text-gray-600">Waiting for service to be ready...</div>
          <div className="text-xs text-gray-400 mt-1">Status: {status}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full">
      {/* Navigation bar */}
      <div className="absolute top-0 left-0 right-0 h-9 bg-white border-b border-gray-200 flex items-center px-2 z-10">
        <div className="flex items-center gap-1">
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className={`p-1 rounded transition-colors ${
              canGoBack ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Go back"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Forward button */}
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className={`p-1 rounded transition-colors ${
              canGoForward ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Go forward"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            {isIframeLoading ? (
              <svg className="w-4 h-4 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>
        
        {/* URL display */}
        <div className="flex-1 mx-3">
          <div className="text-xs text-gray-500 font-mono truncate">
            {currentUrl || serviceUrl}
          </div>
        </div>
        
        {/* Loading indicator */}
        {isIframeLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
            <span>Loading...</span>
          </div>
        )}
      </div>
      
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={serviceUrl}
        className="w-full h-full border-0 pt-9"
        title="Operator Dev Server"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}