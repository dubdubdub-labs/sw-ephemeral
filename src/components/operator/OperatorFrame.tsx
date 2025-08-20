'use client';

import { useOperatorServices } from '@/hooks/use-operator-services';
import { useIframeErrorHandler } from '@/hooks/use-iframe-error-handler';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface OperatorFrameRef {
  handleBack: () => void;
  handleForward: () => void;
  handleRefresh: () => void;
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

interface OperatorFrameProps {
  instanceId: string;
  onNavigationStateChange?: (state: {
    canGoBack: boolean;
    canGoForward: boolean;
    currentUrl: string;
    isLoading: boolean;
  }) => void;
}

export const OperatorFrame = forwardRef<OperatorFrameRef, OperatorFrameProps>(
  ({ instanceId, onNavigationStateChange }, ref) => {
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
    
    const canGoBack = historyIndex > 0;
    const canGoForward = historyIndex < navigationHistory.length - 1;
    
    // Notify parent of navigation state changes
    useEffect(() => {
      if (onNavigationStateChange) {
        onNavigationStateChange({
          canGoBack,
          canGoForward,
          currentUrl: currentUrl || serviceUrl || '',
          isLoading: isIframeLoading
        });
      }
    }, [canGoBack, canGoForward, currentUrl, serviceUrl, isIframeLoading, onNavigationStateChange]);
    
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
    
    // Expose methods and state to parent
    useImperativeHandle(ref, () => ({
      handleBack,
      handleForward,
      handleRefresh,
      currentUrl: currentUrl || serviceUrl || '',
      canGoBack,
      canGoForward,
      isLoading: isIframeLoading
    }));
    
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
        {/* Iframe - no navigation bar, fills the entire space */}
        <iframe
          ref={iframeRef}
          src={serviceUrl}
          className="w-full h-full border-0"
          title="Operator Dev Server"
          onLoad={handleIframeLoad}
        />
      </div>
    );
  }
);

OperatorFrame.displayName = 'OperatorFrame';