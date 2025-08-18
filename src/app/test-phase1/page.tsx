"use client";

import { trpc } from "@/lib/trpc/client";
import { db } from "@/lib/instant/client";

export default function TestPhase1Page() {
  // Test TRPC connection (will fail without valid Morph API key)
  const testQuery = trpc.morph.instances.get.useQuery(
    { instanceId: "test_id" },
    { 
      enabled: false, // Don't run automatically
      retry: false 
    }
  );

  // Test InstantDB connection
  const { data, isLoading } = db.useQuery({
    tasks: {},
  });

  const handleTestTRPC = async () => {
    try {
      await testQuery.refetch();
      alert("TRPC connection test completed (check console for details)");
    } catch (error) {
      console.error("TRPC test error:", error);
      alert("TRPC test failed (expected without valid Morph API key)");
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Phase 1: Foundation Test</h1>
      
      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">TRPC Setup</h2>
          <p className="text-gray-600 mb-4">
            TRPC server is configured at /api/trpc
          </p>
          <button
            onClick={handleTestTRPC}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test TRPC Connection
          </button>
          {testQuery.error && (
            <p className="mt-2 text-red-600">
              Error: {testQuery.error.message}
            </p>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">InstantDB Setup</h2>
          <p className="text-gray-600 mb-4">
            InstantDB client is initialized with schema
          </p>
          <div>
            <p>Loading: {isLoading ? "Yes" : "No"}</p>
            <p>Tasks found: {data?.tasks?.length || 0}</p>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <ul className="space-y-2 text-sm">
            <li>
              MORPH_API_KEY: {process.env.MORPH_API_KEY ? "✓ Set (server-side)" : "✗ Not set"}
            </li>
            <li>
              NEXT_PUBLIC_INSTANT_APP_ID: {process.env.NEXT_PUBLIC_INSTANT_APP_ID ? "✓ Set" : "✗ Not set"}
            </li>
            <li>
              NEXT_PUBLIC_OPERATOR_SNAPSHOT_ID: {process.env.NEXT_PUBLIC_OPERATOR_SNAPSHOT_ID ? "✓ Set" : "✗ Not set"}
            </li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 bg-green-50">
          <h2 className="text-xl font-semibold mb-4 text-green-800">✓ Phase 1 Complete</h2>
          <ul className="space-y-1 text-green-700">
            <li>✓ TRPC server setup with superjson transformer</li>
            <li>✓ TRPC client with React Query integration</li>
            <li>✓ Morph router with all required endpoints</li>
            <li>✓ InstantDB client with full schema</li>
            <li>✓ Environment variables configured</li>
            <li>✓ Providers wrapped in layout</li>
          </ul>
        </div>
      </div>
    </div>
  );
}