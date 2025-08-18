import { db } from '@/lib/instant/client';

export function useAnthropicOAuth() {
  const { user } = db.useAuth();
  
  // First try to get token for authenticated user
  const { data: userTokenData, isLoading: userLoading } = db.useQuery(
    user ? {
      userProfiles: {
        $: { where: { $userEmail: user.email || '' } },
        oauthTokens: {
          $: { where: { provider: 'anthropic' } }
        }
      }
    } : null
  );

  // Also query for ANY available token (for testing/development)
  const { data: anyTokenData, isLoading: anyLoading } = db.useQuery({
    oauthTokens: {
      $: { where: { provider: 'anthropic' } }
    }
  });

  // Use user's token if available, otherwise use any available token
  const profile = userTokenData?.userProfiles?.[0];
  const userToken = profile?.oauthTokens?.[0];
  const anyToken = anyTokenData?.oauthTokens?.[0];
  const token = userToken || anyToken;
  
  // Debug logging
  console.log('OAuth hook state:', {
    hasUser: !!user,
    userEmail: user?.email,
    profilesFound: userTokenData?.userProfiles?.length || 0,
    userTokenFound: !!userToken,
    anyTokensFound: anyTokenData?.oauthTokens?.length || 0,
    anyTokenFound: !!anyToken,
    finalToken: !!token,
  });
  
  return {
    token,
    isConnected: !!token,
    authToken: token?.authToken as string | undefined,
    refreshToken: token?.refreshToken as string | undefined,
    expiresAt: token?.expiresAt as Date | undefined,
    isUsingSharedToken: !userToken && !!anyToken,
    isLoading: anyLoading || userLoading,
  };
}