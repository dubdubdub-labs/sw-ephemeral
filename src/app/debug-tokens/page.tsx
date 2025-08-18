'use client';

import { db } from '@/lib/instant/client';
import { useAnthropicOAuth } from '@/hooks/use-anthropic-oauth';

export default function DebugTokensPage() {
  const { user } = db.useAuth();
  const { token, isConnected, isUsingSharedToken, authToken, expiresAt } = useAnthropicOAuth();
  
  // Query all tokens
  const { data } = db.useQuery({
    oauthTokens: {
      $: { where: { provider: 'anthropic' } },
      userProfile: {}
    }
  });

  const allTokens = data?.oauthTokens || [];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">OAuth Token Debug</h1>
      
      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current User Status</h2>
          <div className="space-y-2 text-sm">
            <div>Authenticated: {user ? 'Yes' : 'No'}</div>
            {user && <div>User Email: {user.email || 'Not set'}</div>}
            {user && <div>User ID: {user.id}</div>}
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Active Token (from hook)</h2>
          <div className="space-y-2 text-sm">
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Using Shared Token: {isUsingSharedToken ? 'Yes' : 'No'}</div>
            {token && (
              <>
                <div>Auth Token: {authToken ? `${authToken.slice(0, 20)}...` : 'None'}</div>
                <div>Expires: {expiresAt ? new Date(expiresAt).toLocaleString() : 'Unknown'}</div>
              </>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All Available Tokens ({allTokens.length})</h2>
          {allTokens.length === 0 ? (
            <p className="text-gray-500">No tokens found in database</p>
          ) : (
            <div className="space-y-3">
              {allTokens.map((token, index) => (
                <div key={token.id} className="p-3 bg-gray-50 rounded">
                  <div className="font-mono text-xs">Token #{index + 1}</div>
                  <div className="text-sm space-y-1 mt-2">
                    <div>ID: {token.id}</div>
                    <div>Provider: {token.provider}</div>
                    <div>Auth Token: {token.authToken ? `${token.authToken.slice(0, 20)}...` : 'None'}</div>
                    <div>Refresh Token: {token.refreshToken ? 'Present' : 'None'}</div>
                    <div>Expires: {new Date(token.expiresAt).toLocaleString()}</div>
                    <div>User Profile: {token.userProfile?.$userEmail || 'Not linked'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>The system will now use ANY available Anthropic token if no user-specific token is found</li>
            <li>This allows testing without authentication</li>
            <li>Tokens must have provider: "anthropic" to be recognized</li>
            <li>Check that tokens haven't expired</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8">
        <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Back to Home
        </a>
      </div>
    </div>
  );
}