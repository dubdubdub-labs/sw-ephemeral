import { MorphCloudClient } from "morphcloud";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";

const morph = new MorphCloudClient({
  apiKey: process.env.MORPH_API_KEY,
});

export const morphRouter = router({
  instances: {
    list: publicProcedure
      .query(async () => {
        try {
          const instances = await morph.instances.list();
          console.log('Raw instances from Morph:', instances);
          
          // Check status field (Morph uses status, not state)
          const activeInstances = instances
            .filter((instance: any) => {
              return instance.status === 'ready' || 
                     instance.status === 'running' || 
                     instance.status === 'starting' ||
                     instance.status === 'paused';
            })
            .map((instance: any) => ({
              id: instance.id,
              state: instance.state || instance.status, // Use status if state is not available
              status: instance.status,
              metadata: instance.metadata,
              createdAt: instance.created_at,
              networking: instance.networking,
            }));
          
          console.log('Active instances:', activeInstances.length);
          return activeInstances;
        } catch (error) {
          console.error('Failed to list instances:', error);
          return [];
        }
      }),
    
    startInstanceAsync: publicProcedure
      .input(
        z.object({
          snapshotId: z.string(),
          metadata: z.record(z.string(), z.string()).optional(),
          ttlSeconds: z.number().optional(),
          ttlAction: z.enum(["stop", "pause"]).optional(),
          exposeHttpService: z
            .array(
              z.object({
                name: z.string(),
                port: z.number(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const instance = await morph.instances.start({
          snapshotId: input.snapshotId,
          metadata: input.metadata,
          ttlAction: input.ttlAction,
          ttlSeconds: input.ttlSeconds,
        });

        // Expose HTTP services if needed
        if (input.exposeHttpService) {
          for (const service of input.exposeHttpService) {
            await instance.exposeHttpService(service.name, service.port);
          }
        }

        return {
          instance: {
            id: instance.id,
            status: instance.status,
            networking: instance.networking,
          },
        };
      }),

    execCommandsOnInstance: publicProcedure
      .input(
        z.object({
          instanceId: z.string(),
          commands: z.array(
            z.object({
              command: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const instance = await morph.instances.get({
          instanceId: input.instanceId,
        });

        const results = [];
        for (const { command } of input.commands) {
          const result = await instance.exec(command);
          results.push({
            command,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exit_code,
          });
        }

        return { results };
      }),

    get: publicProcedure
      .input(z.object({ instanceId: z.string() }))
      .query(async ({ input }) => {
        const instance = await morph.instances.get(input);
        // Return the full instance object like cloud-code does
        return instance;
      }),

    stop: publicProcedure
      .input(z.object({ instanceId: z.string() }))
      .mutation(async ({ input }) => {
        await morph.instances.stop(input);
      }),
  },

  instance: {
    pause: publicProcedure
      .input(z.object({ instanceId: z.string() }))
      .mutation(async ({ input }) => {
        const instance = await morph.instances.get(input);
        await instance.pause();
      }),

    resume: publicProcedure
      .input(z.object({ instanceId: z.string() }))
      .mutation(async ({ input }) => {
        const instance = await morph.instances.get(input);
        await instance.resume();
      }),

    branch: publicProcedure
      .input(
        z.object({
          instanceId: z.string(),
          number: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const instance = await morph.instances.get({
          instanceId: input.instanceId,
        });
        const { snapshot, instances } = await instance.branch(input.number);
        return { snapshot, instances };
      }),
  },
});