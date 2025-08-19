'use client';

import { useRouter } from 'next/navigation';
import { id } from '@instantdb/core';
import { db } from '@/lib/instant/client';
import { useState } from 'react';
import * as React from 'react';
import { isTokenExpired, isTokenExpiringSoon } from '@/lib/anthropic';
import Link from 'next/link';
import { PromptSelector } from '@/components/prompts/PromptSelector';
import { usePromptMutations } from '@/hooks/use-prompt-mutations';

export default function HomePage() {
  const router = useRouter();
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [expandTokenSelector, setExpandTokenSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  
  const { setTaskSystemPrompt } = usePromptMutations();
  
  // Query all users with their tokens
  const { data, isLoading: dataLoading } = db.useQuery({
    userProfiles: {
      oauthTokens: {
        $: { where: { provider: 'anthropic' } }
      }
    }
  });
  
  const users = data?.userProfiles || [];
  const allTokens = users.flatMap(u => 
    (u.oauthTokens || []).map(token => ({
      ...token,
      userEmail: u.$userEmail || 'Unknown'
    }))
  );
  
  // Auto-select first valid token if none selected
  React.useEffect(() => {
    if (!selectedTokenId && allTokens.length > 0) {
      const validToken = allTokens.find(t => !isTokenExpired(t.expiresAt));
      if (validToken) {
        setSelectedTokenId(validToken.id);
      } else if (allTokens.length > 0) {
        setSelectedTokenId(allTokens[0].id);
      }
    }
  }, [allTokens.length]); // Only run when tokens are loaded
  
  const selectedToken = allTokens.find(t => t.id === selectedTokenId);
  const isSelectedTokenExpired = selectedToken ? isTokenExpired(selectedToken.expiresAt) : false;
  const isSelectedTokenExpiringSoon = selectedToken ? isTokenExpiringSoon(selectedToken.expiresAt) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) return;
    
    if (!selectedTokenId) {
      alert('Please select an OAuth token first');
      return;
    }
    
    if (isSelectedTokenExpired) {
      alert('The selected token is expired. Please refresh it first.');
      return;
    }
    
    if (!selectedPromptId || !selectedVersionId) {
      alert('Please select a system prompt for the task');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create a new task with the selected token
      const taskId = id();
      
      await db.transact([
        db.tx.tasks[taskId].update({
          name: prompt.slice(0, 100), // Use first 100 chars as name
          description: prompt,
          lastMessageAt: new Date(),
          // Store the selected token ID in task metadata
          metadata: { selectedTokenId }
        })
      ]);
      
      // Link the selected prompt to the task
      await setTaskSystemPrompt({
        taskId,
        promptId: selectedPromptId,
        versionId: selectedVersionId,
      });
      
      // Navigate to the operator page with the task ID and token
      router.push(`/operator/${taskId}?prompt=${encodeURIComponent(prompt)}&tokenId=${selectedTokenId}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full p-6">
        <div className="bg-white border border-gray-200 shadow-sm">
          <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                SW-Ephemeral Operator
              </span>
            </div>
            <Link 
              href="/prompts"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Prompts →
            </Link>
          </div>
          
          <div className="p-6">
            {/* Token Selector Section */}
            <div className="mb-6">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandTokenSelector(!expandTokenSelector)}
              >
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Claude Code Account
                </label>
                <button 
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {expandTokenSelector ? '▼' : '▶'} {expandTokenSelector ? 'Hide' : 'Change'}
                </button>
              </div>
              
              {!expandTokenSelector && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {dataLoading ? (
                    <div className="text-sm text-gray-500">Loading accounts...</div>
                  ) : selectedToken ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{selectedToken.userEmail}</div>
                        <div className="text-xs text-gray-500">
                          {isSelectedTokenExpired ? (
                            <span className="text-red-600">Expired</span>
                          ) : isSelectedTokenExpiringSoon ? (
                            <span className="text-yellow-600">Expires soon: {new Date(selectedToken.expiresAt).toLocaleString()}</span>
                          ) : (
                            <span>Expires: {new Date(selectedToken.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {(isSelectedTokenExpired || isSelectedTokenExpiringSoon) && (
                        <Link
                          href={`/refresh-token?email=${encodeURIComponent(selectedToken.userEmail)}`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Refresh →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No token selected. 
                      <Link href="/refresh-token" className="text-blue-600 hover:text-blue-800">
                        Add a token
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {expandTokenSelector && (
                <div className="mt-3 space-y-2">
                  {allTokens.length === 0 ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">No OAuth tokens found.</p>
                      <Link 
                        href="/refresh-token"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Add OAuth Token →
                      </Link>
                    </div>
                  ) : (
                    allTokens.map((token) => {
                      const expired = isTokenExpired(token.expiresAt);
                      const expiring = isTokenExpiringSoon(token.expiresAt);
                      
                      return (
                        <label 
                          key={token.id} 
                          className={`
                            flex items-start p-3 border rounded-lg cursor-pointer transition-all
                            ${selectedTokenId === token.id 
                              ? expired ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                            ${expired ? 'opacity-75' : ''}
                          `}
                        >
                          <input
                            type="radio"
                            value={token.id}
                            checked={selectedTokenId === token.id}
                            onChange={() => setSelectedTokenId(token.id)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{token.userEmail}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {expired ? (
                                <span className="text-red-600">Expired: {new Date(token.expiresAt).toLocaleString()}</span>
                              ) : expiring ? (
                                <span className="text-yellow-600">Expires soon: {new Date(token.expiresAt).toLocaleString()}</span>
                              ) : (
                                <span>Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            {(expired || expiring) && (
                              <Link 
                                href={`/refresh-token?email=${encodeURIComponent(token.userEmail)}`}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Refresh this token →
                              </Link>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                  
                  <Link 
                    href="/refresh-token"
                    className="block text-xs text-blue-600 hover:text-blue-800 mt-2"
                  >
                    + Add new OAuth token
                  </Link>
                </div>
              )}
            </div>
            
            {/* Prompt Selector Section */}
            <div className="mb-6">
              <PromptSelector
                onSelect={(promptId, versionId) => {
                  setSelectedPromptId(promptId);
                  setSelectedVersionId(versionId);
                }}
                required={true}
                className=""
              />
            </div>
            
            {/* Warning for expired token */}
            {isSelectedTokenExpired && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800">Token Expired</div>
                <div className="text-xs text-red-600 mt-1">
                  This token needs to be refreshed before you can start an operator session.
                </div>
                <Link
                  href={`/refresh-token?email=${encodeURIComponent(selectedToken?.userEmail || '')}`}
                  className="inline-block mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Refresh Token Now
                </Link>
              </div>
            )}
            
            {/* Prompt Input Section */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
                  Project Description
                </label>
                <textarea
                  id="prompt"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to build..."
                  disabled={isLoading || isSelectedTokenExpired}
                  className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>
              
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading || isSelectedTokenExpired || !selectedTokenId || !selectedPromptId || !selectedVersionId}
                className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Operator...
                  </span>
                ) : isSelectedTokenExpired ? (
                  'Cannot Start - Token Expired'
                ) : (
                  'Start Operator'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}