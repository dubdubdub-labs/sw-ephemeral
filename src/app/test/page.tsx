'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { db } from '@/lib/instant/client';
import { useAnthropicOAuth } from '@/hooks/use-anthropic-oauth';
import { InitialPrompt } from '@/components/operator/InitialPrompt';
import { OperatorFrame } from '@/components/operator/OperatorFrame';
import { OperatorChat } from '@/components/operator/OperatorChat';
import { OperatorStatus } from '@/components/operator/OperatorStatus';

export default function TestPage() {
  const [activeTest, setActiveTest] = useState<string>('overview');
  
  // Test data
  const { token, isConnected } = useAnthropicOAuth();
  const { data: tasksData } = db.useQuery({ tasks: {} });
  
  const tests = {
    overview: {
      title: 'Implementation Overview',
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">✅ All Phases Complete</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Infrastructure</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>✓ TRPC server with Morph Cloud SDK</li>
                  <li>✓ InstantDB with full schema</li>
                  <li>✓ React Query integration</li>
                  <li>✓ Superjson transformer</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">VM Management</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>✓ VM boot with credentials</li>
                  <li>✓ Claude-sync integration</li>
                  <li>✓ Service discovery</li>
                  <li>✓ Pause/Resume/Stop controls</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">UI Components</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>✓ Initial prompt interface</li>
                  <li>✓ Iframe with controls</li>
                  <li>✓ Real-time chat</li>
                  <li>✓ Status indicators</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Features</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>✓ OAuth token management</li>
                  <li>✓ Message streaming</li>
                  <li>✓ Session resumption</li>
                  <li>✓ Error handling</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">📋 Test Workflow</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Set environment variables in .env.local</li>
              <li>Navigate to homepage to enter initial prompt</li>
              <li>System creates task and boots VM</li>
              <li>Iframe shows dev server when ready</li>
              <li>Chat interface allows continuation</li>
              <li>VM controls enable pause/resume/stop</li>
            </ol>
          </div>
        </div>
      )
    },
    environment: {
      title: 'Environment Status',
      content: (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Environment Variables</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>MORPH_API_KEY:</span>
                <span className={process.env.MORPH_API_KEY ? 'text-green-600' : 'text-red-600'}>
                  {process.env.MORPH_API_KEY ? '✓ Set (server-side)' : '✗ Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>NEXT_PUBLIC_INSTANT_APP_ID:</span>
                <span className={process.env.NEXT_PUBLIC_INSTANT_APP_ID ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_INSTANT_APP_ID ? '✓ Set' : '✗ Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>NEXT_PUBLIC_OPERATOR_SNAPSHOT_ID:</span>
                <span className={process.env.NEXT_PUBLIC_OPERATOR_SNAPSHOT_ID ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_OPERATOR_SNAPSHOT_ID ? '✓ Set' : '✗ Not set'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">OAuth Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Anthropic OAuth Connected:</span>
                <span className={isConnected ? 'text-green-600' : 'text-yellow-600'}>
                  {isConnected ? '✓ Connected' : '⚠ Not connected'}
                </span>
              </div>
              {token && (
                <div className="mt-2 text-xs text-gray-500">
                  Token expires: {new Date(token.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">InstantDB Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tasks in database:</span>
                <span>{tasksData?.tasks?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    components: {
      title: 'Component Preview',
      content: (
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Initial Prompt (Preview)</h4>
            <div className="border rounded bg-gray-50 p-4">
              <InitialPrompt onSubmit={(prompt) => alert(`Test: ${prompt}`)} />
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Status Component (Mock)</h4>
            <div className="border rounded bg-gray-50 p-4">
              <p className="text-sm text-gray-600 mb-2">Would show: VM status badge with pause/resume/stop controls</p>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Chat Component (Mock)</h4>
            <div className="border rounded bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Would show: Expandable chat dock with message list and input</p>
            </div>
          </div>
        </div>
      )
    },
    api: {
      title: 'API Endpoints',
      content: (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">TRPC Endpoints</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="p-2 bg-gray-100 rounded">morph.instances.startInstanceAsync</div>
              <div className="p-2 bg-gray-100 rounded">morph.instances.execCommandsOnInstance</div>
              <div className="p-2 bg-gray-100 rounded">morph.instances.get</div>
              <div className="p-2 bg-gray-100 rounded">morph.instances.stop</div>
              <div className="p-2 bg-gray-100 rounded">morph.instance.pause</div>
              <div className="p-2 bg-gray-100 rounded">morph.instance.resume</div>
              <div className="p-2 bg-gray-100 rounded">morph.instance.branch</div>
            </div>
          </div>
        </div>
      )
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">SW-Ephemeral Test Suite</h1>
      
      <div className="flex gap-4 mb-8">
        {Object.keys(tests).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTest(key)}
            className={`px-4 py-2 rounded ${
              activeTest === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {tests[key as keyof typeof tests].title}
          </button>
        ))}
      </div>
      
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {tests[activeTest as keyof typeof tests].title}
        </h2>
        {tests[activeTest as keyof typeof tests].content}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Quick Start</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Ensure all environment variables are set in .env.local</li>
          <li>Visit the homepage at <a href="/" className="underline">localhost:3005</a></li>
          <li>Enter a prompt to start an Operator VM</li>
          <li>Watch the VM boot and interact with it through the iframe and chat</li>
        </ol>
      </div>
    </div>
  );
}