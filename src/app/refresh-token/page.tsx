'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/instant/client';
import { id } from '@instantdb/core';
import Link from 'next/link';
import { generateAuthURL, exchangeToken, refreshToken } from './actions';

export default function RefreshTokenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email');
  
  const [selectedEmail, setSelectedEmail] = useState<string>(emailParam || '');
  const [authURL, setAuthURL] = useState<string>('');
  const [verifier, setVerifier] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'select' | 'authorize' | 'complete'>('select');
  
  // Query existing users with their tokens
  const { data } = db.useQuery({
    userProfiles: {
      oauthTokens: {
        $: { where: { provider: 'anthropic' } }
      }
    }
  });
  
  const users = data?.userProfiles || [];
  
  // Get all tokens from all users
  const allTokens = users.flatMap(u => u.oauthTokens || []);
  
  // Find the selected user and their token
  const selectedUser = users.find(u => u.$userEmail === selectedEmail);
  const selectedUserToken = selectedUser?.oauthTokens?.[0];
  const isRefresh = !!selectedUserToken;
  const isExpired = selectedUserToken ? new Date(selectedUserToken.expiresAt) < new Date() : false;
  
  // Generate auth URL when user is selected
  const handleGenerateAuthURL = async () => {
    const { authURL: url, verifier: v } = await generateAuthURL();
    setAuthURL(url);
    setVerifier(v);
    setStep('authorize');
  };
  
  // Exchange auth code for tokens
  const handleExchangeToken = async () => {
    if (!authCode || !verifier) {
      setError('Please paste the authorization code');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      // Exchange the code for tokens
      const credentials = await exchangeToken(authCode, verifier);
      
      // Handle user and token creation/update
      const targetEmail = credentials.email || selectedEmail;
      let targetUser = users.find(u => u.$userEmail === targetEmail);
      
      if (!targetUser) {
        // Create new user profile first
        const userProfileId = id();
        await db.transact([
          db.tx.userProfiles[userProfileId].update({
            $userEmail: targetEmail,
            username: targetEmail.split('@')[0]
          })
        ]);
        
        // Create new token for the new user
        const tokenId = id();
        await db.transact([
          db.tx.oauthTokens[tokenId]
            .update({
              provider: 'anthropic',
              authToken: credentials.access_token,
              refreshToken: credentials.refresh_token,
              expiresAt: new Date(credentials.expires_at),
            })
            .link({
              userProfile: userProfileId
            })
        ]);
      } else {
        // User exists - check if they have a token
        const existingToken = targetUser.oauthTokens?.[0];
        
        if (existingToken) {
          // Update existing token
          await db.transact([
            db.tx.oauthTokens[existingToken.id].update({
              authToken: credentials.access_token,
              refreshToken: credentials.refresh_token,
              expiresAt: new Date(credentials.expires_at),
            })
          ]);
        } else {
          // User exists but has no token - create one
          const tokenId = id();
          await db.transact([
            db.tx.oauthTokens[tokenId]
              .update({
                provider: 'anthropic',
                authToken: credentials.access_token,
                refreshToken: credentials.refresh_token,
                expiresAt: new Date(credentials.expires_at),
              })
              .link({
                userProfile: targetUser.id
              })
          ]);
        }
      }
      
      setSuccess(true);
      setStep('complete');
      
      // Redirect back to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (err) {
      console.error('Token exchange error:', err);
      setError(err instanceof Error ? err.message : 'Failed to exchange token');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle refresh using existing refresh token
  const handleRefreshToken = async () => {
    if (!selectedUserToken?.refreshToken) {
      setError('No refresh token available for this user');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      const credentials = await refreshToken(selectedUserToken.refreshToken);
      
      // Update the token
      await db.transact([
        db.tx.oauthTokens[selectedUserToken.id].update({
          authToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          expiresAt: new Date(credentials.expires_at),
        })
      ]);
      
      setSuccess(true);
      setStep('complete');
      
      // Redirect back to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (err) {
      console.error('Token refresh error:', err);
      setError('Failed to refresh token. Please try re-authorizing.');
      // Fall back to re-authorization
      handleGenerateAuthURL();
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white border border-gray-200 shadow-sm">
          <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                OAuth Token Management
              </span>
            </div>
            <Link 
              href="/"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Link>
          </div>
          
          <div className="p-6">
            {step === 'select' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">
                    {isRefresh ? 'Refresh OAuth Token' : 'Add OAuth Token'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isRefresh 
                      ? 'Select the user whose token you want to refresh'
                      : 'Select or enter the user email for the OAuth token'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
                    User Email
                  </label>
                  
                  {users.length > 0 ? (
                    <select
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select a user...</option>
                      {users.map((user) => {
                        const userToken = user.oauthTokens?.[0];
                        const hasToken = !!userToken;
                        const isExpired = userToken ? new Date(userToken.expiresAt) < new Date() : false;
                        
                        return (
                          <option key={user.id} value={user.$userEmail}>
                            {user.$userEmail} 
                            {hasToken && (isExpired ? ' (expired)' : ' (active)')}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400"
                    />
                  )}
                  
                  {users.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No existing users found. Enter a new email address.
                    </p>
                  )}
                </div>
                
                {selectedUserToken && (
                  <div className={`p-3 rounded-lg ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="text-sm font-medium ${isExpired ? 'text-red-800' : 'text-green-800'}">
                      Current Token Status
                    </div>
                    <div className="text-xs ${isExpired ? 'text-red-600' : 'text-green-600'} mt-1">
                      {isExpired 
                        ? `Expired on ${new Date(selectedUserToken.expiresAt).toLocaleDateString()}`
                        : `Expires on ${new Date(selectedUserToken.expiresAt).toLocaleDateString()}`
                      }
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {selectedUserToken && !isExpired && (
                    <button
                      onClick={handleRefreshToken}
                      disabled={!selectedEmail || isProcessing}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Quick Refresh Token
                    </button>
                  )}
                  
                  <button
                    onClick={handleGenerateAuthURL}
                    disabled={!selectedEmail}
                    className="flex-1 py-2 px-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedUserToken ? 'Re-authorize' : 'Authorize New Token'}
                  </button>
                </div>
              </div>
            )}
            
            {step === 'authorize' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Authorize with Claude</h2>
                  <p className="text-sm text-gray-600 mb-1">
                    Authorizing for: <span className="font-medium">{selectedEmail}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Follow these steps to complete the authorization:
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-sm mb-2">Step 1: Open Claude Authorization</div>
                    <p className="text-xs text-gray-600 mb-3">
                      Click the button below to open the Claude authorization page in a new tab.
                    </p>
                    <a
                      href={authURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Open Claude Authorization →
                    </a>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-medium text-sm mb-2">Step 2: Copy the Code</div>
                    <p className="text-xs text-gray-600 mb-3">
                      After authorizing, you'll see a code in the format: <code className="bg-gray-200 px-1">code#state</code>
                    </p>
                    <p className="text-xs text-gray-600">
                      Copy the entire string including both the code and state parts.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-medium text-sm mb-2">Step 3: Paste the Code</div>
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Paste the code#state here..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-400 font-mono"
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('select')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={handleExchangeToken}
                    disabled={!authCode || isProcessing}
                    className="flex-1 py-2 px-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Complete Authorization'}
                  </button>
                </div>
              </div>
            )}
            
            {step === 'complete' && success && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold mb-2">Token Updated Successfully!</h2>
                <p className="text-sm text-gray-600 mb-4">
                  OAuth token for {selectedEmail} has been {isRefresh ? 'refreshed' : 'added'}.
                </p>
                <p className="text-xs text-gray-500">
                  Redirecting to home...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}