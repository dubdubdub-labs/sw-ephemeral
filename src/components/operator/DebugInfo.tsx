'use client';

interface DebugInfoProps {
  taskId: string;
  instanceId?: string;
  debug?: {
    totalIterations: number;
    currentIterationSessions: number;
    totalMessages: number;
  };
}

export function DebugInfo({ taskId, instanceId, debug }: DebugInfoProps) {
  if (!debug) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono opacity-90">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Debug Info</div>
      <div className="space-y-1">
        <div>Task: {taskId.slice(-8)}</div>
        <div>Instance: {instanceId?.slice(-8) || 'none'}</div>
        <div>Iterations: {debug.totalIterations}</div>
        <div>Sessions: {debug.currentIterationSessions}</div>
        <div>Messages: {debug.totalMessages}</div>
      </div>
    </div>
  );
}