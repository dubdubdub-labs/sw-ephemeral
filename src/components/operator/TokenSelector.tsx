'use client';

import { db } from '@/lib/instant/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { isTokenExpired, isTokenExpiringSoon } from '@/lib/anthropic';

interface OAuthToken {
  id: string;
  provider: string;
  authToken: string;
  refreshToken: string;
  expiresAt: Date;
  userProfile?: {
    $userEmail: string;
  };
}

interface TokenSelectorProps {
  onTokenSelected: (tokenId: string | null) => void;
  selectedTokenId?: string | null;
  className?: string;
}

export function TokenSelector({ onTokenSelected, selectedTokenId: propSelectedId, className = '' }: TokenSelectorProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(propSelectedId || null);
  
  // Query all available OAuth tokens
  const { data, isLoading } = db.useQuery({
    oauthTokens: {
      $: { where: { provider: 'anthropic' } },
      userProfile: {}
    }
  });

  const tokens = (data?.oauthTokens || []) as OAuthToken[];

  // Use helper functions from anthropic module

  // Don't auto-select - let user choose

  const handleSelect = (tokenId: string) => {
    setSelectedTokenId(tokenId);
    onTokenSelected(tokenId);
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <h3 className="font-semibold text-yellow-800 mb-2">No OAuth Tokens Available</h3>
        <p className="text-sm text-yellow-700 mb-3">
          No Anthropic OAuth tokens found. You need to add OAuth tokens to proceed.
        </p>
        <Link 
          href="/refresh-token"
          className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
        >
          Add OAuth Token
        </Link>
      </div>
    );
  }

  const validTokens = tokens.filter(t => !isTokenExpired(t.expiresAt));
  const expiredTokens = tokens.filter(t => isTokenExpired(t.expiresAt));
  const allTokens = [...validTokens, ...expiredTokens];

  if (tokens.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <h3 className="font-semibold text-yellow-800 mb-2">No OAuth Tokens Available</h3>
        <p className="text-sm text-yellow-700 mb-3">
          No Anthropic OAuth tokens found. You need to add OAuth tokens to proceed.
        </p>
        <Link 
          href="/refresh-token"
          className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
        >
          Add OAuth Token
        </Link>
      </div>
    );
  }

  if (validTokens.length === 0 && expiredTokens.length > 0) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <h3 className="font-semibold text-red-800 mb-2">All Tokens Expired</h3>
        <p className="text-sm text-red-700 mb-3">
          All {tokens.length} token(s) have expired and need to be refreshed.
        </p>
        <div className="space-y-2 mb-3">
          {tokens.map((token) => (
            <div key={token.id} className="text-xs text-red-600">
              • {token.userProfile?.$userEmail || 'Unknown user'} - Expired {new Date(token.expiresAt).toLocaleDateString()}
            </div>
          ))}
        </div>
        <Link 
          href={`/refresh-token${tokens[0]?.userProfile?.$userEmail ? `?email=${encodeURIComponent(tokens[0].userProfile.$userEmail)}` : ''}`}
          className="inline-block px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Refresh Tokens
        </Link>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider">
          Claude Code OAuth Token
        </label>
        
        {validTokens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 font-medium">Active Tokens</div>
            {validTokens.map((token) => {
            const expired = isTokenExpired(token.expiresAt);
            const expiring = isTokenExpiringSoon(token.expiresAt);
            
            return (
              <label 
                key={token.id} 
                className={`
                  flex items-start p-3 border rounded-lg cursor-pointer transition-all
                  ${selectedTokenId === token.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                  ${expired ? 'opacity-50' : ''}
                `}
              >
                <input
                  type="radio"
                  value={token.id}
                  checked={selectedTokenId === token.id}
                  onChange={() => handleSelect(token.id)}
                  disabled={expired}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {token.userProfile?.$userEmail || 'Unknown User'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {expired ? (
                      <span className="text-red-600">Expired</span>
                    ) : expiring ? (
                      <span className="text-yellow-600">Expires soon: {new Date(token.expiresAt).toLocaleString()}</span>
                    ) : (
                      <span>Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {expiring && (
                    <Link 
                      href={`/refresh-token?email=${encodeURIComponent(token.userProfile?.$userEmail || '')}`}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Refresh this token →
                    </Link>
                  )}
                </div>
              </label>
              );
            })}
          </div>
        )}

        {expiredTokens.length > 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-xs text-gray-500 font-medium">Expired Tokens (Need Refresh)</div>
            {expiredTokens.map((token) => {
              const expired = isTokenExpired(token.expiresAt);
              
              return (
                <label 
                  key={token.id} 
                  className={`
                    flex items-start p-3 border rounded-lg cursor-pointer transition-all
                    ${selectedTokenId === token.id 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                    opacity-75
                  `}
                >
                  <input
                    type="radio"
                    value={token.id}
                    checked={selectedTokenId === token.id}
                    onChange={() => handleSelect(token.id)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {token.userProfile?.$userEmail || 'Unknown User'}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Expired: {new Date(token.expiresAt).toLocaleString()}
                    </div>
                    <Link 
                      href={`/refresh-token?email=${encodeURIComponent(token.userProfile?.$userEmail || '')}`}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Refresh this token →
                    </Link>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="text-xs text-gray-500">
          <Link 
            href="/refresh-token"
            className="text-blue-600 hover:text-blue-800"
          >
            + Add new OAuth token
          </Link>
        </div>
      </div>
    </div>
  );
}