'use client';

import { useState, useEffect } from 'react';
import { usePrompts } from '@/hooks/use-prompts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, Star, ChevronDown, Plus, GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PromptSelectorDarkProps {
  onSelect: (promptId: string, versionId: string) => void;
  required?: boolean;
  className?: string;
}

export function PromptSelectorDark({ onSelect, required = true, className = '' }: PromptSelectorDarkProps) {
  const { prompts, isLoading } = usePrompts({ onlyActive: true });
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  
  // Get top 5 most recent prompts
  const topPrompts = prompts
    .sort((a: any, b: any) => {
      const aDate = a.versions?.[0]?.createdAt || a.createdAt;
      const bDate = b.versions?.[0]?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 5);
  
  const displayPrompts = showAll ? prompts : topPrompts;
  
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
  }, [prompts, selectedPromptId, onSelect]);
  
  const handlePromptSelect = (prompt: any) => {
    const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
    if (latestVersion) {
      setSelectedPromptId(prompt.id);
      onSelect(prompt.id, latestVersion.id);
    }
  };
  
  const selectedPrompt = prompts.find((p: any) => p.id === selectedPromptId);
  
  if (isLoading) {
    return (
      <div className="text-[10px] text-gray-500 px-2 py-1">Loading prompts...</div>
    );
  }
  
  if (prompts.length === 0) {
    return (
      <div className="px-2 py-1 bg-[#1e1e1e] rounded text-[10px]">
        <p className="text-yellow-400 mb-1">No prompts available</p>
        <Link 
          href="/prompts"
          className="text-blue-400 hover:text-blue-300"
        >
          Create a prompt →
        </Link>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-1", className)}>
      {displayPrompts.map((prompt: any) => {
        const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
        const isSelected = selectedPromptId === prompt.id;
        
        return (
          <button
            key={prompt.id}
            onClick={() => handlePromptSelect(prompt)}
            className={cn(
              "w-full px-2 py-1 rounded text-left transition-all text-[11px]",
              isSelected 
                ? "bg-[#094771] border border-[#007acc]" 
                : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
            )}
          >
            <div className="flex items-start gap-1">
              <div className="mt-0.5">
                {isSelected ? (
                  <FileText className="h-2.5 w-2.5 text-blue-400" />
                ) : (
                  <FileText className="h-2.5 w-2.5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate text-gray-300">{prompt.name}</span>
                  {prompt.isDefault && (
                    <Star className="h-2.5 w-2.5 text-yellow-500" />
                  )}
                  {prompt.forkedFrom && (
                    <GitBranch className="h-2.5 w-2.5 text-gray-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  <span>v{latestVersion?.version || 1}</span>
                  <span>{latestVersion?.tokenCount || 0} tokens</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
      
      {prompts.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full px-2 py-0.5 text-[10px] text-blue-400 hover:text-blue-300 text-left flex items-center gap-1"
        >
          <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", showAll && "rotate-180")} />
          {showAll ? "Show less" : `Show ${prompts.length - 5} more`}
        </button>
      )}
      
    </div>
  );
}