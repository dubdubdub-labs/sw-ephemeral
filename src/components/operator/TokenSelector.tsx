'use client';

import { db } from '@/lib/instant/client';
import { useState } from 'react';

interface TokenSelectorProps {
  onTokenSelected: (token: any) => void;
}

export function TokenSelector({ onTokenSelected }: TokenSelectorProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  
  // Query all available OAuth tokens
  const { data } = db.useQuery({
    oauthTokens: {
      $: { where: { provider: 'anthropic' } },
      userProfile: {}
    }
  });

  const tokens = data?.oauthTokens || [];

  const handleSelect = () => {
    const token = tokens.find(t => t.id === selectedTokenId);
    if (token) {
      onTokenSelected(token);
    }
  };

  if (tokens.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">No OAuth Tokens Available</h3>
        <p className="text-sm text-yellow-700">
          No Anthropic OAuth tokens found in the database. 
          Please ensure OAuth tokens are configured in InstantDB.
        </p>
      </div>
    );
  }

  if (tokens.length === 1) {
    // Auto-select if only one token
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          Using available OAuth token (expires: {new Date(tokens[0].expiresAt).toLocaleDateString()})
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-semibold mb-3">Select OAuth Token</h3>
      <div className="space-y-2">
        {tokens.map((token) => (
          <label key={token.id} className="flex items-center space-x-2">
            <input
              type="radio"
              value={token.id}
              checked={selectedTokenId === token.id}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="form-radio"
            />
            <span className="text-sm">
              Token {token.id.slice(-6)} - 
              User: {token.userProfile?.$userEmail || 'Unknown'} - 
              Expires: {new Date(token.expiresAt).toLocaleDateString()}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={handleSelect}
        disabled={!selectedTokenId}
        className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        Use Selected Token
      </button>
    </div>
  );
}