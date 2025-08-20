# InstantDB Database Integration Implementation Plan

## Overview
This document outlines the implementation plan for integrating InstantDB database creation and management into the sw-ephemeral operator system. Each operator task will have its own dedicated InstantDB database, enabling local-first data management with automatic syncing.

## Architecture Overview

### Key Components
1. **InstantDB Platform API**: Used to create new app instances via TRPC routes (server-side only)
2. **InstantDB Admin SDK**: Server-side SDK to push data to the main database after creating new apps
3. **InstantDB Client**: Local-first database client for mutations and queries (auto-syncs from server)
4. **Schema Updates**: New `databases` table with relationships to tasks and iterations
5. **TRPC Routes**: Server-side API for database creation and data insertion
6. **UI Components**: Database status indicators on operator pages

### Data Flow
```
Task Creation → TRPC Call → Platform API → Create DB
                    ↓                           ↓
              Generate Name            Admin SDK writes to main DB
                                              ↓
                                    Client auto-syncs changes
                                              ↓
                                         UI Updates
```

## Implementation Steps

### Phase 1: Schema Updates

#### 1.1 Update InstantDB Schema Files
**Files to modify:**
- `/instant.schema.ts` 
- `/src/lib/instant/client.ts`

**New Entity: `databases`**
```typescript
databases: i.entity({
  instantAppId: i.string().unique().indexed(),     // The app ID from platform API
  adminToken: i.string(),                          // Admin token for the database
  name: i.string(),                                 // Three random words name
  createdAt: i.date().indexed(),
})
```

**New Links:**
```typescript
// Database to Task relationship (one-to-one optional)
taskMainDatabase: {
  forward: { on: "tasks", has: "one", label: "mainDatabase" },
  reverse: { on: "databases", has: "one", label: "task" },
},

// Database to Iteration relationship (optional, for future use)
databaseOriginIteration: {
  forward: { on: "databases", has: "one", label: "originIteration" },
  reverse: { on: "iterations", has: "many", label: "originatedDatabases" },
},
```

### Phase 2: Platform API Integration

#### 2.1 Create TRPC Router for InstantDB
**New file:** `/src/lib/trpc/routers/instant.ts`

**Key Functions:**
```typescript
import { init, id } from '@instantdb/admin';

export const instantRouter = router({
  createDatabase: publicProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // 1. Generate three-word name
      const databaseName = generateDatabaseName();
      
      // 2. Call Platform API to create app
      const response = await fetch('https://api.instantdb.com/superadmin/apps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PLATFORM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: databaseName // Use generated name, not user input
        }),
      });
      
      // 3. Parse response with Zod
      const responseData = await response.json();
      const parsedResponse = InstantAppResponseSchema.parse(responseData);
      const appData = parsedResponse.app; // Extract the app object
      
      // 4. Use Admin SDK to write to main database
      const adminDb = init({
        appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
        adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
      });
      
      const databaseId = id();
      
      // 5. Write to databases table and link to task
      // NOTE: Admin SDK requires separate transactions for create and link
      await adminDb.transact([
        adminDb.tx.databases[databaseId].update({
          instantAppId: appData.id,
          adminToken: appData['admin-token'],
          name: databaseName,
          createdAt: new Date(),
        })
      ]);
      
      // Link in a separate transaction
      await adminDb.transact([
        adminDb.tx.tasks[input.taskId].link({
          mainDatabase: databaseId
        })
      ]);
      
      // 6. Return success (client will auto-sync the changes)
      return { 
        success: true,
        databaseId,
        name: databaseName 
      };
    }),
});
```

**Zod Schemas for API Response:**
```typescript
// IMPORTANT: The Platform API wraps the response in an "app" object
const InstantAppSchema = z.object({
  id: z.string(),
  title: z.string(),
  "admin-token": z.string(),
  created_at: z.string(),
  schema: z.object({
    refs: z.record(z.string(), z.any()), // Note: z.record needs 2 arguments
    blobs: z.record(z.string(), z.any()),
  }).optional(),
  creator_id: z.string().optional(),
  connection_string: z.string().nullable().optional(),
  deletion_marked_at: z.string().nullable().optional(),
  perms: z.any().nullable().optional(),
});

// The actual response is wrapped
const InstantAppResponseSchema = z.object({
  app: InstantAppSchema
});
```

