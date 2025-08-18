'use client';

import { MessagePart } from './MessagePart';
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: string;
  createdAt?: string | Date;
  messageParts?: Array<{
    id?: string;
    partType: string;
    text?: string;
    state?: string;
    toolName?: string;
    toolCallId?: string;
    input?: any;
    output?: any;
    errorText?: string;
    url?: string;
    title?: string;
    filename?: string;
    mediaType?: string;
  }>;
}

interface MessageListProps {
  messages: Message[];
  className?: string;
}

export function MessageList({ messages, className = '' }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`space-y-3 p-3 ${className}`}>
      {messages.map((message) => {
        const hasContent = message.messageParts && message.messageParts.length > 0;
        
        return (
          <div key={message.id} className="space-y-1">
            {/* Message header */}
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                message.role === 'user' ? 'bg-gray-900' : 
                message.role === 'assistant' ? 'bg-green-500' : 
                'bg-gray-400'
              }`} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {message.role}
              </span>
              {message.createdAt && (
                <span className="text-[10px] text-gray-400">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* Message content */}
            <div className="ml-3.5">
              {hasContent ? (
                <div className="space-y-1">
                  {message.messageParts?.map((part, index) => (
                    <MessagePart key={part.id || `${message.id}-part-${index}`} part={part} />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">
                  (no content)
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
}