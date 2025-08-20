import { db } from '@/lib/instant/client';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import * as commands from '@/lib/vm/commands';
import { OPERATOR_SYSTEM_PROMPT } from '@/lib/vm/constants';

export function useOperatorChat(taskId: string, instanceId?: string, model: 'sonnet' | 'opus' = 'sonnet') {
  const [isSending, setIsSending] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const execCommandsMutation = trpc.morph.instances.execCommandsOnInstance.useMutation();
  
  // Query for task with all sessions and messages
  const { data } = db.useQuery({
    tasks: {
      $: { where: { id: taskId } },
      iterations: {
        sessions: {
          messages: {
            messageParts: {}
          }
        }
      }
    }
  });
  
  const task = data?.tasks?.[0];
  const iterations = task?.iterations || [];
  
  // Debug logging
  console.log('Task iterations:', iterations.length);
  
  // Get the most recent iteration (should be only one for current VM)
  const currentIteration = iterations[iterations.length - 1];
  const currentSessions = currentIteration?.sessions || [];
  
  console.log('Current iteration sessions:', currentSessions.length);
  
  // Filter messages based on selected session or show all if none selected
  const messages = selectedSessionId 
    ? currentSessions
        .filter((session: any) => session.id === selectedSessionId)
        .flatMap((session: any) => session.messages || [])
    : currentSessions
        .flatMap((session: any) => session.messages || [])
        .sort((a: any, b: any) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });
  
  // Get the latest session for resuming
  const latestSession = currentSessions.sort((a: any, b: any) => {
    const aTime = new Date(a.lastMessageAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || 0).getTime();
    return bTime - aTime;
  })[0];
  
  async function sendMessage(content: string) {
    // Use selected session if available, otherwise use latest
    const sessionToUse = selectedSessionId 
      ? currentSessions.find((s: any) => s.id === selectedSessionId)
      : latestSession;
      
    if (!instanceId || !sessionToUse) return;
    
    setIsSending(true);
    try {
      // Generate unique session name for continuation
      const sessionCount = currentSessions.length;
      const newSessionName = `operator-main-${sessionCount + 1}`;
      
      console.log('Sending message, resuming from session:', sessionToUse.externalUuid);
      
      // Use resume command with existing session UUID
      const command = commands.createClaudeSessionCommand(
        newSessionName,
        content,
        OPERATOR_SYSTEM_PROMPT,
        sessionToUse.externalUuid, // Resume from this session
        model
      );
      
      await execCommandsMutation.mutateAsync({
        instanceId,
        commands: [{ command }],
      });
    } finally {
      setIsSending(false);
    }
  }
  
  return {
    sessions: currentSessions, // Only show sessions from current iteration
    latestSession,
    messages,
    sendMessage,
    isSending,
    selectedSessionId,
    setSelectedSessionId,
    isWaitingForResponse,
    setIsWaitingForResponse,
    debug: {
      totalIterations: iterations.length,
      currentIterationSessions: currentSessions.length,
      totalMessages: messages.length,
    }
  };
}