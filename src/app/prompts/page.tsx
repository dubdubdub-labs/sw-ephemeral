'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePrompts } from '@/hooks/use-prompts';
import { usePromptMutations } from '@/hooks/use-prompt-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Plus, GitBranch, Clock, Star, Edit, Filter, GitFork,
  FileText, ChevronRight, ChevronDown, Folder, FolderOpen,
  File, History, Hash, Eye, Code, Terminal, Settings, Home
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PromptsPage() {
  const router = useRouter();
  const { prompts, isLoading } = usePrompts();
  const { createPrompt, setDefaultPrompt, forkPrompt } = usePromptMutations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all', 'recent']));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Process prompts
  const processedPrompts = useMemo(() => {
    let filtered = prompts;
    
    if (searchQuery) {
      filtered = filtered.filter((p: any) => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [prompts, searchQuery]);
  
  // Group prompts
  const promptGroups = useMemo(() => {
    const groups = {
      recent: [] as any[],
      default: [] as any[],
      forked: [] as any[],
      all: [] as any[],
    };
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    processedPrompts.forEach((prompt: any) => {
      groups.all.push(prompt);
      
      if (prompt.isDefault) {
        groups.default.push(prompt);
      }
      
      if (prompt.forkedFrom) {
        groups.forked.push(prompt);
      }
      
      const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
      if (latestVersion && new Date(latestVersion.createdAt) > dayAgo) {
        groups.recent.push(prompt);
      }
    });
    
    return groups;
  }, [processedPrompts]);
  
  const selectedPrompt = prompts.find((p: any) => p.id === selectedPromptId);
  
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
  
  const handleCreatePrompt = async () => {
    if (!newPromptName || !newPromptContent) return;
    
    try {
      const result = await createPrompt({
        name: newPromptName,
        content: newPromptContent,
        tags: [],
      });
      
      setShowCreateDialog(false);
      setNewPromptName('');
      setNewPromptContent('');
      
      router.push(`/prompts/${result.promptId}`);
    } catch (error) {
      console.error('Failed to create prompt:', error);
    }
  };
  
  const handleFork = async (prompt: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
    if (latestVersion) {
      try {
        const result = await forkPrompt({
          originalPromptId: prompt.id,
          originalVersionId: latestVersion.id,
          newName: `${prompt.name} (Fork)`,
          forkReason: `Forked from "${prompt.name}"`,
        });
        router.push(`/prompts/${result.promptId}`);
      } catch (error) {
        console.error('Failed to fork:', error);
      }
    }
  };
  
  const PromptListItem = ({ prompt }: { prompt: any }) => {
    const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
    const isSelected = selectedPromptId === prompt.id;
    const isHovered = hoveredPromptId === prompt.id;
    
    return (
      <div
        className={cn(
          "group px-3 py-2 cursor-pointer rounded transition-all",
          isSelected && "bg-[#094771]",
          !isSelected && "hover:bg-[#2a2d2e]",
          isHovered && "ring-1 ring-[#007acc]"
        )}
        onClick={() => {
          setSelectedPromptId(prompt.id);
          router.push(`/prompts/${prompt.id}`);
        }}
        onMouseEnter={() => setHoveredPromptId(prompt.id)}
        onMouseLeave={() => setHoveredPromptId(null)}
      >
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm truncate">{prompt.name}</span>
              {prompt.isDefault && (
                <Badge className="h-4 text-[10px] px-1 bg-green-600/20 text-green-400 border-green-600/30">
                  Default
                </Badge>
              )}
              {prompt.forkedFrom && (
                <GitBranch className="h-3 w-3 text-gray-500" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>v{latestVersion?.version || 1}</span>
              <span>{latestVersion?.tokenCount || 0} tokens</span>
              <span>{formatDistanceToNow(new Date(latestVersion?.createdAt || prompt.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              onClick={(e) => handleFork(prompt, e)}
            >
              <GitFork className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/prompts/${prompt.id}`);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const PromptGridItem = ({ prompt }: { prompt: any }) => {
    const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
    const isHovered = hoveredPromptId === prompt.id;
    
    return (
      <div
        className={cn(
          "group bg-[#252526] border border-[#3e3e42] rounded-lg p-4 cursor-pointer transition-all hover:border-[#007acc]",
          isHovered && "border-[#007acc] shadow-lg"
        )}
        onClick={() => router.push(`/prompts/${prompt.id}`)}
        onMouseEnter={() => setHoveredPromptId(prompt.id)}
        onMouseLeave={() => setHoveredPromptId(null)}
      >
        {/* Badges */}
        <div className="flex items-center justify-between mb-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <div className="flex items-center gap-2">
            {prompt.isDefault && (
              <Badge className="h-5 text-xs bg-green-600/20 text-green-400 border-green-600/30">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
            {prompt.forkedFrom && (
              <Badge className="h-5 text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
                <GitBranch className="h-3 w-3 mr-1" />
                Forked
              </Badge>
            )}
          </div>
        </div>
        
        {/* Content */}
        <h3 className="font-medium text-gray-200 mb-2 line-clamp-1">{prompt.name}</h3>
        
        {latestVersion?.content && (
          <p className="text-xs text-gray-500 line-clamp-3 mb-3 whitespace-pre-wrap">
            {latestVersion.content}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              v{latestVersion?.version || 1}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {latestVersion?.tokenCount || 0}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              onClick={(e) => handleFork(prompt, e)}
              title="Fork"
            >
              <GitFork className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/prompts/${prompt.id}`);
              }}
              title="Edit"
            >
              <Edit className="h-3 w-3" />
            </Button>
            {!prompt.isDefault && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                onClick={async (e) => {
                  e.stopPropagation();
                  await setDefaultPrompt(prompt.id);
                }}
                title="Set as default"
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-screen bg-[#1e1e1e] text-gray-300 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center px-4">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-gray-400 hover:text-gray-200"
            onClick={() => router.push('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Separator orientation="vertical" className="h-6 bg-[#3e3e42]" />
          <h1 className="text-lg font-semibold">Prompt Library</h1>
          <Separator orientation="vertical" className="h-6 bg-[#3e3e42]" />
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 bg-[#3c3c3c] border-[#3e3e42] text-gray-300 placeholder:text-gray-500 focus:ring-1 focus:ring-[#007acc]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#3c3c3c] border border-[#3e3e42] rounded">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 rounded-none rounded-l",
                viewMode === 'list' && "bg-[#094771]"
              )}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 rounded-none rounded-r",
                viewMode === 'grid' && "bg-[#094771]"
              )}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <Button
              size="sm"
              className="h-8 bg-[#007acc] hover:bg-[#005a9e] text-white"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Button>
            <DialogContent className="bg-[#2d2d30] border-[#3e3e42] text-gray-300">
              <DialogHeader>
                <DialogTitle className="text-gray-200">Create New Prompt</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Start with a new prompt template
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-gray-300">Name</Label>
                  <Input
                    id="name"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g., Software Engineer Assistant"
                    className="bg-[#1e1e1e] border-[#3e3e42] text-gray-300 placeholder:text-gray-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content" className="text-gray-300">Initial Content</Label>
                  <textarea
                    id="content"
                    className="flex min-h-[120px] w-full rounded-md border border-[#3e3e42] bg-[#1e1e1e] px-3 py-2 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007acc]"
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    placeholder="You are an AI assistant..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="bg-transparent border-[#3e3e42] text-gray-300 hover:bg-[#3e3e42]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePrompt} 
                  disabled={!newPromptName || !newPromptContent}
                  className="bg-[#007acc] hover:bg-[#005a9e] text-white"
                >
                  Create Prompt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer Style */}
        <div className="w-64 bg-[#252526] border-r border-[#3e3e42]">
          <div className="h-9 border-b border-[#3e3e42] flex items-center px-3">
            <span className="text-xs font-semibold uppercase text-gray-400">Explorer</span>
          </div>
          
          <ScrollArea className="h-full">
            <div className="p-2">
              {/* Recent */}
              {promptGroups.recent.length > 0 && (
                <div className="mb-2">
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('recent')}
                  >
                    {expandedSections.has('recent') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <Clock className="h-3 w-3 text-yellow-400" />
                    <span className="font-semibold">RECENT</span>
                    <span className="ml-auto text-gray-500">({promptGroups.recent.length})</span>
                  </button>
                  {expandedSections.has('recent') && (
                    <div className="mt-1">
                      {promptGroups.recent.map((prompt: any) => (
                        <PromptListItem key={prompt.id} prompt={prompt} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Default */}
              {promptGroups.default.length > 0 && (
                <div className="mb-2">
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('default')}
                  >
                    {expandedSections.has('default') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <Star className="h-3 w-3 text-green-400" />
                    <span className="font-semibold">DEFAULT</span>
                    <span className="ml-auto text-gray-500">({promptGroups.default.length})</span>
                  </button>
                  {expandedSections.has('default') && (
                    <div className="mt-1">
                      {promptGroups.default.map((prompt: any) => (
                        <PromptListItem key={prompt.id} prompt={prompt} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Forked */}
              {promptGroups.forked.length > 0 && (
                <div className="mb-2">
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('forked')}
                  >
                    {expandedSections.has('forked') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <GitBranch className="h-3 w-3 text-blue-400" />
                    <span className="font-semibold">FORKED</span>
                    <span className="ml-auto text-gray-500">({promptGroups.forked.length})</span>
                  </button>
                  {expandedSections.has('forked') && (
                    <div className="mt-1">
                      {promptGroups.forked.map((prompt: any) => (
                        <PromptListItem key={prompt.id} prompt={prompt} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* All Prompts */}
              <div className="mb-2">
                <button
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#2a2d2e] rounded"
                  onClick={() => toggleSection('all')}
                >
                  {expandedSections.has('all') ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {expandedSections.has('all') ? (
                    <FolderOpen className="h-3 w-3 text-yellow-400" />
                  ) : (
                    <Folder className="h-3 w-3 text-yellow-400" />
                  )}
                  <span className="font-semibold">ALL PROMPTS</span>
                  <span className="ml-auto text-gray-500">({promptGroups.all.length})</span>
                </button>
                {expandedSections.has('all') && (
                  <div className="mt-1">
                    {promptGroups.all.map((prompt: any) => (
                      <PromptListItem key={prompt.id} prompt={prompt} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-[#1e1e1e] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading prompts...</div>
            </div>
          ) : processedPrompts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  {searchQuery ? "No prompts found matching your search" : "No prompts yet"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-[#007acc] hover:bg-[#005a9e] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Prompt
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedPrompts.map((prompt: any) => (
                  <PromptGridItem key={prompt.id} prompt={prompt} />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-2">
                {processedPrompts.map((prompt: any) => (
                  <div
                    key={prompt.id}
                    className="bg-[#252526] border border-[#3e3e42] rounded-lg hover:border-[#007acc] transition-all"
                  >
                    <PromptListItem prompt={prompt} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3">
        <div className="flex items-center gap-4">
          <span>{processedPrompts.length} prompts</span>
          {searchQuery && <span>Filtered by: "{searchQuery}"</span>}
        </div>
      </div>
    </div>
  );
}