// This file is used by instant-cli to push schema updates
// Run: bunx instant-cli push-schema

import { i } from '@instantdb/core';

// Define schema matching cloud-code structure
const schema = i.schema({
  entities: {
    // Core prompt entity
    prompts: i.entity({
      name: i.string(),                      // Display name
      slug: i.string().unique().indexed(),   // URL-friendly slug
      tags: i.json().optional(),            // Array of tags (stored as JSON)
      isActive: i.boolean(),                // Can be selected
      isDefault: i.boolean(),               // Default for new tasks
      createdAt: i.date().indexed(),
      updatedAt: i.date(),
    }),
    // Prompt versions
    promptVersions: i.entity({
      version: i.number().indexed(),         // Version number (1, 2, 3...)
      content: i.string(),                   // Actual prompt markdown
      changelog: i.string().optional(),      // What changed
      isLatest: i.boolean(),                // Latest version flag
      isDraft: i.boolean(),                  // Draft status
      tokenCount: i.number().optional(),    // Estimated tokens
      variables: i.json().optional(),       // Template variables array
      models: i.json().optional(),          // Compatible models array
      createdAt: i.date().indexed(),
    }),
    // Fork lineage tracking
    promptForks: i.entity({
      forkReason: i.string().optional(),    // Why it was forked
      createdAt: i.date(),
    }),
    tasks: i.entity({
      name: i.string().optional(),
      description: i.string().optional(),
      lastMessageAt: i.date().indexed().optional(),
      metadata: i.json().optional(),
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
    // Prompt to versions relationship
    promptVersions: {
      forward: { on: "prompts", has: "many", label: "versions" },
      reverse: { on: "promptVersions", has: "one", label: "prompt" },
    },
    // Version fork tracking
    versionForkedFrom: {
      forward: { on: "promptVersions", has: "one", label: "forkedFrom" },
      reverse: { on: "promptVersions", has: "many", label: "forks" },
    },
    // Fork lineage
    forkOriginalPrompt: {
      forward: { on: "promptForks", has: "one", label: "originalPrompt" },
      reverse: { on: "prompts", has: "many", label: "forkedTo" },
    },
    forkOriginalVersion: {
      forward: { on: "promptForks", has: "one", label: "originalVersion" },
      reverse: { on: "promptVersions", has: "many", label: "forkedTo" },
    },
    forkNewPrompt: {
      forward: { on: "promptForks", has: "one", label: "newPrompt" },
      reverse: { on: "prompts", has: "many", label: "forkedFrom" },
    },
    // Task system prompt (optional, set once)
    taskSystemPrompt: {
      forward: { on: "tasks", has: "one", label: "systemPrompt" },
      reverse: { on: "prompts", has: "many", label: "tasks" },
    },
    taskSystemPromptVersion: {
      forward: { on: "tasks", has: "one", label: "systemPromptVersion" },
      reverse: { on: "promptVersions", has: "many", label: "tasks" },
    },
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

export default schema;