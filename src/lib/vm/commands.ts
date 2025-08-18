export function base64Encode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binaryString = '';
  for (const byte of utf8Bytes) {
    binaryString += String.fromCharCode(byte);
  }
  return btoa(binaryString);
}

export function createClaudeCredentialsCommand(token: {
  authToken: string;
  expiresAt: Date | string | number;
}): string {
  // Handle different date formats from InstantDB
  let expiresAtStr: string;
  if (token.expiresAt instanceof Date) {
    expiresAtStr = token.expiresAt.toISOString();
  } else if (typeof token.expiresAt === 'string') {
    expiresAtStr = token.expiresAt;
  } else {
    expiresAtStr = new Date(token.expiresAt).toISOString();
  }
  
  const credentials = {
    claudeAiOauth: {
      accessToken: token.authToken,
      expiresAt: expiresAtStr,
      scopes: ['user:inference', 'user:profile'],
      subscriptionType: 'max',
    },
  };
  
  const json = JSON.stringify(credentials, null, 2);
  const encoded = base64Encode(json);
  
  return `mkdir -p ~/.claude && echo '${encoded}' | base64 -d > ~/.claude/.credentials.json && chmod 600 ~/.claude/.credentials.json`;
}

export function createClaudeSyncCommand(iterationId: string): string {
  return `pm2 start 'CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync' --name claude-sync --no-autorestart`;
}

export function createClaudeSessionCommand(
  sessionName: string,
  prompt: string,
  systemPrompt: string,
  resumeUuid?: string
): string {
  const encodedPrompt = base64Encode(prompt);
  const encodedSystem = base64Encode(systemPrompt);
  const resumeFlag = resumeUuid ? `-r ${resumeUuid}` : '';
  
  // Normalize session name for pm2
  const normalizedName = sessionName.replace(/[^a-zA-Z0-9-]/g, '-');
  
  // Run Claude Code in ~/operator/sw-compose directory
  return `SESSION_NAME=${sessionName} pm2 start bash --name cc-${normalizedName} --no-autorestart -- -c 'cd ~/operator/sw-compose && echo "${encodedPrompt}" | base64 -d | claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json --verbose --model sonnet --append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"'`;
}

export function createStartDevServerCommand(): string {
  // Start sw-compose dev server on port 3000 using pm2
  return `pm2 start 'bun run dev' --name sw-compose-dev --cwd ~/operator/sw-compose`;
}