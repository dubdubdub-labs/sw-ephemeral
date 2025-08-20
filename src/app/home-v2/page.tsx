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
import { usePrompts, usePromptDetails } from '@/hooks/use-prompts';
import { trpc } from '@/lib/trpc/client';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Terminal, FileText, RefreshCw, ChevronRight, ChevronDown, ChevronLeft,
  User, Clock, AlertCircle, CheckCircle, XCircle, Play, Circle,
  Settings, GitBranch, Home, Code, Folder, FolderOpen,
  Server, Pause, StopCircle, FileCode, Search, ListTree,
  Save, Hash, GitCommit, Eye, Edit2, Star, History, Plus,
  GitFork, MoreVertical, Camera, HardDrive, Rocket, Monitor, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateTokens } from '@/lib/prompts/utils';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export default function HomeV2Page() {
  const router = useRouter();
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [expandTokenSelector, setExpandTokenSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tokens', 'prompt', 'instances', 'tasks']));
  const [activeTab, setActiveTab] = useState<'overview' | 'instances' | 'prompts'>('overview');
  const [selectedEditPromptId, setSelectedEditPromptId] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptChangelog, setPromptChangelog] = useState('');
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [selectedPromptVersionId, setSelectedPromptVersionId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [forkPromptName, setForkPromptName] = useState('');
  const [showSaveChangelogDialog, setShowSaveChangelogDialog] = useState(false);
  const [tempPromptChangelog, setTempPromptChangelog] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showVSCode, setShowVSCode] = useState(false);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [snapshotFriendlyName, setSnapshotFriendlyName] = useState('');
  const [snapshotInstanceId, setSnapshotInstanceId] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isBooting, setIsBooting] = useState<string | null>(null);
  const [selectedOperatorSnapshotId, setSelectedOperatorSnapshotId] = useState<string | null>(null);
  const [operatorSnapshotPage, setOperatorSnapshotPage] = useState(0);
  
  const { setTaskSystemPrompt, createVersion, createPrompt, setDefaultPrompt, forkPrompt } = usePromptMutations();
  const { prompts, isLoading: promptsLoading } = usePrompts();
  const { prompt: editingPrompt, versions, latestVersion } = usePromptDetails(selectedEditPromptId || '');
  
  // Fetch active instances from Morph
  const { data: instances = [], isLoading: instancesLoading, refetch: refetchInstances } = trpc.morph.instances.list.useQuery(
    undefined,
    { 
      refetchInterval: 5000, // Refresh every 5 seconds
      refetchIntervalInBackground: true,
      enabled: true,
      staleTime: 0
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
  
  // Fetch snapshots with operator templates
  const { data: snapshots = [], isLoading: snapshotsLoading, refetch: refetchSnapshots } = trpc.morph.snapshots.list.useQuery(
    undefined,
    { 
      refetchInterval: 10000, // Refresh every 10 seconds
      refetchIntervalInBackground: true,
      enabled: activeTab === 'instances' || activeTab === 'overview'
    }
  );
  
  const operatorSnapshots = snapshots.filter(s => 
    s.metadata?.operatorTemplate === true || s.metadata?.operatorTemplate === 'true'
  ).sort((a, b) => {
    // Sort by createdAt date, most recent first
    const dateA = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0;
    const dateB = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  // Pagination for operator snapshots in the overview tab
  const SNAPSHOTS_PER_PAGE = 5;
  const paginatedOperatorSnapshots = operatorSnapshots.slice(
    operatorSnapshotPage * SNAPSHOTS_PER_PAGE,
    (operatorSnapshotPage + 1) * SNAPSHOTS_PER_PAGE
  );
  const totalSnapshotPages = Math.ceil(operatorSnapshots.length / SNAPSHOTS_PER_PAGE);
  
  const snapshotMutation = trpc.morph.instance.snapshot.useMutation({
    onSuccess: async (data) => {
      // Add to InstantDB
      await db.transact([
        db.tx.morphSnapshots[id()].update({
          externalMorphSnapshotId: data.id,
        })
      ]);
      
      // Refresh snapshots list
      refetchSnapshots();
      
      // Reset state
      setIsSnapshotting(false);
      setShowSnapshotDialog(false);
      setSnapshotFriendlyName('');
      setSnapshotInstanceId(null);
      
      // Show success message
      alert(`Snapshot created successfully! ID: ${data.id}`);
    },
    onError: (error) => {
      setIsSnapshotting(false);
      alert(`Failed to create snapshot: ${error.message || 'Unknown error'}`);
    }
  });
  
  const bootSnapshotMutation = trpc.morph.snapshots.start.useMutation({
    onSuccess: (data) => {
      refetchInstances();
      setSelectedInstanceId(data.id);
      setShowVSCode(true);
      setIsBooting(null);
    },
    onError: () => {
      setIsBooting(null);
      alert('Failed to boot snapshot');
    }
  });
  
  const deleteSnapshotMutation = trpc.morph.snapshots.delete.useMutation({
    onSuccess: () => {
      refetchSnapshots();
      alert('Snapshot deleted successfully');
    },
    onError: (error) => {
      alert(`Failed to delete snapshot: ${error.message || 'Unknown error'}`);
    }
  });
  
  const handleSnapshotInstance = (instanceId: string) => {
    setSnapshotInstanceId(instanceId);
    setSnapshotFriendlyName('');
    setShowSnapshotDialog(true);
  };
  
  const handleCreateSnapshot = async () => {
    if (!snapshotInstanceId || !snapshotFriendlyName) return;
    
    setIsSnapshotting(true);
    
    snapshotMutation.mutate({
      instanceId: snapshotInstanceId,
      metadata: {
        operatorTemplate: 'true',  // Must be a string, not boolean
        friendlyName: snapshotFriendlyName,
        createdAt: new Date().toISOString(),
      },
    });
  };
  
  const handleBootSnapshot = (snapshotId: string) => {
    setIsBooting(snapshotId);
    bootSnapshotMutation.mutate({
      snapshotId,
      ttlSeconds: 3600, // 1 hour default
      ttlAction: 'stop',
    });
  };
  
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
  
  // Auto-select most recent operator snapshot if none selected
  React.useEffect(() => {
    if (!selectedOperatorSnapshotId && operatorSnapshots.length > 0) {
      setSelectedOperatorSnapshotId(operatorSnapshots[0].id);
    }
  }, [operatorSnapshots.length]);
  
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
    
    if (!selectedOperatorSnapshotId) {
      alert('Please select an operator snapshot');
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
      
      // Navigate to the operator page with the task ID, token, and snapshot ID
      router.push(`/operator/${taskId}?prompt=${encodeURIComponent(prompt)}&tokenId=${selectedTokenId}&snapshotId=${selectedOperatorSnapshotId}`);
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
        <div className="flex items-center gap-4">
          <Terminal className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold">Switchboard Operator</h1>
          <Separator orientation="vertical" className="h-6 bg-[#3e3e42]" />
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            Ready
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Icon Bar */}
        <div className="flex flex-col border-r border-[#3e3e42] bg-[#2d2d30]">
            <button
              className={cn(
                "w-12 h-12 flex items-center justify-center transition-colors relative",
                activeTab === 'overview' 
                  ? "text-gray-200"
                  : "text-gray-500 hover:text-gray-300"
              )}
              onClick={() => setActiveTab('overview')}
              title="Overview"
            >
              <Home className="h-5 w-5" />
              {activeTab === 'overview' && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#007acc]" />
              )}
            </button>
            <button
              className={cn(
                "w-12 h-12 flex items-center justify-center transition-colors relative",
                activeTab === 'instances' 
                  ? "text-gray-200"
                  : "text-gray-500 hover:text-gray-300"
              )}
              onClick={() => setActiveTab('instances')}
              title="Instances"
            >
              <Server className="h-5 w-5" />
              {activeTab === 'instances' && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#007acc]" />
              )}
            </button>
            <button
              className={cn(
                "w-12 h-12 flex items-center justify-center transition-colors relative",
                activeTab === 'prompts' 
                  ? "text-gray-200"
                  : "text-gray-500 hover:text-gray-300"
              )}
              onClick={() => setActiveTab('prompts')}
              title="Prompts"
            >
              <FileText className="h-5 w-5" />
              {activeTab === 'prompts' && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#007acc]" />
              )}
            </button>
        </div>
        
        {/* Sidebar Panel */}
        <div className="w-64 bg-[#252526] border-r border-[#3e3e42]">
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
                                  "w-full px-2 py-1 rounded text-left transition-all text-[11px]",
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
              
                {/* Operator Snapshot Section */}
                <div className="mb-1">
                  <button
                    className="w-full flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] hover:bg-[#2a2d2e] rounded"
                    onClick={() => toggleSection('operatorSnapshot')}
                  >
                    {expandedSections.has('operatorSnapshot') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <HardDrive className="h-3 w-3 text-green-400" />
                    <span className="font-medium uppercase">Operator Snapshot</span>
                    {!selectedOperatorSnapshotId && <span className="ml-auto text-red-400 text-[10px]">Required</span>}
                  </button>
                
                  {expandedSections.has('operatorSnapshot') && (
                    <div className="mt-1 space-y-1">
                      {snapshotsLoading ? (
                        <div className="px-2 py-1 text-[10px] text-gray-500">Loading snapshots...</div>
                      ) : operatorSnapshots.length === 0 ? (
                        <div className="px-2 py-1 bg-[#1e1e1e] rounded text-[10px]">
                          <p className="text-yellow-400 mb-1">No operator snapshots found</p>
                          <p className="text-gray-500">Create a snapshot from the Instances tab</p>
                        </div>
                      ) : (
                        <>
                          {paginatedOperatorSnapshots.map((snapshot: any) => (
                            <button
                              key={snapshot.id}
                              className={cn(
                                "w-full px-2 py-1 rounded text-left transition-all text-[11px]",
                                selectedOperatorSnapshotId === snapshot.id 
                                  ? "bg-[#094771] border border-[#007acc]" 
                                  : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
                              )}
                              onClick={() => setSelectedOperatorSnapshotId(snapshot.id)}
                            >
                              <div className="flex items-start gap-1">
                                <div className="mt-0.5">
                                  {selectedOperatorSnapshotId === snapshot.id ? (
                                    <CheckCircle className="h-2.5 w-2.5 text-green-400" />
                                  ) : (
                                    <Circle className="h-2.5 w-2.5 text-gray-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">
                                    {snapshot.metadata.friendlyName || 'Unnamed Snapshot'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                    <span className="truncate" title={snapshot.id}>
                                      {snapshot.id}
                                    </span>
                                    {snapshot.metadata.createdAt && (
                                      <>
                                        <span>•</span>
                                        <span>{new Date(snapshot.metadata.createdAt).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                          {totalSnapshotPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-0.5">
                              <button
                                className="p-0.5 hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                onClick={() => setOperatorSnapshotPage(Math.max(0, operatorSnapshotPage - 1))}
                                disabled={operatorSnapshotPage === 0}
                                title="Previous page"
                              >
                                <ChevronLeft className="h-3 w-3 text-gray-400" />
                              </button>
                              <span className="text-[10px] text-gray-500">
                                Page {operatorSnapshotPage + 1} of {totalSnapshotPages}
                              </span>
                              <button
                                className="p-0.5 hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                onClick={() => setOperatorSnapshotPage(Math.min(totalSnapshotPages - 1, operatorSnapshotPage + 1))}
                                disabled={operatorSnapshotPage === totalSnapshotPages - 1}
                                title="Next page"
                              >
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              </button>
                            </div>
                          )}
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
                            className="w-full px-2 py-1 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded text-left transition-all"
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
            ) : activeTab === 'instances' ? (
              <>
                {/* Available Snapshots Section */}
                <div className="mb-2">
                  <div className="px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-400 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>Available Snapshots</span>
                      <span className="text-[10px] text-gray-500">({operatorSnapshots.length})</span>
                    </div>
                    <button
                      className="p-0.5 hover:bg-[#2a2d2e] rounded transition-colors"
                      onClick={() => {
                        refetchSnapshots();
                      }}
                      title="Refresh snapshots"
                    >
                      <RefreshCw className={cn(
                        "h-3 w-3 text-gray-400 hover:text-gray-200",
                        snapshotsLoading && "animate-spin"
                      )} />
                    </button>
                  </div>
                  <div className="mt-1 space-y-1">
                    {snapshotsLoading ? (
                      <div className="px-2 text-[10px] text-gray-500">Loading snapshots...</div>
                    ) : operatorSnapshots.length > 0 ? (
                      operatorSnapshots.map((snapshot: any) => (
                        <div
                          key={snapshot.id}
                          className="px-2 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-gray-300 font-medium">
                                {snapshot.metadata.friendlyName || 'Unnamed Snapshot'}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <span className="truncate" title={snapshot.id}>
                                  {snapshot.id}
                                </span>
                                {snapshot.metadata.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(snapshot.metadata.createdAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-green-400"
                                onClick={() => handleBootSnapshot(snapshot.id)}
                                disabled={isBooting === snapshot.id}
                                title="Boot snapshot"
                              >
                                {isBooting === snapshot.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                                onClick={() => {
                                  if (confirm(`Delete snapshot "${snapshot.metadata.friendlyName || snapshot.id}"?`)) {
                                    deleteSnapshotMutation.mutate({ snapshotId: snapshot.id });
                                  }
                                }}
                                title="Delete snapshot"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 text-[10px] text-gray-500">No snapshots available</div>
                    )}
                  </div>
                </div>
                
                <Separator className="my-2 bg-[#3e3e42]" />
                
                {/* Running Instances Section */}
                <div className="mb-1">
                  <div className="px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-400 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      <span>Running Instances</span>
                      <span className="text-[10px] text-gray-500">({instances.filter(i => i.state === 'ready').length})</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {instances.filter(i => i.state === 'ready').length > 0 && (
                        <button
                          className="p-0.5 hover:bg-[#2a2d2e] rounded transition-colors"
                          onClick={() => {
                            const readyInstances = instances.filter((i: any) => i.state === 'ready');
                            if (confirm(`Stop all ${readyInstances.length} instances?`)) {
                              readyInstances.forEach((instance: any) => {
                                stopInstanceMutation.mutate({ instanceId: instance.id });
                              });
                            }
                          }}
                          title="Stop All"
                        >
                          <StopCircle className="h-3 w-3 text-red-400 hover:text-red-300" />
                        </button>
                      )}
                      <button
                        className="p-0.5 hover:bg-[#2a2d2e] rounded transition-colors"
                        onClick={() => {
                          refetchInstances();
                          setLastRefreshed(new Date());
                        }}
                        title={`Refresh (Last: ${lastRefreshed.toLocaleTimeString()})`}
                      >
                        <RefreshCw className={cn(
                          "h-3 w-3 text-gray-400 hover:text-gray-200",
                          instancesLoading && "animate-spin"
                        )} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 space-y-1">
                    {instancesLoading ? (
                      <div className="px-2 text-[10px] text-gray-500">Loading...</div>
                    ) : instances.filter((i: any) => i.state === 'ready').length > 0 ? (
                      <>
                        {instances.filter((i: any) => i.state === 'ready').map((instance: any) => (
                          <div
                            key={instance.id}
                            className={cn(
                              "w-full px-2 py-1.5 rounded transition-all cursor-pointer group",
                              selectedInstanceId === instance.id
                                ? "bg-[#094771] border border-[#007acc]"
                                : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
                            )}
                            onClick={() => {
                              setSelectedInstanceId(instance.id);
                              setShowVSCode(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[11px] text-gray-300 truncate" title={instance.id}>
                                  {instance.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-blue-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSnapshotInstance(instance.id);
                                  }}
                                  title="Snapshot"
                                >
                                  <Camera className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                        {instances.filter(i => i.state === 'ready').length > 1 && (
                          <div className="px-2 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full h-5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => {
                                const readyInstances = instances.filter((i: any) => i.state === 'ready');
                                if (confirm(`Stop all ${readyInstances.length} instances?`)) {
                                  readyInstances.forEach((instance: any) => {
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
                      <div className="px-2 text-[10px] text-gray-500">No instances found</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Prompts List */}
                <div className="mb-1">
                  <div className="px-1.5 py-0.5 text-[11px] font-medium uppercase text-gray-400 flex items-center justify-between">
                    <span>System Prompts</span>
                    <button
                      className="p-0.5 hover:bg-[#2a2d2e] rounded"
                      onClick={() => {
                        setNewPromptName('');
                        setShowNewPromptDialog(true);
                      }}
                      title="New Prompt"
                    >
                      <Plus className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                  <div className="mt-1 space-y-1">
                    {promptsLoading ? (
                      <div className="px-2 text-[10px] text-gray-500">Loading...</div>
                    ) : prompts.length > 0 ? (
                      prompts.map((prompt: any) => {
                        const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
                        return (
                          <button
                            key={prompt.id}
                            className={cn(
                              "w-full px-2 py-1.5 rounded text-left transition-all",
                              selectedEditPromptId === prompt.id
                                ? "bg-[#094771] border border-[#007acc]"
                                : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
                            )}
                            onClick={() => {
                              setSelectedEditPromptId(prompt.id);
                              const promptLatestVersion = prompt.versions?.find((v: any) => v.isLatest);
                              if (promptLatestVersion) {
                                setPromptContent(promptLatestVersion.content || '');
                                setSelectedPromptVersionId(promptLatestVersion.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-2.5 w-2.5 text-gray-500" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-gray-300 truncate">
                                  {prompt.name}
                                </div>
                                {latestVersion && (
                                  <div className="text-[10px] text-gray-500">
                                    v{latestVersion.version} • {latestVersion.tokenCount || 0} tokens
                                  </div>
                                )}
                              </div>
                              {prompt.isDefault && (
                                <Star className="h-2.5 w-2.5 text-yellow-500" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-2 text-[10px] text-gray-500">No prompts yet</div>
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
          {activeTab === 'instances' && showVSCode && selectedInstanceId ? (
            // VSCode viewer for instances - show inline
            <div className="w-full h-full bg-white">
              {/* Header */}
              <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    VSCode - {selectedInstanceId}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Copy VSCode URL */}
                  <button
                    onClick={() => {
                      const vmId = selectedInstanceId.replace('morphvm_', '').replace(/_/g, '-');
                      const vscodeUrl = `https://vscode-morphvm-${vmId}.http.cloud.morph.so`;
                      navigator.clipboard.writeText(vscodeUrl);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Copy VSCode URL"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  
                  {/* Open in new tab */}
                  <button
                    onClick={() => {
                      const vmId = selectedInstanceId.replace('morphvm_', '').replace(/_/g, '-');
                      const vscodeUrl = `https://vscode-morphvm-${vmId}.http.cloud.morph.so`;
                      window.open(vscodeUrl, '_blank');
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Open in new tab"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  
                  {/* Close */}
                  <button
                    onClick={() => {
                      setShowVSCode(false);
                      setSelectedInstanceId(null);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Close"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* VSCode iframe */}
              <iframe
                src={`https://vscode-morphvm-${selectedInstanceId.replace('morphvm_', '').replace(/_/g, '-')}.http.cloud.morph.so`}
                className="w-full h-[calc(100%-40px)] border-0"
                title="VSCode Editor"
              />
            </div>
          ) : activeTab === 'instances' ? (
            // Instances tab with no selection
            <div className="max-w-2xl w-full p-8 text-center">
              <Server className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-400 mb-2">Manage Instances & Snapshots</h2>
              <p className="text-sm text-gray-500 mb-4">
                Boot snapshots into running instances or click on running instances to open VSCode
              </p>
              <div className="text-xs text-gray-600">
                • Click on a snapshot to boot it<br/>
                • Click on a running instance to open VSCode<br/>
                • Use the camera icon to snapshot any running instance
              </div>
            </div>
          ) : activeTab === 'prompts' && selectedEditPromptId ? (
            // Prompt Editor View
            <div className="w-full h-full flex">
              {/* Main Editor Area */}
              <div className="flex-1 flex flex-col">
                {/* Editor Header */}
                <div className="h-12 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-medium text-gray-200">
                    {editingPrompt?.name || 'Loading...'}
                  </h2>
                  {latestVersion && (
                    <Badge className="bg-[#007acc]/20 text-[#007acc] border-[#007acc]/30 text-xs">
                      v{latestVersion.version}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400">
                    {estimateTokens(promptContent)} tokens
                    {latestVersion && promptContent !== latestVersion.content && (
                      <span className="ml-2 text-yellow-400">
                        ({estimateTokens(promptContent) - (latestVersion.tokenCount || 0) > 0 ? '+' : ''}
                        {estimateTokens(promptContent) - (latestVersion.tokenCount || 0)})
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (selectedEditPromptId) {
                        setForkPromptName('');
                        setShowForkDialog(true);
                      }
                    }}
                    title="Fork Prompt"
                  >
                    <GitFork className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-7 text-xs",
                      editingPrompt?.isDefault && "text-yellow-400"
                    )}
                    onClick={async () => {
                      if (selectedEditPromptId) {
                        await setDefaultPrompt(selectedEditPromptId);
                      }
                    }}
                    title="Set as Default"
                  >
                    <Star className={cn(
                      "h-3.5 w-3.5",
                      editingPrompt?.isDefault && "fill-current"
                    )} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={!promptContent || promptContent === latestVersion?.content}
                    onClick={() => {
                      if (selectedEditPromptId && promptContent && promptContent !== latestVersion?.content) {
                        setTempPromptChangelog('');
                        setShowSaveChangelogDialog(true);
                      }
                    }}
                    title="Save Version"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save Version
                  </Button>
                </div>
              </div>
              
              {/* Monaco Editor */}
              <div className="flex-1">
                <MonacoEditor
                  value={promptContent}
                  onChange={(value) => {
                    setPromptContent(value || '');
                    setHasPromptChanges(value !== latestVersion?.content);
                  }}
                  language="markdown"
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 }
                  }}
                />
              </div>
              </div>
              
              {/* Right Sidebar - Version History */}
              <div className="w-64 bg-[#252526] border-l border-[#3e3e42] flex flex-col">
                <div className="h-12 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center px-3">
                  <History className="h-3.5 w-3.5 text-gray-400 mr-2" />
                  <span className="text-xs font-medium text-gray-400">Version History</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {versions && versions.length > 0 ? (
                      versions.map((version: any) => (
                        <button
                          key={version.id}
                          className={cn(
                            "w-full px-2 py-2 rounded text-left transition-all",
                            latestVersion?.id === version.id
                              ? "bg-[#094771] border border-[#007acc]"
                              : "bg-[#1e1e1e] hover:bg-[#2a2d2e] border border-transparent"
                          )}
                          onClick={() => {
                            setSelectedPromptVersionId(version.id);
                            setPromptContent(version.content || '');
                            setHasPromptChanges(false);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <GitCommit className="h-3 w-3 text-gray-500" />
                              <span className="text-xs font-medium text-gray-300">
                                v{version.version}
                              </span>
                              {version.isLatest && (
                                <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px] px-1 py-0">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {version.tokenCount || 0} tokens
                            </span>
                          </div>
                          {version.changelog && (
                            <p className="text-[10px] text-gray-400 mb-1">
                              {version.changelog}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500">
                            {new Date(version.createdAt).toLocaleDateString()} • {new Date(version.createdAt).toLocaleTimeString()}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-4">
                        No versions yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : activeTab === 'prompts' ? (
            // Prompts tab with no selection
            <div className="max-w-2xl w-full p-8 text-center">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-400 mb-2">Select a Prompt to Edit</h2>
              <p className="text-sm text-gray-500">
                Choose a prompt from the sidebar to view and edit its content
              </p>
            </div>
          ) : (
            // Original form view for Overview/Instances tabs
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
                    placeholder="What are you working on today?"
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
              
              {(!selectedPromptId || !selectedOperatorSnapshotId) && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-400">Configuration Required</div>
                      <div className="text-xs text-yellow-400/80 mt-1">
                        {!selectedOperatorSnapshotId && <div>• Please select an operator snapshot</div>}
                        {!selectedPromptId && <div>• Please select a system prompt</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading || isSelectedTokenExpired || !selectedTokenId || !selectedPromptId || !selectedVersionId || !selectedOperatorSnapshotId}
                className={cn(
                  "w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  !prompt.trim() || isSelectedTokenExpired || !selectedTokenId || !selectedPromptId || !selectedVersionId || !selectedOperatorSnapshotId
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
          )}
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
      
      {/* New Prompt Dialog */}
      <Dialog open={showNewPromptDialog} onOpenChange={setShowNewPromptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Enter a name for your new system prompt
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prompt-name" className="text-right">
                Name
              </Label>
              <Input
                id="prompt-name"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                className="col-span-3"
                placeholder="My System Prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (newPromptName) {
                  const content = '# System Prompt\n\nEnter your system prompt here...';
                  const result = await createPrompt({ name: newPromptName, content });
                  if (result?.promptId) {
                    setSelectedEditPromptId(result.promptId);
                    setPromptContent(content);
                    setShowNewPromptDialog(false);
                  }
                }
              }}
              disabled={!newPromptName}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Fork Prompt Dialog */}
      <Dialog open={showForkDialog} onOpenChange={setShowForkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Prompt</DialogTitle>
            <DialogDescription>
              Enter a name for your forked prompt
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fork-name" className="text-right">
                Name
              </Label>
              <Input
                id="fork-name"
                value={forkPromptName}
                onChange={(e) => setForkPromptName(e.target.value)}
                className="col-span-3"
                placeholder="My Forked Prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (forkPromptName && selectedEditPromptId && latestVersion) {
                  const result = await forkPrompt({ 
                    originalPromptId: selectedEditPromptId, 
                    originalVersionId: latestVersion.id,
                    newName: forkPromptName,
                    forkReason: 'Forked from UI'
                  });
                  if (result?.promptId) {
                    setSelectedEditPromptId(result.promptId);
                    setShowForkDialog(false);
                  }
                }
              }}
              disabled={!forkPromptName || !latestVersion}
            >
              Fork
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save Changelog Dialog */}
      <Dialog open={showSaveChangelogDialog} onOpenChange={setShowSaveChangelogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Prompt Version</DialogTitle>
            <DialogDescription>
              Describe what changes you've made to this prompt. This helps track the evolution of your system prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="changelog" className="text-right">
                Changelog
              </Label>
              <Input
                id="changelog"
                value={tempPromptChangelog}
                onChange={(e) => setTempPromptChangelog(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Added instructions for handling edge cases"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveChangelogDialog(false);
                setTempPromptChangelog('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (tempPromptChangelog && selectedEditPromptId && promptContent) {
                  await createVersion({
                    promptId: selectedEditPromptId,
                    content: promptContent,
                    changelog: tempPromptChangelog
                  });
                  setTempPromptChangelog('');
                  setPromptChangelog('');
                  setHasPromptChanges(false);
                  setShowSaveChangelogDialog(false);
                }
              }}
              disabled={!tempPromptChangelog}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Snapshot Dialog */}
      <Dialog open={showSnapshotDialog} onOpenChange={setShowSnapshotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Enter a friendly name for this snapshot. It will be saved as an operator template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="snapshot-name" className="text-right">
                Name
              </Label>
              <Input
                id="snapshot-name"
                value={snapshotFriendlyName}
                onChange={(e) => setSnapshotFriendlyName(e.target.value)}
                className="col-span-3"
                placeholder="My Operator Template"
                disabled={isSnapshotting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSnapshotDialog(false);
                setSnapshotFriendlyName('');
                setSnapshotInstanceId(null);
              }}
              disabled={isSnapshotting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSnapshot}
              disabled={!snapshotFriendlyName || isSnapshotting}
            >
              {isSnapshotting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Create Snapshot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}