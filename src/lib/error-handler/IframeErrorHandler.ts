import type { ErrorBroadcastMessage, ErrorOverlayOptions } from './types';

export class IframeErrorHandler {
  private iframe: HTMLIFrameElement | null = null;
  private errorOverlay: HTMLDivElement | null = null;
  private options: Required<ErrorOverlayOptions>;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  constructor(iframe: HTMLIFrameElement, options: ErrorOverlayOptions = {}) {
    this.iframe = iframe;
    this.options = {
      backgroundColor: '#0f0f0f',
      textColor: '#ffffff',
      accentColor: '#ef4444',
      showDetails: true,
      overlayHeight: 200,
      customContent: options.customContent || this.getDefaultContent.bind(this),
      onErrorReceived: options.onErrorReceived || (() => {}),
      onErrorCleared: options.onErrorCleared || (() => {}),
      onDismiss: options.onDismiss || (() => {}),
      ...options,
    };
    this.init();
  }

  private init(): void {
    if (!this.iframe) return;

    this.messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'nextjs-error') {
        this.handleError(event.data as ErrorBroadcastMessage);
      } else if (event.data?.type === 'nextjs-error-cleared') {
        this.handleErrorCleared();
      }
    };

    this.resizeHandler = () => this.updateOverlayPosition();

    window.addEventListener('message', this.messageHandler);
    window.addEventListener('resize', this.resizeHandler);
    
    // Request current error state from iframe (in case error already occurred)
    // The broadcaster should respond if there's an active error
    if (this.iframe.contentWindow) {
      try {
        this.iframe.contentWindow.postMessage(
          { type: 'request-error-state' },
          '*'
        );
      } catch (e) {
        // Iframe might not be ready yet, that's ok
      }
    }
  }

  private handleError(errorMessage: ErrorBroadcastMessage): void {
    this.options.onErrorReceived(errorMessage);
    if (errorMessage.error) {
      this.showErrorOverlay(errorMessage);
    }
  }

  private handleErrorCleared(): void {
    this.options.onErrorCleared();
    this.removeErrorOverlay();
  }

  private showErrorOverlay(errorMessage: ErrorBroadcastMessage): void {
    this.removeErrorOverlay();

    if (!this.iframe) return;

    const iframeRect = this.iframe.getBoundingClientRect();
    
    this.errorOverlay = document.createElement('div');
    this.errorOverlay.style.cssText = `
      position: fixed;
      top: ${iframeRect.top}px;
      left: ${iframeRect.left}px;
      width: ${iframeRect.width}px;
      height: ${this.options.overlayHeight}px;
      background: ${this.options.backgroundColor}ee;
      color: ${this.options.textColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 1.5rem;
      box-sizing: border-box;
      border-bottom: 3px solid ${this.options.accentColor};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    const content = this.options.customContent(errorMessage);
    this.errorOverlay.innerHTML = content;

    document.body.appendChild(this.errorOverlay);

    this.attachOverlayEventHandlers();
  }

  private attachOverlayEventHandlers(): void {
    if (!this.errorOverlay) return;

    const dismissButton = this.errorOverlay.querySelector('[data-dismiss]');
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        this.removeErrorOverlay();
        this.options.onDismiss();
      });
    }

    const retryButton = this.errorOverlay.querySelector('[data-retry]');
    if (retryButton && this.iframe) {
      retryButton.addEventListener('click', () => {
        if (this.iframe) {
          this.iframe.src = this.iframe.src;
          this.removeErrorOverlay();
        }
      });
    }

    const detailsButton = this.errorOverlay.querySelector('[data-details]');
    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        const details = this.errorOverlay?.querySelector('[data-error-details]') as HTMLElement;
        if (details) {
          const isHidden = details.style.display === 'none';
          details.style.display = isHidden ? 'block' : 'none';
          (detailsButton as HTMLElement).textContent = isHidden ? 'Hide Details' : 'Show Details';
        }
      });
    }
  }

  private getDefaultContent(errorMessage: ErrorBroadcastMessage): string {
    const isCompileError = errorMessage.error?.isCompileError;
    const errorType = isCompileError ? 'Compilation Error' : 'Runtime Error';
    
    return `
      <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${this.options.accentColor}" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600;">
            ${errorType} Detected in Operator
          </h2>
        </div>
        
        <p style="margin: 0 0 1rem 0; font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.8rem; color: ${this.options.accentColor}; max-width: 90%; text-align: center;">
          ${this.escapeHtml(errorMessage.error?.message || '')}
        </p>
        
        <div style="display: flex; gap: 0.75rem;">
          <button data-retry style="
            background: ${this.options.accentColor};
            color: white;
            border: none;
            padding: 0.4rem 1.2rem;
            border-radius: 0.25rem;
            font-size: 0.8rem;
            cursor: pointer;
            font-weight: 500;
            transition: opacity 0.2s;
          " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            Retry
          </button>
          
          <button data-dismiss style="
            background: transparent;
            color: ${this.options.textColor};
            border: 1px solid ${this.options.textColor}33;
            padding: 0.4rem 1.2rem;
            border-radius: 0.25rem;
            font-size: 0.8rem;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
            Dismiss
          </button>
          
          ${this.options.showDetails ? `
            <button data-details style="
              background: transparent;
              color: ${this.options.textColor}88;
              border: none;
              padding: 0.4rem 1rem;
              font-size: 0.75rem;
              cursor: pointer;
              text-decoration: underline;
            ">
              Show Details
            </button>
          ` : ''}
        </div>
        
        ${this.options.showDetails && errorMessage.error?.stack ? `
          <div data-error-details style="
            display: none;
            margin-top: 1rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid ${this.options.accentColor}33;
            border-radius: 0.25rem;
            padding: 0.5rem;
            max-width: 90%;
            max-height: 60px;
            overflow-y: auto;
          ">
            <pre style="
              margin: 0;
              font-size: 0.6rem;
              color: ${this.options.textColor}88;
              white-space: pre-wrap;
              word-break: break-all;
            ">${this.escapeHtml(errorMessage.error.stack)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private updateOverlayPosition(): void {
    if (!this.errorOverlay || !this.iframe) return;
    
    const iframeRect = this.iframe.getBoundingClientRect();
    this.errorOverlay.style.top = `${iframeRect.top}px`;
    this.errorOverlay.style.left = `${iframeRect.left}px`;
    this.errorOverlay.style.width = `${iframeRect.width}px`;
    this.errorOverlay.style.height = `${this.options.overlayHeight}px`;
  }

  public removeErrorOverlay(): void {
    if (this.errorOverlay) {
      this.errorOverlay.remove();
      this.errorOverlay = null;
    }
  }

  public destroy(): void {
    this.removeErrorOverlay();
    
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    this.iframe = null;
  }
}