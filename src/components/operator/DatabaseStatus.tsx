'use client';

import { useEffect, useState } from 'react';
import { HardDrive, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { db } from '@/lib/instant/client';
import { cn } from '@/lib/utils';

interface DatabaseStatusProps {
  taskId: string;
  className?: string;
}

export function DatabaseStatus({ taskId, className }: DatabaseStatusProps) {
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Query for the task's database (will auto-sync when created)
  const { data, isLoading } = db.useQuery({
    tasks: {
      $: { where: { id: taskId } },
      mainDatabase: {},
    }
  });

  if (!isClient) {
    return null;
  }

  const task = data?.tasks?.[0];
  const database = task?.mainDatabase;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
        <span className="text-gray-400">Checking database...</span>
      </div>
    );
  }

  if (!database) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <RefreshCw className="h-3 w-3 animate-spin text-yellow-400" />
        <span className="text-yellow-400">Creating database...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <HardDrive className="h-3 w-3 text-green-400" />
      <span className="text-gray-300">
        Database: <span className="font-mono text-green-400">{database.name}</span>
      </span>
    </div>
  );
}

// Compact version for status bars
export function DatabaseStatusCompact({ taskId }: { taskId: string }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data } = db.useQuery({
    tasks: {
      $: { where: { id: taskId } },
      mainDatabase: {},
    }
  });

  if (!isClient) {
    return null;
  }

  const database = data?.tasks?.[0]?.mainDatabase;

  if (!database) {
    return (
      <div className="flex items-center gap-1" title="Database creating...">
        <RefreshCw className="h-3 w-3 animate-spin text-yellow-400" />
      </div>
    );
  }

  const handleCopyAppId = () => {
    navigator.clipboard.writeText(String(database.instantAppId));
  };

  return (
    <button 
      className="flex items-center gap-1 group relative hover:bg-gray-100 hover:bg-opacity-10 px-1 py-0.5 rounded transition-colors"
      onClick={handleCopyAppId}
      type="button"
    >
      <HardDrive className="h-3 w-3 text-green-400" />
      
      {/* Tooltip on hover - positioned below */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
        <div className="font-semibold text-green-400">{String(database.name)}</div>
        <div className="text-[10px] text-gray-400 font-mono">{String(database.instantAppId)}</div>
        {/* Arrow pointing up */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
          <div className="border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    </button>
  );
}