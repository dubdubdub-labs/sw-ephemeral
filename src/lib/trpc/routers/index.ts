import { router } from "../trpc";
import { morphRouter } from "./morph";
import { instantRouter } from "./instant";

export const appRouter = router({
  morph: morphRouter,
  instant: instantRouter,
});

export type AppRouter = typeof appRouter;