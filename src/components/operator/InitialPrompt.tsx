'use client';

import { useState } from 'react';

interface InitialPromptProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

export function InitialPrompt({ onSubmit, isLoading = false }: InitialPromptProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full p-6">
        <div className="bg-white border border-gray-200 shadow-sm">
          <div className="h-10 bg-white border-b border-gray-200 flex items-center px-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                SW-Ephemeral Operator
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-6">
              Start a new Operator VM session to build your application
            </p>
            
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
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>
              
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
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