#### 2.2 Update Main Router
**File to modify:** `/src/lib/trpc/routers/index.ts`
```typescript
import { instantRouter } from "./instant";

export const appRouter = router({
  morph: morphRouter,
  instant: instantRouter,  // Add this line
});
```

### Phase 3: Database Creation Hook

#### 3.1 Create Database Management Hook
**New file:** `/src/hooks/use-database-management.ts`

**Key Functions:**
- `createDatabaseForTask(taskId)`: Triggers database creation via TRPC
- `getDatabaseStatus(taskId)`: Queries local client for database status
- `getDatabaseInfo(taskId)`: Returns database details from local sync

**Implementation Pattern:**
```typescript
export const useDatabaseManagement = () => {
  // Query databases from local client (auto-synced from server)
  const { data } = db.useQuery({
    tasks: {
      $: { where: { id: taskId } },
      mainDatabase: {},
    }
  });
  
  // Mutation just calls TRPC, no local writes needed
  const createDatabaseMutation = trpc.instant.createDatabase.useMutation({
    onSuccess: (data) => {
      console.log('Database created:', data.name);
      // Client will auto-sync the new database entry
    },
    onError: (error) => {
      console.error('Failed to create database:', error);
    }
  });
  
  return {
    createDatabase: (taskId: string) => {
      createDatabaseMutation.mutate({ taskId });
    },
    database: data?.tasks?.[0]?.mainDatabase,
    isCreating: createDatabaseMutation.isLoading,
  };
};
```

### Phase 4: Task Creation Flow Integration

#### 4.1 Update Task Creation Process
**File to modify:** `/src/app/page.tsx`

**Changes in `handleSubmit` function:**
```typescript
// Import the mutation at component level
const createDatabaseMutation = trpc.instant.createDatabase.useMutation();

// In handleSubmit:
const taskId = id();

// Create task
await db.transact([...]);

// Link system prompt
await setTaskSystemPrompt({...});

// Create database (async, non-blocking)
// Just pass taskId, name is auto-generated server-side
createDatabaseMutation.mutate({ taskId });

// Navigate immediately (don't wait for DB)
router.push(`/operator/${taskId}?...`);
```

### Phase 5: UI Updates

#### 5.1 Database Status Component
**New file:** `/src/components/operator/DatabaseStatus.tsx`

**Features:**
- Show database connection status with icon
- Display database name and app ID in tooltip
- Click to copy app ID to clipboard
- Loading state while creating

**Implementation:**
```typescript
export function DatabaseStatusCompact({ taskId }: { taskId: string }) {
  const { data } = db.useQuery({
    tasks: {
      $: { where: { id: taskId } },
      mainDatabase: {},
    }
  });

  const database = data?.tasks?.[0]?.mainDatabase;

  if (!database) {
    return (
      <div className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin text-yellow-400" />
      </div>
    );
  }

  const handleCopyAppId = () => {
    navigator.clipboard.writeText(String(database.instantAppId));
  };

  return (
    <button 
      className="flex items-center gap-1 group relative hover:bg-gray-100 hover:bg-opacity-10 px-1 py-0.5 rounded"
      onClick={handleCopyAppId}
    >
      <HardDrive className="h-3 w-3 text-green-400" />
      
      {/* Tooltip positioned below (important for top status bars) */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
        <div className="font-semibold text-green-400">{String(database.name)}</div>
        <div className="text-[10px] text-gray-400 font-mono">{String(database.instantAppId)}</div>
      </div>
    </button>
  );
}
```

#### 5.2 Integrate Status into Operator Page
**Files to modify:**
- `/src/app/operator/[taskId]/page.tsx` - Pass taskId prop to OperatorStatus
- `/src/components/operator/OperatorStatus.tsx` - Add DatabaseStatusCompact component

