'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePromptDetails } from '@/hooks/use-prompts';
import { usePromptMutations } from '@/hooks/use-prompt-mutations';
import { usePromptDiff } from '@/hooks/use-prompt-diff';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Save, GitBranch, Clock, Star, ChevronLeft, ChevronRight,
  History, AlertCircle, Check, X, Plus, FileText, Hash,
  GitCommit, Eye, Edit2, ChevronDown, Folder, FolderOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { estimateTokens } from '@/lib/prompts/utils';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

interface PageProps {
  params: Promise<{ promptId: string }>;
}

export default function PromptEditorPage({ params }: PageProps) {
  const { promptId } = use(params);
  const router = useRouter();
  
  const { prompt, versions, latestVersion, isLoading } = usePromptDetails(promptId);
  const { createVersion, updatePrompt, setDefaultPrompt, forkPrompt, deletePrompt } = usePromptMutations();
  
  const [content, setContent] = useState('');
  const [changelog, setChangelog] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['versions']));
  
  // Get current version before using it
  const currentVersion = versions?.find((v: any) => v.id === selectedVersion) || latestVersion;
  
  // Live token counting
  const currentTokens = useMemo(() => {
    return estimateTokens(content);
  }, [content]);
  
  const tokenDiff = useMemo(() => {
    if (!currentVersion) return 0;
    return currentTokens - (currentVersion.tokenCount || 0);
  }, [currentTokens, currentVersion]);
  
  // Initialize content when prompt loads or version changes
  useEffect(() => {
    if (selectedVersion) {
      const version = versions?.find((v: any) => v.id === selectedVersion);
      if (version) {
        setContent(version.content || '');
      }
    } else if (latestVersion) {
      setContent(latestVersion.content || '');
      setSelectedVersion(latestVersion.id);
    }
  }, [latestVersion, selectedVersion, versions]);
  
  // Track changes
  useEffect(() => {
    if (selectedVersion && latestVersion) {
      const currentVersion = versions?.find((v: any) => v.id === selectedVersion);
      if (currentVersion) {
        setHasChanges(content !== currentVersion.content);
      }
    }
  }, [content, selectedVersion, latestVersion, versions]);
  
  const handleSaveVersion = async () => {
    if (!prompt || !content || !changelog) return;
    
    try {
      const result = await createVersion({
        promptId: prompt.id,
        content,
        changelog,
      });
      
      // Switch to the new version
      setSelectedVersion(result.versionId);
      setShowSaveDialog(false);
      setChangelog('');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save version:', error);
    }
  };
  
  const handleVersionSelect = (versionId: string) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }
    setSelectedVersion(versionId);
    const version = versions?.find((v: any) => v.id === versionId);
    if (version) {
      setContent(version.content || '');
      setHasChanges(false);
    }
  };
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          setShowSaveDialog(true);
        }
      }
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setLeftSidebarOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges]);
  
  if (isLoading) {
    return (
      <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }
  
  if (!prompt) {
    return (
      <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400">Prompt not found</p>
          <Button 
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/prompts')}
          >
            Back to Prompts
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-[#1e1e1e] text-gray-300 flex flex-col">
      {/* VSCode-like top bar */}
      <div className="h-9 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center px-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-gray-400 hover:text-gray-200"
            onClick={() => router.push('/prompts')}
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
          
          <Separator orientation="vertical" className="h-4 bg-[#3e3e42]" />
          
          <span className="text-gray-400">{prompt.name}</span>
          {currentVersion && (
            <Badge variant="outline" className="h-5 text-xs border-[#3e3e42] text-gray-400">
              v{currentVersion.version}
            </Badge>
          )}
          {prompt.isDefault && (
            <Badge className="h-5 text-xs bg-green-600/20 text-green-400 border-green-600/30">
              Default
            </Badge>
          )}
          {hasChanges && (
            <div className="flex items-center gap-1 text-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Modified</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {!prompt.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-gray-400 hover:text-gray-200"
              onClick={() => setDefaultPrompt(prompt.id)}
            >
              <Star className="h-3 w-3 mr-1" />
              Set Default
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-gray-400 hover:text-gray-200"
            onClick={() => {
              if (hasChanges) {
                setShowSaveDialog(true);
              }
            }}
            disabled={!hasChanges}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Version Control */}
        <div className={cn(
          "bg-[#252526] border-r border-[#3e3e42] transition-all duration-200",
          leftSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="h-9 border-b border-[#3e3e42] flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase text-gray-400">Explorer</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-200"
                onClick={() => setLeftSidebarOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Version History Section */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {/* Versions Tree */}
                <div className="mb-2">
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('versions')}
                  >
                    {expandedSections.has('versions') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {expandedSections.has('versions') ? (
                      <FolderOpen className="h-3 w-3 text-yellow-400" />
                    ) : (
                      <Folder className="h-3 w-3 text-yellow-400" />
                    )}
                    <span className="font-semibold">VERSION HISTORY</span>
                    <span className="ml-auto text-gray-500">({versions?.length || 0})</span>
                  </button>
                  
                  {expandedSections.has('versions') && (
                    <div className="mt-1 ml-2">
                      {versions?.map((version: any) => (
                        <button
                          key={version.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#2a2d2e] rounded text-left",
                            selectedVersion === version.id && "bg-[#094771]"
                          )}
                          onClick={() => handleVersionSelect(version.id)}
                        >
                          <FileText className="h-3 w-3 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate">v{version.version}</span>
                              {version.isLatest && (
                                <Badge className="h-4 text-[10px] px-1 bg-blue-600/20 text-blue-400 border-blue-600/30">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            {version.changelog && (
                              <div className="text-[10px] text-gray-500 truncate">
                                {version.changelog}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500">
                              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Prompt Info */}
                <div className="mt-4 p-2 bg-[#1e1e1e] rounded text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Version:</span>
                      <span>v{currentVersion?.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tokens:</span>
                      <div className="flex items-center gap-2">
                        <span>{currentTokens}</span>
                        {tokenDiff !== 0 && (
                          <span className={cn(
                            "text-xs",
                            tokenDiff > 0 ? "text-yellow-400" : "text-blue-400"
                          )}>
                            ({tokenDiff > 0 ? '+' : ''}{tokenDiff})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Versions:</span>
                      <span>{versions?.length || 0}</span>
                    </div>
                    {prompt.forkedFrom && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <GitBranch className="h-3 w-3" />
                        <span>Forked</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          {/* Editor Tabs */}
          <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center">
            <div className="flex items-center h-full">
              <div className="h-full px-3 bg-[#1e1e1e] border-r border-[#3e3e42] flex items-center gap-2 text-xs">
                <FileText className="h-3 w-3 text-blue-400" />
                <span>{prompt.name}.md</span>
                {hasChanges && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </div>
          
          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              defaultLanguage="markdown"
              theme="vs-dark"
              value={content}
              onChange={(value) => setContent(value || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                wordWrap: 'on',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>
        
        {/* Toggle Sidebar Button */}
        {!leftSidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="fixed left-2 top-12 h-6 w-6 p-0 bg-[#2d2d30] border border-[#3e3e42] text-gray-400 hover:text-gray-200 z-10"
            onClick={() => setLeftSidebarOpen(true)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3">
        <div className="flex items-center gap-4 flex-1">
          <span>Markdown</span>
          <span>UTF-8</span>
          <span>Ln {content.split('\n').length}, Col 1</span>
        </div>
        <div className="flex items-center gap-4">
          {hasChanges && <span>● Unsaved Changes</span>}
          <span className="flex items-center gap-2">
            <span>{currentTokens} tokens</span>
            {tokenDiff !== 0 && (
              <span className={cn(
                tokenDiff > 0 ? "text-yellow-300" : "text-cyan-300"
              )}>
                ({tokenDiff > 0 ? '+' : ''}{tokenDiff})
              </span>
            )}
          </span>
        </div>
      </div>
      
      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-[#2d2d30] border-[#3e3e42] text-gray-300">
          <DialogHeader>
            <DialogTitle className="text-gray-200">Save New Version</DialogTitle>
            <DialogDescription className="text-gray-400">
              Document what changed in this version
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="changelog" className="text-gray-300">Changelog</Label>
              <textarea
                id="changelog"
                className="flex min-h-[80px] w-full rounded-md border border-[#3e3e42] bg-[#1e1e1e] px-3 py-2 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007acc]"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="What changed in this version?"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSaveDialog(false)}
              className="bg-transparent border-[#3e3e42] text-gray-300 hover:bg-[#3e3e42]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVersion} 
              disabled={!changelog}
              className="bg-[#007acc] hover:bg-[#005a9e] text-white"
            >
              Save Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}