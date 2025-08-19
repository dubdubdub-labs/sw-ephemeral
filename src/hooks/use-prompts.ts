import { db } from "@/lib/instant/client";

// Safe query wrapper using db.useQuery
function useSafeQuery(query: any) {
  const result = db.useQuery(query);
  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
  };
}

interface UsePromptsOptions {
  search?: string;
  limit?: number;
  onlyActive?: boolean;
}

export const usePrompts = (options?: UsePromptsOptions) => {
  const { search, limit = 50, onlyActive = true } = options || {};

  // Build where clause
  const where: any = {};
  if (onlyActive) {
    where.isActive = true;
  }

  const { data, isLoading, error } = useSafeQuery({
    prompts: {
      $: {
        where,
        limit,
      },
      versions: {
        $: { where: { isLatest: true } },
      },
    },
  });

  // Client-side search filtering
  let prompts = data?.prompts || [];
  if (search) {
    const searchLower = search.toLowerCase();
    prompts = prompts.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }

  return { 
    prompts, 
    isLoading, 
    error,
    count: prompts.length 
  };
};

export const usePromptDetails = (promptId: string | undefined) => {
  const { data, isLoading, error } = useSafeQuery(
    promptId
      ? {
          prompts: {
            $: { where: { id: promptId } },
            versions: {
              $: { order: { createdAt: "desc" } },
            },
            forkedFrom: {
              originalPrompt: {},
              originalVersion: {},
            },
          },
        }
      : null
  );

  const prompt = data?.prompts?.[0];
  const versions = prompt?.versions || [];
  const latestVersion = versions.find((v: any) => v.isLatest);
  const forkedFrom = prompt?.forkedFrom?.[0];

  return {
    prompt,
    versions,
    latestVersion,
    forkedFrom,
    isLoading,
    error,
  };
};

export const useTaskSystemPrompt = (taskId: string | undefined) => {
  const { data, isLoading, error } = useSafeQuery(
    taskId
      ? {
          tasks: {
            $: { where: { id: taskId } },
            systemPrompt: {
              versions: {
                $: { where: { isLatest: true } },
              },
            },
            systemPromptVersion: {},
          },
        }
      : null
  );

  const task = data?.tasks?.[0];
  const systemPrompt = task?.systemPrompt;
  const systemPromptVersion =
    task?.systemPromptVersion || systemPrompt?.versions?.[0];

  return {
    systemPrompt,
    systemPromptVersion,
    promptContent: systemPromptVersion?.content,
    hasSystemPrompt: !!systemPrompt,
    isLoading,
    error,
  };
};

export const usePromptBySlug = (slug: string | undefined) => {
  const { data, isLoading, error } = useSafeQuery(
    slug
      ? {
          prompts: {
            $: { where: { slug } },
            versions: {
              $: { where: { isLatest: true } },
            },
          },
        }
      : null
  );

  const prompt = data?.prompts?.[0];
  const latestVersion = prompt?.versions?.[0];

  return {
    prompt,
    latestVersion,
    content: latestVersion?.content,
    isLoading,
    error,
  };
};