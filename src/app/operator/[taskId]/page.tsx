'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { OperatorFrame } from '@/components/operator/OperatorFrame';
import { OperatorChat } from '@/components/operator/OperatorChat';
import { OperatorStatus } from '@/components/operator/OperatorStatus';
import { OperatorLoading } from '@/components/operator/OperatorLoading';
import { DebugInfo } from '@/components/operator/DebugInfo';
import { useOperatorVM } from '@/hooks/use-operator-vm';
import { useOperatorChat } from '@/hooks/use-operator-chat';

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default function OperatorPage({ params }: PageProps) {
  const { taskId } = use(params);
  const searchParams = useSearchParams();
  const prompt = searchParams.get('prompt');
  const tokenId = searchParams.get('tokenId');
  
  const { bootOperator, isBooting, instanceId, error, tokenLoading, checkExistingInstance } = useOperatorVM(tokenId, taskId);
  const { debug } = useOperatorChat(taskId, instanceId);
  
  // Use ref to track if boot has been initiated (survives re-renders and StrictMode)
  const bootInitiated = useRef(false);
  const checkInitiated = useRef(false);
  const [hasExistingInstance, setHasExistingInstance] = useState<boolean | null>(null);
  
  useEffect(() => {
    // First check if there's an existing instance for this task
    if (!checkInitiated.current && !tokenLoading) {
      checkInitiated.current = true;
      checkExistingInstance(taskId).then(exists => {
        console.log('Check complete, existing instance:', exists);
        setHasExistingInstance(exists);
      });
    }
  }, [taskId, tokenLoading, checkExistingInstance]);
  
  useEffect(() => {
    // Only boot if:
    // 1. We have a prompt
    // 2. We've checked for existing instances (hasExistingInstance is not null)
    // 3. There's NO existing instance (hasExistingInstance is false)
    // 4. We haven't already initiated a boot
    if (prompt && hasExistingInstance === false && !bootInitiated.current && !isBooting && !instanceId && !tokenLoading) {
      bootInitiated.current = true; // Mark as initiated immediately
      console.log('No existing instance found, booting new operator VM...', { taskId, prompt: prompt.slice(0, 50) });
      
      const machineName = `operator-${Date.now()}`;
      bootOperator(taskId, prompt, machineName, tokenId).catch(error => {
        console.error('Failed to boot operator:', error);
        bootInitiated.current = false; // Reset on error so user can retry
      });
    } else if (hasExistingInstance === true && instanceId) {
      console.log('Using existing instance:', instanceId);
    }
  }, [prompt, taskId, tokenLoading, isBooting, instanceId, bootOperator, hasExistingInstance]); // Include all deps for correctness
  
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Starting Operator</h2>
            <p className="text-red-700 mb-4">{error}</p>
            
            {error.includes('No Anthropic token') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">How to Fix:</h3>
                <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                  <li>Ensure OAuth tokens exist in InstantDB</li>
                  <li>The system will try to use any available Anthropic OAuth token</li>
                  <li>Check the console for more details</li>
                </ol>
              </div>
            )}
            
            {error.includes('system prompt') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">Missing System Prompt</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Every task requires a system prompt to guide the AI assistant.
                </p>
                <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                  <li>Go back to the homepage</li>
                  <li>Select a system prompt from the library</li>
                  <li>Create a new task with the selected prompt</li>
                </ol>
              </div>
            )}
            
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (tokenLoading || isBooting || !instanceId) {
    return <OperatorLoading />;
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <OperatorStatus instanceId={instanceId} />
      <div className="flex-1 relative">
        <OperatorFrame instanceId={instanceId} />
      </div>
      <OperatorChat taskId={taskId} instanceId={instanceId} />
    </div>
  );
}