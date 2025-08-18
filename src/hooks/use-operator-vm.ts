import { trpc } from '@/lib/trpc/client';
import { db } from '@/lib/instant/client';
import { id, lookup } from '@instantdb/core';
import { useState, useCallback } from 'react';
import { useAnthropicOAuth } from './use-anthropic-oauth';
import * as commands from '@/lib/vm/commands';
import { OPERATOR_SNAPSHOT_ID, VM_TTL_SECONDS, VM_TTL_ACTION, OPERATOR_SYSTEM_PROMPT } from '@/lib/vm/constants';

export function useOperatorVM() {
  const [isBooting, setIsBooting] = useState(false);
  const [instanceId, setInstanceId] = useState<string>();
  const [error, setError] = useState<string>();
  const [iterationId, setIterationId] = useState<string>();
  const { token, isUsingSharedToken, isLoading: tokenLoading } = useAnthropicOAuth();
  
  const startInstanceMutation = trpc.morph.instances.startInstanceAsync.useMutation();
  const execCommandsMutation = trpc.morph.instances.execCommandsOnInstance.useMutation();
  const getInstanceMutation = trpc.morph.instances.get.useMutation();
  
  async function setupVMInBackground(
    instanceId: string, 
    taskId: string, 
    prompt: string, 
    machineName: string,
    token: any
  ) {
    console.log('setupVMInBackground called with:', {
      instanceId,
      taskId,
      hasToken: !!token?.authToken,
      machineName
    });
    // Create iteration in InstantDB
    const iterationId = id();
    const morphInstanceId = id();
    const morphSnapshotLookup = lookup('externalMorphSnapshotId', OPERATOR_SNAPSHOT_ID);
    
    await db.transact([
      db.tx.morphSnapshots[morphSnapshotLookup].update({
        externalMorphSnapshotId: OPERATOR_SNAPSHOT_ID,
      }),
      db.tx.morphInstances[morphInstanceId].update({
        externalMorphInstanceId: instanceId,
      }),
      db.tx.iterations[iterationId].update({
        machineName,
        lastSessionMessageAt: new Date(),
      })
        .link({ task: taskId })
        .link({
          initialSnapshot: morphSnapshotLookup,
          latestSnapshot: morphSnapshotLookup,
          activeInstance: morphInstanceId,
        }),
    ]);
    
    // Execute setup commands
    try {
      const result = await execCommandsMutation.mutateAsync({
        instanceId,
        commands: [
          { command: commands.createClaudeCredentialsCommand({
            authToken: token.authToken || '',
            expiresAt: token.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
          }) },
          { command: `echo '{"machine_name":"${machineName}","instance_id":"${instanceId}"}' > ~/operator/sw-compose/config.json` },
          // Dev server is already running as pm2 process 'operator-dev' in the snapshot
          { command: commands.createClaudeSyncCommand(iterationId) },
          { command: 'sleep 3' },
          { command: commands.createClaudeSessionCommand('operator-main', prompt, OPERATOR_SYSTEM_PROMPT) },
        ],
      });
      console.log('Setup commands executed successfully:', result);
    } catch (error) {
      console.error('Failed to execute setup commands:', error);
      // Don't throw - the VM is still usable even if Claude setup fails
    }
    
    return iterationId;
  }
  
  async function bootOperator(taskId: string, prompt: string, machineName: string) {
    console.log('Boot operator called, token status:', {
      hasToken: !!token,
      tokenAuth: token?.authToken?.slice(0, 20),
      isUsingSharedToken,
      tokenLoading,
    });
    
    // Don't boot if tokens are still loading
    if (tokenLoading) {
      console.log('Waiting for tokens to load...');
      return;
    }
    
    // For now, we'll proceed without token and handle it in background setup
    // The VM can still boot and show the UI even without Claude being ready
    const hasToken = !!(token && token.authToken);
    
    setIsBooting(true);
    setError(undefined);
    
    try {
      // 1. Start the VM (port already exposed in snapshot as 'operator')
      const { instance } = await startInstanceMutation.mutateAsync({
        snapshotId: OPERATOR_SNAPSHOT_ID,
        ttlSeconds: VM_TTL_SECONDS,
        ttlAction: VM_TTL_ACTION,
        // Port 3000 is pre-exposed as 'operator' in the snapshot
      });
      
      // Immediately set instanceId so the UI can show the iframe
      setInstanceId(instance.id);
      setIsBooting(false); // Mark booting as complete once VM is up
      
      // Continue setup in the background (don't await)
      // Only run background setup if we have a token
      if (hasToken) {
        console.log('Starting background setup for instance:', instance.id);
        setupVMInBackground(instance.id, taskId, prompt, machineName, token).then(iterationId => {
          setIterationId(iterationId);
          console.log('VM setup completed with iteration:', iterationId);
        }).catch(err => {
          console.error('Background setup failed:', err);
          console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            instanceId: instance.id
          });
          // Don't set error here since the VM is already running
        });
      } else {
        console.warn('VM started but no Anthropic token available - Claude will not be initialized');
        // Still create the iteration in DB even without Claude
        const iterationId = id();
        const morphInstanceId = id();
        const morphSnapshotLookup = lookup('externalMorphSnapshotId', OPERATOR_SNAPSHOT_ID);
        
        db.transact([
          db.tx.morphSnapshots[morphSnapshotLookup].update({
            externalMorphSnapshotId: OPERATOR_SNAPSHOT_ID,
          }),
          db.tx.morphInstances[morphInstanceId].update({
            externalMorphInstanceId: instance.id,
          }),
          db.tx.iterations[iterationId].update({
            machineName,
            lastSessionMessageAt: new Date(),
          })
            .link({ task: taskId })
            .link({
              initialSnapshot: morphSnapshotLookup,
              latestSnapshot: morphSnapshotLookup,
              activeInstance: morphInstanceId,
            }),
        ]).then(() => {
          setIterationId(iterationId);
          console.log('Iteration created without Claude:', iterationId);
        });
      }
      
      return { instanceId: instance.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to boot operator';
      setError(errorMessage);
      setIsBooting(false); // Only set false on error, success already sets it false
      throw new Error(errorMessage);
    }
  }
  
  const checkExistingInstance = useCallback(async (taskId: string) => {
    console.log('Checking for existing instance for task:', taskId);
    
    try {
      // Query for the task and its iterations
      const { data } = await db.queryOnce({
        tasks: {
          $: { where: { id: taskId } },
          iterations: {
            activeInstance: {}
          }
        }
      });
      
      const task = data?.tasks?.[0];
      // Sort iterations by creation time to get the latest one
      const iterations = task?.iterations || [];
      const sortedIterations = iterations.sort((a: any, b: any) => {
        const aTime = new Date(a.serverCreatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.serverCreatedAt || b.createdAt || 0).getTime();
        return bTime - aTime; // Sort descending (latest first)
      });
      const latestIteration = sortedIterations[0];
      const activeInstance = latestIteration?.activeInstance;
      
      if (activeInstance?.externalMorphInstanceId) {
        console.log('Found existing instance:', activeInstance.externalMorphInstanceId);
        
        // Check if the instance is still running
        try {
          const instance = await getInstanceMutation.mutateAsync({
            instanceId: activeInstance.externalMorphInstanceId
          });
          
          if (instance && ['starting', 'running'].includes(instance.state)) {
            console.log('Reusing existing instance:', activeInstance.externalMorphInstanceId, 'iteration:', latestIteration.id);
            setInstanceId(activeInstance.externalMorphInstanceId);
            setIterationId(latestIteration.id);
            return true;
          }
        } catch (err) {
          console.log('Instance no longer active:', err);
        }
      }
    } catch (err) {
      console.error('Error checking existing instance:', err instanceof Error ? err.message : 'Unknown error', err);
    }
    
    return false;
  }, [getInstanceMutation, setInstanceId, setIterationId]);
  
  return {
    bootOperator,
    isBooting,
    instanceId,
    iterationId,
    error,
    tokenLoading,
    checkExistingInstance,
  };
}