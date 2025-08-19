'use client';

import { useEffect, useRef, RefObject, useCallback } from 'react';
import { IframeErrorHandler } from '@/lib/error-handler';
import type { ErrorOverlayOptions } from '@/lib/error-handler';

export function useIframeErrorHandler(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  options?: ErrorOverlayOptions,
  reloadTrigger?: any // Optional trigger to force recreation (e.g., iframe src change)
) {
  const handlerRef = useRef<IframeErrorHandler | null>(null);

  const createHandler = useCallback(() => {
    // Clean up any existing handler
    if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;
    }

    // Create new handler if iframe exists
    if (iframeRef.current) {
      handlerRef.current = new IframeErrorHandler(iframeRef.current, options);
    }
  }, [iframeRef, options]);

  useEffect(() => {
    createHandler();

    // Cleanup on unmount
    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [createHandler, reloadTrigger]); // Re-create handler when trigger changes

  // Return methods for manual control
  return {
    removeErrorOverlay: () => handlerRef.current?.removeErrorOverlay(),
    destroy: () => handlerRef.current?.destroy(),
    recreate: createHandler, // Allow manual recreation
  };
}