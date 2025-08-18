'use client';

import { useState } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSend, 
  disabled = false, 
  placeholder = 'Type a message...' 
}: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200">
      <div className="flex items-center gap-1 p-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 focus:outline-none focus:border-gray-400 disabled:opacity-50 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={`p-1.5 transition-colors ${
            disabled || !message.trim() 
              ? 'opacity-30 cursor-not-allowed' 
              : 'hover:bg-gray-100'
          }`}
          title="Send message"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </form>
  );
}