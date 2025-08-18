import { router } from "../trpc";
import { morphRouter } from "./morph";

export const appRouter = router({
  morph: morphRouter,
});

export type AppRouter = typeof appRouter;