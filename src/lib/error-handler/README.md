# Iframe Error Handler for Operator Frame

This error handler system detects and displays NextJS errors from iframed operator applications.

## Features

- ✅ Automatic error detection from NextJS apps in iframes
- ✅ Auto-dismissal when errors are fixed
- ✅ Partial overlay design (customizable height)
- ✅ Type-safe TypeScript implementation
- ✅ Clean React hook integration
- ✅ Customizable error display

## Usage

The error handler is already integrated into `OperatorFrame.tsx`:

```typescript
// Setup error handler for the iframe
useIframeErrorHandler(iframeRef, {
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
});
```

## File Structure

```
src/lib/error-handler/
├── types.ts              # TypeScript interfaces
├── IframeErrorHandler.ts # Main error handler class
├── index.ts             # Export barrel
└── README.md            # This file

src/hooks/
└── use-iframe-error-handler.ts # React hook
```

## Customization Options

```typescript
interface ErrorOverlayOptions {
  backgroundColor?: string;  // Default: '#0f0f0f'
  textColor?: string;       // Default: '#ffffff'
  accentColor?: string;     // Default: '#ef4444'
  showDetails?: boolean;    // Default: true
  overlayHeight?: number;   // Default: 200px
  customContent?: (error: ErrorBroadcastMessage) => string;
  onErrorReceived?: (error: ErrorBroadcastMessage) => void;
  onErrorCleared?: () => void;
  onDismiss?: () => void;
}
```

## How It Works

1. **Error Detection**: The iframed NextJS app (sw-compose) broadcasts errors via postMessage
2. **Message Handling**: IframeErrorHandler listens for error messages
3. **Overlay Display**: Shows a partial overlay at the top of the iframe
4. **Auto-Clear**: Automatically removes overlay when error is fixed
5. **User Actions**: Provides Retry and Dismiss buttons

## Testing

1. Make sure sw-compose has the error broadcaster initialized
2. Navigate to an operator frame that loads sw-compose
3. Introduce an error in sw-compose (e.g., throw an error)
4. Verify the custom error overlay appears
5. Fix the error and verify auto-dismissal

## Architecture Benefits

- **Clean Separation**: Error handling logic is separate from UI components
- **Type Safety**: Full TypeScript support with proper interfaces
- **Reusability**: Can be used in any component with an iframe
- **Maintainability**: Well-organized module structure
- **No Spaghetti Code**: Clear separation of concerns