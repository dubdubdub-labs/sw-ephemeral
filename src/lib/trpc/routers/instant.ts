import { z } from "zod";
import { init, id } from "@instantdb/admin";
import { publicProcedure, router } from "../trpc";
import { generateDatabaseName } from "@/lib/utils/name-generator";

// Zod schema for InstantDB Platform API response
const InstantAppSchema = z.object({
  id: z.string(),
  title: z.string(),
  "admin-token": z.string(),
  created_at: z.string(),
  schema: z.object({
    refs: z.record(z.string(), z.any()),
    blobs: z.record(z.string(), z.any()),
  }).optional(),
  creator_id: z.string().optional(),
  connection_string: z.string().nullable().optional(),
  deletion_marked_at: z.string().nullable().optional(),
  perms: z.any().nullable().optional(),
});

const InstantAppResponseSchema = z.object({
  app: InstantAppSchema
});

export const instantRouter = router({
  createDatabase: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 1. Generate three-word name
        const databaseName = generateDatabaseName();
        console.log(`Creating database "${databaseName}" for task ${input.taskId}`);
        
        // 2. Call Platform API to create app
        const response = await fetch("https://api.instantdb.com/superadmin/apps", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PLATFORM_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: databaseName,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Platform API error:", errorText);
          throw new Error(`Failed to create database: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // 3. Parse and validate response with Zod
        let parsedResponse;
        try {
          parsedResponse = InstantAppResponseSchema.parse(responseData);
        } catch (zodError) {
          console.error("Response validation failed:", JSON.stringify(responseData, null, 2));
          console.error("Zod error:", zodError);
          throw zodError;
        }
        
        const appData = parsedResponse.app;
        
        // 4. Initialize Admin SDK for main database
        const adminDb = init({
          appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
          adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
        });

        const databaseId = id();
        
        // 5. Write to databases table and link to task using Admin SDK
        // Admin SDK transact takes an array of transaction chunks
        // First create the database record, then link it
        await adminDb.transact([
          adminDb.tx.databases[databaseId].update({
            instantAppId: appData.id,
            adminToken: appData["admin-token"],
            name: databaseName,
            createdAt: new Date(),
          })
        ]);
        
        // Link the database to the task in a separate transaction
        await adminDb.transact([
          adminDb.tx.tasks[input.taskId].link({
            mainDatabase: databaseId
          })
        ]);
        
        console.log(`Database "${databaseName}" created successfully with ID: ${appData.id}`);
        
        // 6. Return success (client will auto-sync the changes)
        return {
          success: true,
          databaseId,
          name: databaseName,
          instantAppId: appData.id,
        };
      } catch (error) {
        console.error("Error creating database:", error);
        
        // Return error but don't throw - let the task continue
        if (error instanceof z.ZodError) {
          console.error("Validation error:", error.issues);
          return {
            success: false,
            error: "Invalid response from InstantDB API",
          };
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),
});