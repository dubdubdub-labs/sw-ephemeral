'use client';

import { useOperatorChat } from '@/hooks/use-operator-chat';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { useState, useEffect } from 'react';

export function OperatorChat({ 
  taskId, 
  instanceId 
}: { 
  taskId: string;
  instanceId?: string;
}) {
  const { messages, sendMessage, isSending, sessions, setSelectedSessionId, selectedSessionId, isWaitingForResponse, setIsWaitingForResponse } = useOperatorChat(taskId, instanceId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSessionCount, setLastSessionCount] = useState(0);
  
  // Auto-select the latest session when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      // Sort sessions by creation time and select the latest
      const sortedSessions = sessions.sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime; // Sort descending (latest first)
      });
      
      const latestSession = sortedSessions[0];
      
      // Always switch to the latest session when a new one appears
      if (sessions.length > lastSessionCount) {
        console.log('New session detected, switching to:', latestSession.id);
        setSelectedSessionId(latestSession.id);
        setIsWaitingForResponse(false); // New session means response arrived
        setLastSessionCount(sessions.length);
      } else if (!selectedSessionId) {
        // Initial selection
        setSelectedSessionId(latestSession.id);
        setLastSessionCount(sessions.length);
      }
    }
  }, [sessions, selectedSessionId, setSelectedSessionId, lastSessionCount, setIsWaitingForResponse]);
  
  // Check if Claude is ready (first session exists)
  const isClaudeReady = sessions.length > 0;
  
  return (
    <div className={`
      fixed bottom-4 right-4 bg-white border border-gray-200
      transition-all duration-200
      ${isExpanded ? 'w-[600px] h-[700px]' : 'w-[400px] h-[500px]'}
      shadow-lg
    `}>
      <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isWaitingForResponse ? 'bg-yellow-500' :
              isClaudeReady ? 'bg-green-500' : 
              'bg-yellow-500'
            } animate-pulse`} />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              {isWaitingForResponse ? 'Claude Thinking...' :
               isClaudeReady ? 'Claude Ready' : 
               'Initializing'}
            </span>
          </div>
          
          {/* Session selector */}
          {sessions.length > 1 && (
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 focus:outline-none focus:border-gray-400"
            >
              {sessions
                .sort((a: any, b: any) => {
                  const aTime = new Date(a.createdAt || 0).getTime();
                  const bTime = new Date(b.createdAt || 0).getTime();
                  return bTime - aTime; // Sort descending (latest first)
                })
                .map((session: any, index: number) => (
                  <option key={session.id} value={session.id}>
                    Session {sessions.length - index} 
                    {index === 0 ? ' (Latest)' : ''}
                  </option>
                ))}
            </select>
          )}
          
          {sessions.length > 0 && (
            <div className="text-xs text-gray-500">
              {messages.length} messages
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            )}
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col" style={{ height: 'calc(100% - 40px)' }}>
        {!isClaudeReady ? (
          // Loading state while Claude is being initialized
          <div className="flex-1 flex items-center justify-center bg-gray-50/50">
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-500">Initializing Claude...</div>
              <div className="text-xs text-gray-400 mt-1">Setting up your AI assistant</div>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} className="flex-1 overflow-y-auto bg-gray-50/50" />
            <MessageInput 
              onSend={(msg) => {
                sendMessage(msg);
                setIsWaitingForResponse(true); // Lock input after sending
              }} 
              disabled={isSending || !instanceId || isWaitingForResponse}
              placeholder={
                isWaitingForResponse ? 'Waiting for Claude...' : 
                isSending ? 'Sending...' : 
                'Continue the conversation...'
              }
            />
          </>
        )}
      </div>
    </div>
  );
}