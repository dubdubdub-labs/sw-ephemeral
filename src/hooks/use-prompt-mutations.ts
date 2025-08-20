import { useCallback } from "react";
import { db } from "@/lib/instant/client";
import { id, slugify, estimateTokens } from "@/lib/prompts/utils";

interface CreatePromptInput {
  name: string;
  content: string;
  tags?: string[];
}

interface ForkPromptInput {
  originalPromptId: string;
  originalVersionId: string;
  newName: string;
  forkReason?: string;
}

interface CreateVersionInput {
  promptId: string;
  content: string;
  changelog?: string;
}

interface SetTaskSystemPromptInput {
  taskId: string;
  promptId: string | null;
  versionId: string | null;
}

export const usePromptMutations = () => {
  const createPrompt = useCallback(
    async ({
      name,
      content,
      tags = [],
    }: CreatePromptInput) => {
      const promptId = id();
      const versionId = id();

      // Single transaction for prompt + initial version
      await db.transact([
        db.tx.prompts[promptId].update({
          name,
          slug: slugify(name),
          tags,
          isActive: true,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),

        db.tx.promptVersions[versionId]
          .update({
            version: 1,
            content,
            isLatest: true,
            isDraft: false,
            tokenCount: estimateTokens(content),
            createdAt: new Date(),
          })
          .link({ prompt: promptId }),
      ]);

      return { promptId, versionId };
    },
    []
  );

  const forkPrompt = useCallback(
    async ({
      originalPromptId,
      originalVersionId,
      newName,
      forkReason,
    }: ForkPromptInput) => {
      // Get original version content
      const { data } = await db.queryOnce({
        promptVersions: {
          $: { where: { id: originalVersionId } },
        },
        prompts: {
          $: { where: { id: originalPromptId } },
        },
      });

      const originalVersion = data?.promptVersions?.[0];
      const originalPrompt = data?.prompts?.[0];
      if (!originalVersion || !originalPrompt) {
        throw new Error("Original prompt or version not found");
      }

      const newPromptId = id();
      const newVersionId = id();
      const forkId = id();

      // Create fork with lineage tracking
      await db.transact([
        // New prompt
        db.tx.prompts[newPromptId].update({
          name: newName,
          slug: slugify(newName),
          tags: originalPrompt.tags,
          isActive: true,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),

        // New version (copy of original)
        db.tx.promptVersions[newVersionId]
          .update({
            version: 1,
            content: originalVersion.content,
            isLatest: true,
            isDraft: false,
            tokenCount: originalVersion.tokenCount,
            variables: originalVersion.variables,
            models: originalVersion.models,
            createdAt: new Date(),
          })
          .link({
            prompt: newPromptId,
            forkedFrom: originalVersionId,
          }),

        // Fork lineage record
        db.tx.promptForks[forkId]
          .update({
            forkReason,
            createdAt: new Date(),
          })
          .link({
            originalPrompt: originalPromptId,
            originalVersion: originalVersionId,
            newPrompt: newPromptId,
          }),
      ]);

      return { promptId: newPromptId, versionId: newVersionId };
    },
    []
  );

  const createVersion = useCallback(
    async ({ promptId, content, changelog }: CreateVersionInput) => {
      // Get current latest version
      const { data } = await db.queryOnce({
        prompts: {
          $: { where: { id: promptId } },
          versions: {
            $: { where: { isLatest: true } },
          },
        },
      });

      const prompt = data?.prompts?.[0];
      const latestVersion = prompt?.versions?.[0];
      if (!prompt) {
        throw new Error("Prompt not found");
      }

      const newVersionId = id();
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      const transactions = [];

      // Mark old version as not latest if it exists
      if (latestVersion) {
        transactions.push(
          db.tx.promptVersions[latestVersion.id].update({
            isLatest: false,
          })
        );
      }

      // Create new version
      transactions.push(
        db.tx.promptVersions[newVersionId]
          .update({
            version: newVersionNumber,
            content,
            changelog,
            isLatest: true,
            isDraft: false,
            tokenCount: estimateTokens(content),
            createdAt: new Date(),
          })
          .link({
            prompt: promptId,
          })
      );

      // Update prompt's updatedAt
      transactions.push(
        db.tx.prompts[promptId].update({
          updatedAt: new Date(),
        })
      );

      await db.transact(transactions);

      return { versionId: newVersionId, version: newVersionNumber };
    },
    []
  );

  const updatePrompt = useCallback(
    async (
      promptId: string,
      updates: Partial<{
        name: string;
        tags: string[];
        isActive: boolean;
        isDefault: boolean;
      }>
    ) => {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };

      if (updates.name) {
        updateData.slug = slugify(updates.name);
      }

      await db.transact([db.tx.prompts[promptId].update(updateData)]);

      return { promptId };
    },
    []
  );

  const deletePrompt = useCallback(async (promptId: string) => {
    // Soft delete by marking as inactive
    await db.transact([
      db.tx.prompts[promptId].update({
        isActive: false,
        updatedAt: new Date(),
      }),
    ]);

    return { promptId };
  }, []);

  const setTaskSystemPrompt = useCallback(
    async ({ taskId, promptId, versionId }: SetTaskSystemPromptInput) => {
      // Check if task already has a system prompt
      const { data } = await db.queryOnce({
        tasks: {
          $: { where: { id: taskId } },
          systemPrompt: {},
        },
      });

      const task = data?.tasks?.[0];
      if (task?.systemPrompt) {
        throw new Error("Task already has a system prompt set");
      }

      // Set the system prompt
      if (promptId && versionId) {
        await db.transact([
          db.tx.tasks[taskId].link({
            systemPrompt: promptId,
            systemPromptVersion: versionId,
          }),
        ]);
      }

      return { taskId, promptId, versionId };
    },
    []
  );

  const saveDraft = useCallback(
    async (promptId: string, content: string) => {
      // Find or create a draft version
      const { data } = await db.queryOnce({
        prompts: {
          $: { where: { id: promptId } },
          versions: {
            $: { where: { isDraft: true } },
          },
        },
      });

      const prompt = data?.prompts?.[0];
      let draftVersion = prompt?.versions?.[0];

      if (draftVersion) {
        // Update existing draft
        await db.transact([
          db.tx.promptVersions[draftVersion.id].update({
            content,
            tokenCount: estimateTokens(content),
            updatedAt: new Date(),
          }),
        ]);
      } else {
        // Create new draft
        const draftId = id();
        const latestVersion = prompt?.versions?.find((v: any) => v.isLatest);
        const version = latestVersion ? latestVersion.version + 0.1 : 0.1;

        await db.transact([
          db.tx.promptVersions[draftId]
            .update({
              version,
              content,
              isLatest: false,
              isDraft: true,
              tokenCount: estimateTokens(content),
              createdAt: new Date(),
            })
            .link({ prompt: promptId }),
        ]);

        draftVersion = { id: draftId };
      }

      return { draftId: draftVersion.id };
    },
    []
  );

  const publishDraft = useCallback(
    async (draftId: string, changelog?: string) => {
      // Get draft version
      const { data } = await db.queryOnce({
        promptVersions: {
          $: { where: { id: draftId } },
          prompt: {
            versions: {
              $: { where: { isLatest: true } },
            },
          },
        },
      });

      const draftVersion = data?.promptVersions?.[0];
      if (!draftVersion || !draftVersion.isDraft) {
        throw new Error("Draft version not found");
      }

      const prompt = draftVersion.prompt;
      const latestVersion = prompt?.versions?.[0];
      const newVersion = latestVersion ? latestVersion.version + 1 : 1;

      const transactions = [];

      // Mark old latest as not latest
      if (latestVersion) {
        transactions.push(
          db.tx.promptVersions[latestVersion.id].update({
            isLatest: false,
          })
        );
      }

      // Convert draft to published version
      transactions.push(
        db.tx.promptVersions[draftId].update({
          version: newVersion,
          changelog,
          isLatest: true,
          isDraft: false,
          updatedAt: new Date(),
        })
      );

      // Update prompt
      transactions.push(
        db.tx.prompts[prompt.id].update({
          updatedAt: new Date(),
        })
      );

      await db.transact(transactions);

      return { versionId: draftId, version: newVersion };
    },
    []
  );

  const setDefaultPrompt = useCallback(async (promptId: string) => {
    // First, unset any existing default
    const { data } = await db.queryOnce({
      prompts: {
        $: { where: { isDefault: true } },
      },
    });

    const transactions = [];

    // Unset existing defaults
    const existingDefaults = data?.prompts || [];
    for (const prompt of existingDefaults) {
      transactions.push(
        db.tx.prompts[prompt.id].update({
          isDefault: false,
        })
      );
    }

    // Set new default
    transactions.push(
      db.tx.prompts[promptId].update({
        isDefault: true,
        updatedAt: new Date(),
      })
    );

    await db.transact(transactions);

    return { promptId };
  }, []);

  const renamePrompt = useCallback(
    async (promptId: string, newName: string) => {
      if (!newName || newName.trim().length === 0) {
        throw new Error("Prompt name cannot be empty");
      }

      // Generate slug from name
      const newSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check if slug already exists
      const { data } = await db.queryOnce({
        prompts: {
          $: { where: { slug: newSlug } },
        },
      });

      if (data?.prompts?.length && data.prompts[0].id !== promptId) {
        throw new Error("A prompt with this name already exists");
      }

      // Update the prompt
      await db.transact([
        db.tx.prompts[promptId].update({
          name: newName.trim(),
          slug: newSlug,
          updatedAt: new Date(),
        }),
      ]);

      return { promptId, name: newName.trim(), slug: newSlug };
    },
    []
  );

  return {
    createPrompt,
    forkPrompt,
    createVersion,
    updatePrompt,
    deletePrompt,
    setTaskSystemPrompt,
    saveDraft,
    publishDraft,
    setDefaultPrompt,
    renamePrompt,
  };
};