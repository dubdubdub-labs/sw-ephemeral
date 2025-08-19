export interface ErrorBroadcastMessage {
  type: 'nextjs-error' | 'nextjs-error-cleared';
  error?: {
    message: string;
    stack?: string;
    componentStack?: string;
    digest?: string;
    isCompileError?: boolean;
    isRuntimeError?: boolean;
  };
  timestamp: number;
  url: string;
}

export interface ErrorOverlayOptions {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  showDetails?: boolean;
  overlayHeight?: number;
  customContent?: (error: ErrorBroadcastMessage) => string;
  onErrorReceived?: (error: ErrorBroadcastMessage) => void;
  onErrorCleared?: () => void;
  onDismiss?: () => void;
}

export interface IframeErrorHandler {
  removeErrorOverlay: () => void;
  destroy: () => void;
}