'use client';

import { useRouter } from 'next/navigation';
import { id } from '@instantdb/core';
import { db } from '@/lib/instant/client';
import { useState } from 'react';
import * as React from 'react';
import { isTokenExpired, isTokenExpiringSoon } from '@/lib/anthropic';
import Link from 'next/link';
import { PromptSelectorDark } from '@/components/prompts/PromptSelectorDark';
import { usePromptMutations } from '@/hooks/use-prompt-mutations';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal, FileText, RefreshCw, ChevronRight, ChevronDown,
  User, Clock, AlertCircle, CheckCircle, XCircle, Play,
  Settings, GitBranch, Home, Code, Folder, FolderOpen,
  Server, Pause, StopCircle, FileCode, Search, ListTree
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomeV2Page() {
  const router = useRouter();
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [expandTokenSelector, setExpandTokenSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tokens', 'prompt', 'instances', 'tasks']));
  const [activeTab, setActiveTab] = useState<'overview' | 'instances'>('overview');
  
  const { setTaskSystemPrompt } = usePromptMutations();
  
  // Fetch active instances from Morph
  const { data: instances = [], isLoading: instancesLoading, refetch: refetchInstances } = trpc.morph.instances.list.useQuery(
    undefined,
    { 
      refetchInterval: 10000, // Refresh every 10 seconds
      refetchIntervalInBackground: true
    }
  );
  
  const stopInstanceMutation = trpc.morph.instances.stop.useMutation({
    onSuccess: () => refetchInstances()
  });
  
  const pauseInstanceMutation = trpc.morph.instance.pause.useMutation({
    onSuccess: () => refetchInstances()
  });
  
  const resumeInstanceMutation = trpc.morph.instance.resume.useMutation({
    onSuccess: () => refetchInstances()
  });
  
  // Query all users with their tokens
  const { data, isLoading: dataLoading } = db.useQuery({
    userProfiles: {
      oauthTokens: {
        $: { where: { provider: 'anthropic' } }
      }
    },
    tasks: {}
  });
  
  const users = data?.userProfiles || [];
  const tasks = data?.tasks || [];
  const allTokens = users.flatMap(u => 
    (u.oauthTokens || []).map(token => ({
      ...token,
      userEmail: u.$userEmail || 'Unknown'
    }))
  );
  
  // Auto-select first valid token if none selected
  React.useEffect(() => {
    if (!selectedTokenId && allTokens.length > 0) {
      const validToken = allTokens.find(t => !isTokenExpired(t.expiresAt));
      if (validToken) {
        setSelectedTokenId(validToken.id);
      } else if (allTokens.length > 0) {
        setSelectedTokenId(allTokens[0].id);
      }
    }
  }, [allTokens.length]);
  
  const selectedToken = allTokens.find(t => t.id === selectedTokenId);
  const isSelectedTokenExpired = selectedToken ? isTokenExpired(selectedToken.expiresAt) : false;
  const isSelectedTokenExpiringSoon = selectedToken ? isTokenExpiringSoon(selectedToken.expiresAt) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) return;
    
    if (!selectedTokenId) {
      alert('Please select an OAuth token first');
      return;
    }
    
    if (isSelectedTokenExpired) {
      alert('The selected token is expired. Please refresh it first.');
      return;
    }
    
    if (!selectedPromptId || !selectedVersionId) {
      alert('Please select a system prompt for the task');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create a new task with the selected token
      const taskId = id();
      
      await db.transact([
        db.tx.tasks[taskId].update({
          name: prompt.slice(0, 100),
          description: prompt,
          lastMessageAt: new Date(),
          metadata: { selectedTokenId }
        })
      ]);
      
      // Link the selected prompt to the task
      await setTaskSystemPrompt({
        taskId,
        promptId: selectedPromptId,
        versionId: selectedVersionId,
      });
      
      // Navigate to the operator page with the task ID and token
      router.push(`/operator/${taskId}?prompt=${encodeURIComponent(prompt)}&tokenId=${selectedTokenId}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
      setIsLoading(false);
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
  
  return (
    <div className="h-screen bg-[#1e1e1e] text-gray-300 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center px-4">
        <div className="flex items-center gap-4 flex-1">
          <Terminal className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold">Switchboard Operator</h1>
          <Separator orientation="vertical" className="h-6 bg-[#3e3e42]" />
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            Ready
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-400 hover:text-gray-200"
          onClick={() => router.push('/')}
        >
          <Code className="h-4 w-4 mr-2" />
          Classic View
        </Button>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Configuration */}
        <div className="w-64 bg-[#252526] border-r border-[#3e3e42]">
          {/* Tab Bar */}
          <div className="h-9 border-b border-[#3e3e42] flex">
            <button
              className={cn(
                "px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                activeTab === 'overview' 
                  ? "bg-[#1e1e1e] text-gray-200 border-b-2 border-[#007acc]"
                  : "text-gray-500 hover:text-gray-300"
              )}
              onClick={() => setActiveTab('overview')}
            >
              <Home className="h-3.5 w-3.5" />
              Overview
            </button>
            <button
              className={cn(
                "px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                activeTab === 'instances' 
                  ? "bg-[#1e1e1e] text-gray-200 border-b-2 border-[#007acc]"
                  : "text-gray-500 hover:text-gray-300"
              )}
              onClick={() => setActiveTab('instances')}
            >
              <Server className="h-3.5 w-3.5" />
              Instances
            </button>
          </div>
          
          <ScrollArea className="h-full">
            <div className="p-2">
              {activeTab === 'overview' ? (
                <>
                  {/* Claude Account Section */}
                  <div className="mb-1">
                    <button
                      className="w-full flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] hover:bg-[#2a2d2e] rounded"
                      onClick={() => toggleSection('tokens')}
                    >
                      {expandedSections.has('tokens') ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <User className="h-3 w-3 text-blue-400" />
                      <span className="font-medium uppercase">Claude Account</span>
                    </button>
                
                    {expandedSections.has('tokens') && (
                      <div className="mt-1 space-y-1">
                        {dataLoading ? (
                          <div className="px-2 py-1 text-[10px] text-gray-500">Loading...</div>
                        ) : allTokens.length === 0 ? (
                          <div className="px-2 py-1 bg-[#1e1e1e] rounded text-[10px]">
                            <p className="text-yellow-400 mb-1">No tokens found</p>
                            <Link 
                              href="/refresh-token"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Add Token →
                            </Link>
                          </div>
                    ) : (
                      <>
                        {allTokens.map((token) => {
                          const expired = isTokenExpired(token.expiresAt);
                          const expiring = isTokenExpiringSoon(token.expiresAt);
                          
                          return (
                              <button
                                key={token.id}
                                className={cn(
                                  "w-full px-2 py-1.5 rounded text-left transition-all text-[11px]",
                                  selectedTokenId === token.id 
                                    ? "bg-[#094771] border border-[#007acc]" 
                                    : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
                                )}
                                onClick={() => setSelectedTokenId(token.id)}
                              >
                                <div className="flex items-start gap-1">
                                  <div className="mt-0.5">
                                    {expired ? (
                                      <XCircle className="h-2.5 w-2.5 text-red-400" />
                                    ) : expiring ? (
                                      <AlertCircle className="h-2.5 w-2.5 text-yellow-400" />
                                    ) : (
                                      <CheckCircle className="h-2.5 w-2.5 text-green-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">{token.userEmail}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      {expired ? (
                                        <span className="text-red-400">Expired</span>
                                      ) : expiring ? (
                                        <span className="text-yellow-400">Expires soon</span>
                                      ) : (
                                        <span>Valid</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                          );
                        })}
                          <Link 
                            href="/refresh-token"
                            className="block px-2 py-0.5 text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            + Add new token
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              
                {/* System Prompt Section */}
                <div className="mb-1">
                  <button
                    className="w-full flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('prompt')}
                  >
                    {expandedSections.has('prompt') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <FileText className="h-3 w-3 text-yellow-400" />
                    <span className="font-medium uppercase">System Prompt</span>
                    {!selectedPromptId && <span className="ml-auto text-red-400 text-[10px]">Required</span>}
                  </button>
                
                  {expandedSections.has('prompt') && (
                    <div className="mt-1">
                      <PromptSelectorDark
                        onSelect={(promptId, versionId) => {
                          setSelectedPromptId(promptId);
                          setSelectedVersionId(versionId);
                        }}
                        required={true}
                      />
                    </div>
                  )}
                </div>
              
                {/* Tasks Section */}
                <div className="mb-1">
                  <button
                    className="w-full flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('tasks')}
                  >
                    {expandedSections.has('tasks') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <ListTree className="h-3 w-3 text-purple-400" />
                    <span className="font-medium uppercase">Recent Tasks</span>
                    <span className="ml-auto text-gray-500 text-[10px]">({tasks.length})</span>
                  </button>
                
                  {expandedSections.has('tasks') && (
                    <div className="mt-1 space-y-1">
                      {tasks.length > 0 ? (
                        tasks.slice(0, 10).map((task: any) => (
                          <button
                            key={task.id}
                            className="w-full px-2 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded text-left transition-all"
                            onClick={() => {
                              const tokenId = task.metadata?.selectedTokenId || selectedTokenId;
                              if (tokenId) {
                                router.push(`/operator/${task.id}?tokenId=${tokenId}`);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileCode className="h-2.5 w-2.5 text-gray-500" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-gray-300 truncate">
                                  {task.name || 'Untitled Task'}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {task.lastMessageAt ? new Date(task.lastMessageAt).toLocaleDateString() : 'No activity'}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-2 text-[10px] text-gray-500">No tasks yet</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Active Instances Section */}
                <div className="mb-1">
                  <div className="px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-400">
                    Running Instances
                  </div>
                  <div className="mt-1 space-y-1">
                    {instancesLoading ? (
                      <div className="px-2 text-[10px] text-gray-500">Loading...</div>
                    ) : instances.filter(i => i.state === 'running').length > 0 ? (
                      <>
                        {instances.filter((i: any) => i.state === 'running').map((instance: any) => (
                          <div
                            key={instance.id}
                            className="px-2 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[11px] text-gray-300 truncate">
                                  {instance.id.slice(0, 10)}...
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-400"
                                  onClick={() => {
                                    if (confirm('Stop this instance?')) {
                                      stopInstanceMutation.mutate({ instanceId: instance.id });
                                    }
                                  }}
                                  title="Stop"
                                >
                                  <StopCircle className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {instances.filter(i => i.state === 'running').length > 1 && (
                          <div className="px-2 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full h-5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => {
                                const runningInstances = instances.filter((i: any) => i.state === 'running');
                                if (confirm(`Stop all ${runningInstances.length} instances?`)) {
                                  runningInstances.forEach((instance: any) => {
                                    stopInstanceMutation.mutate({ instanceId: instance.id });
                                  });
                                }
                              }}
                            >
                              Stop All Instances
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-2 text-[10px] text-gray-500">No running instances</div>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center">
          <div className="max-w-2xl w-full p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Input */}
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-400 mb-2">
                  PROJECT DESCRIPTION
                </label>
                <div className="relative">
                  <textarea
                    id="prompt"
                    rows={8}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to build..."
                    disabled={isLoading || isSelectedTokenExpired}
                    className="w-full px-4 py-3 bg-[#252526] border border-[#3e3e42] rounded-lg text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#007acc] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                    {prompt.length} characters
                  </div>
                </div>
              </div>
              
              {/* Error Messages */}
              {isSelectedTokenExpired && (
                <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-400">Token Expired</div>
                      <div className="text-xs text-red-400/80 mt-1">
                        This token needs to be refreshed before you can start an operator session.
                      </div>
                      <Link
                        href={`/refresh-token?email=${encodeURIComponent(selectedToken?.userEmail || '')}`}
                        className="inline-block mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                      >
                        Refresh Token Now
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedPromptId && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-400">System Prompt Required</div>
                      <div className="text-xs text-yellow-400/80 mt-1">
                        Please select a system prompt from the configuration panel.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading || isSelectedTokenExpired || !selectedTokenId || !selectedPromptId || !selectedVersionId}
                className={cn(
                  "w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  !prompt.trim() || isSelectedTokenExpired || !selectedTokenId || !selectedPromptId || !selectedVersionId
                    ? "bg-[#3e3e42] text-gray-600 cursor-not-allowed"
                    : isLoading
                    ? "bg-[#005a9e] text-white cursor-wait"
                    : "bg-[#007acc] hover:bg-[#005a9e] text-white cursor-pointer"
                )}
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Operator...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Operator
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3">
        <div className="flex items-center gap-4">
          <span>SW-Ephemeral</span>
          <span>•</span>
          <span>{selectedToken ? selectedToken.userEmail : 'No account selected'}</span>
          {selectedPromptId && (
            <>
              <span>•</span>
              <span>Prompt selected</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}