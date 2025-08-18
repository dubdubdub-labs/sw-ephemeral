'use client';

import { db } from '@/lib/instant/client';
import { useState, useEffect } from 'react';

interface UserSelectorProps {
  onUserSelected?: (userId: string | null) => void;
}

export function UserSelector({ onUserSelected }: UserSelectorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Query all user profiles with OAuth tokens
  const { data } = db.useQuery({
    userProfiles: {
      oauthTokens: {
        $: { where: { provider: 'anthropic' } }
      }
    }
  });

  const profiles = data?.userProfiles || [];
  const profilesWithTokens = profiles.filter(p => p.oauthTokens && p.oauthTokens.length > 0);

  useEffect(() => {
    // Auto-select first user with token if none selected
    if (!selectedUserId && profilesWithTokens.length > 0) {
      const firstUserId = profilesWithTokens[0].id;
      setSelectedUserId(firstUserId);
      onUserSelected?.(firstUserId);
    }
  }, [profilesWithTokens.length]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    onUserSelected?.(userId);
  };

  if (profilesWithTokens.length === 0) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="text-sm font-medium text-amber-800">No Users with OAuth Tokens</div>
        <div className="text-xs text-amber-600 mt-1">
          Please ensure OAuth tokens are configured in InstantDB
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Select User Account
      </label>
      <select
        value={selectedUserId || ''}
        onChange={(e) => handleUserChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a user...</option>
        {profilesWithTokens.map((profile) => {
          const token = profile.oauthTokens[0];
          const expiresAt = token?.expiresAt ? new Date(token.expiresAt) : null;
          const isExpired = expiresAt ? expiresAt < new Date() : false;
          
          return (
            <option key={profile.id} value={profile.id}>
              {profile.$userEmail || `User ${profile.id.slice(-6)}`}
              {isExpired ? ' (Token Expired)' : ''}
            </option>
          );
        })}
      </select>
      
      {selectedUserId && (
        <div className="mt-2 text-xs text-gray-500">
          {profilesWithTokens.find(p => p.id === selectedUserId)?.oauthTokens.length} token(s) available
        </div>
      )}
    </div>
  );
}