```typescript
// In OperatorStatus.tsx
import { DatabaseStatusCompact } from './DatabaseStatus';

// Add taskId to props interface
interface OperatorStatusProps {
  taskId: string;
  instanceId: string;
  // ... other props
}

// In the component render, add after VM ID:
<DatabaseStatusCompact taskId={taskId} />
```

### Phase 6: Utility Functions

#### 6.1 Random Name Generator
**New file:** `/src/lib/utils/name-generator.ts`

```typescript
const adjectives = ['swift', 'bright', 'calm', ...];
const colors = ['blue', 'green', 'red', ...];
const nouns = ['river', 'mountain', 'cloud', ...];

export function generateDatabaseName(): string {
  // Returns format: "swift-blue-river"
}
```

## Error Handling

### Key Error Scenarios:
1. **Platform API Failure**: Log error, show warning, allow task to continue
2. **Database Already Exists**: Check before creation, handle gracefully
3. **Token Expiration**: Use environment variable, no expiration expected
4. **Network Issues**: Retry logic with exponential backoff
5. **Zod Validation**: Platform API response wrapped in `app` object - must extract properly
6. **Admin SDK Transact**: Separate transactions needed for create and link operations

## Testing Strategy

### Manual Testing Steps:
1. Create new task and verify database creation
2. Check database appears in databases table
3. Verify task-database link
4. Test error scenarios (API down, network issues)
5. Verify UI updates correctly

### Monitoring:
- Console logs for debugging
- Browser DevTools Network tab for API calls
- InstantDB dashboard for database verification

## Security Considerations

1. **Platform Token**: Stored in environment variable, never exposed to client
2. **Admin Tokens**: Stored in database via Admin SDK server-side, synced to client read-only
3. **Database Isolation**: Each task has its own database with unique credentials
4. **TRPC Routes**: All database creation and writes happen server-side
5. **Admin SDK**: Only used server-side with admin token to write to main database

## Future Enhancements

1. **Database Cloning**: When forking iterations, optionally clone database
2. **Database Cleanup**: Archive or delete databases for old tasks
3. **Database Metrics**: Track usage, size, and performance
4. **Multi-tenant Support**: Share databases across team members
5. **Backup/Restore**: Database snapshot functionality

## Implementation Order

1. ✅ Understand existing codebase
2. Update InstantDB schema
3. Create TRPC router for Platform API
4. Add database creation to task flow
5. Create database status UI component
6. Test end-to-end flow
7. Add error handling and retry logic
8. Document API usage

## Dependencies

- `zod`: Schema validation for API responses
- `@instantdb/react`: Local database client (may need version update to match admin SDK)
- `@instantdb/admin`: Admin SDK for server-side database writes (install with `bun add @instantdb/admin`)
- `@trpc/server`: Server-side API routes
- `lucide-react`: Icons for UI components

## Timeline Estimate

- Schema Updates: 30 minutes
- TRPC Router: 1 hour
- Database Hook: 45 minutes
- Task Integration: 30 minutes
- UI Components: 45 minutes
- Testing & Refinement: 1 hour

**Total: ~4 hours**

## Common Pitfalls to Avoid

1. **API Response Structure**: The Platform API returns `{ app: { ... } }` not just `{ ... }`
2. **Zod Record Type**: Use `z.record(z.string(), z.any())` with two arguments, not `z.record(z.any())`
3. **Admin SDK Transactions**: Create and link operations must be in separate `transact()` calls
4. **Type Coercion**: Use `String()` wrapper when displaying database properties in React to avoid type errors
5. **Tooltip Positioning**: Use `top-full` for tooltips in top status bars, not `bottom-full`
6. **Environment Variables**: Ensure `PLATFORM_TOKEN` is set in `.env.local`

## Notes

- Database creation happens server-side via Platform API
- Database records are written server-side using Admin SDK
- Client automatically syncs changes via InstantDB's real-time sync
- No client-side mutations needed for database creation
- Platform API only used for creating new databases
- Database creation is non-blocking - UI remains responsive
- Three-word names make databases human-friendly
- Admin tokens stored for future features (e.g., database management)
- Console logs should be minimal in production - only log successes and errors