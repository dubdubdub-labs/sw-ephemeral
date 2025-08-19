'use client';

import { useState, useEffect } from 'react';
import { usePrompts } from '@/hooks/use-prompts';

interface PromptSelectorProps {
  onSelect: (promptId: string, versionId: string) => void;
  required?: boolean;
  className?: string;
}

export function PromptSelector({ onSelect, required = true, className = '' }: PromptSelectorProps) {
  const { prompts, isLoading } = usePrompts({ onlyActive: true });
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  // Auto-select default prompt if available
  useEffect(() => {
    if (!selectedPromptId && prompts.length > 0) {
      const defaultPrompt = prompts.find((p: any) => p.isDefault);
      if (defaultPrompt) {
        const latestVersion = defaultPrompt.versions?.find((v: any) => v.isLatest);
        if (latestVersion) {
          setSelectedPromptId(defaultPrompt.id);
          onSelect(defaultPrompt.id, latestVersion.id);
        }
      }
    }
  }, [prompts]);

  const handlePromptSelect = (prompt: any) => {
    const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
    if (latestVersion) {
      setSelectedPromptId(prompt.id);
      onSelect(prompt.id, latestVersion.id);
      setExpanded(false);
    } else {
      alert('This prompt has no versions available');
    }
  };

  const selectedPrompt = prompts.find((p: any) => p.id === selectedPromptId);

  return (
    <div className={className}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider">
          System Prompt {required && <span className="text-red-500">*</span>}
        </label>
        <button 
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {expanded ? '▼' : '▶'} {expanded ? 'Hide' : 'Change'}
        </button>
      </div>

      {!expanded && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading prompts...</div>
          ) : selectedPrompt ? (
            <div>
              <div className="text-sm font-medium">{selectedPrompt.name}</div>
              <div className="text-xs text-gray-500">
                Version: v{selectedPrompt.versions?.find((v: any) => v.isLatest)?.version || 1}
                {selectedPrompt.isDefault && (
                  <span className="ml-2 text-green-600">(Default)</span>
                )}
              </div>
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-sm text-red-600">
              No prompts available. Please create a prompt first.
            </div>
          ) : (
            <div className="text-sm text-yellow-600">
              Please select a system prompt
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
          {prompts.length === 0 ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">No prompts available.</p>
              <a 
                href="/test-prompts"
                target="_blank"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Create prompts →
              </a>
            </div>
          ) : (
            prompts.map((prompt: any) => {
              const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
              const hasVersion = !!latestVersion;
              
              return (
                <div
                  key={prompt.id}
                  onClick={() => hasVersion && handlePromptSelect(prompt)}
                  className={`
                    p-3 border rounded-lg transition-all
                    ${selectedPromptId === prompt.id 
                      ? 'border-blue-500 bg-blue-50'
                      : hasVersion 
                        ? 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {prompt.name}
                        {prompt.isDefault && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {hasVersion ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Version: v{latestVersion.version} • 
                          ~{latestVersion.tokenCount || 0} tokens
                        </div>
                      ) : (
                        <div className="text-xs text-red-500 mt-1">
                          No versions available
                        </div>
                      )}
                    </div>
                    {selectedPromptId === prompt.id && (
                      <div className="ml-2">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}