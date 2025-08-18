import { init } from '@instantdb/react';
import { i } from '@instantdb/core';

// Define schema matching cloud-code structure
const schema = i.schema({
  entities: {
    tasks: i.entity({
      name: i.string().optional(),
      description: i.string().optional(),
      lastMessageAt: i.date().indexed().optional(),
    }),
    iterations: i.entity({
      machineName: i.string().indexed().optional(),
      lastSessionMessageAt: i.date().indexed().optional(),
    }),
    sessions: i.entity({
      externalUuid: i.string().unique().indexed().optional(),
      sessionName: i.string().indexed().optional(),
      lastMessageAt: i.date().indexed().optional(),
    }),
    messages: i.entity({
      role: i.string(),
      createdAt: i.date().indexed().optional(),
      externalUuid: i.string().unique().indexed().optional(),
    }),
    messageParts: i.entity({
      partType: i.string(),
      text: i.string().optional(),
      state: i.string().optional(),
    }),
    morphSnapshots: i.entity({
      externalMorphSnapshotId: i.string().unique().optional(),
    }),
    morphInstances: i.entity({
      externalMorphInstanceId: i.string().unique().optional(),
    }),
    userProfiles: i.entity({
      username: i.string().optional(),
      $userEmail: i.string().unique().indexed(),
    }),
    oauthTokens: i.entity({
      provider: i.string(),
      authToken: i.string(),
      refreshToken: i.string(),
      expiresAt: i.date(),
    }),
  },
  links: {
    // Task relationships
    taskIterations: {
      forward: { on: "tasks", has: "many", label: "iterations" },
      reverse: { on: "iterations", has: "one", label: "task" },
    },
    // Iteration relationships
    iterationSessions: {
      forward: { on: "iterations", has: "many", label: "sessions" },
      reverse: { on: "sessions", has: "many", label: "iterations" },
    },
    iterationInitialSnapshot: {
      forward: { on: "iterations", has: "one", label: "initialSnapshot" },
      reverse: { on: "morphSnapshots", has: "many", label: "iterationsInitial" },
    },
    iterationLatestSnapshot: {
      forward: { on: "iterations", has: "one", label: "latestSnapshot" },
      reverse: { on: "morphSnapshots", has: "many", label: "iterationsLatest" },
    },
    iterationActiveInstance: {
      forward: { on: "iterations", has: "one", label: "activeInstance" },
      reverse: { on: "morphInstances", has: "many", label: "iterationsActive" },
    },
    // Session relationships
    sessionMessages: {
      forward: { on: "sessions", has: "many", label: "messages" },
      reverse: { on: "messages", has: "one", label: "session" },
    },
    // Message relationships
    messageParts: {
      forward: { on: "messages", has: "many", label: "messageParts" },
      reverse: { on: "messageParts", has: "one", label: "message" },
    },
    // User relationships
    userOauthTokens: {
      forward: { on: "userProfiles", has: "many", label: "oauthTokens" },
      reverse: { on: "oauthTokens", has: "one", label: "userProfile" },
    },
  },
});

export type AppSchema = typeof schema;

export const db = init<AppSchema>({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
});