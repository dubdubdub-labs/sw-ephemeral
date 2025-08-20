import * as React from "react";
import { db } from "@/lib/instant/client";
import { resolvePromptVariables } from "@/lib/prompt-variables";

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
          prompts: {
            versions: {
              $: { where: { isLatest: true } },
            },
          },
        }
      : null
  );

  const task = data?.tasks?.[0];
  const systemPrompt = task?.systemPrompt;
  const systemPromptVersion =
    task?.systemPromptVersion || systemPrompt?.versions?.[0];
  const allPrompts = data?.prompts || [];

  // Create a function to get prompt content by name or slug
  const getPromptContent = async (nameOrSlug: string): Promise<string | null> => {
    const prompt = allPrompts.find((p: any) => 
      p.name === nameOrSlug || p.slug === nameOrSlug
    );
    
    if (prompt) {
      // Get the latest version of the prompt
      const latestVersion = prompt.versions?.find((v: any) => v.isLatest);
      return latestVersion?.content || null;
    }
    
    return null;
  };

  // Resolve variables in the prompt content
  const [resolvedContent, setResolvedContent] = React.useState<string | undefined>(undefined);
  const [isResolving, setIsResolving] = React.useState(false);

  React.useEffect(() => {
    if (systemPromptVersion?.content && !isResolving) {
      setIsResolving(true);
      resolvePromptVariables(systemPromptVersion.content, getPromptContent)
        .then(resolved => {
          setResolvedContent(resolved);
          setIsResolving(false);
        })
        .catch(err => {
          console.error('Failed to resolve prompt variables:', err);
          setResolvedContent(systemPromptVersion.content);
          setIsResolving(false);
        });
    }
  }, [systemPromptVersion?.content, allPrompts]);

  return {
    systemPrompt,
    systemPromptVersion,
    promptContent: resolvedContent || systemPromptVersion?.content,
    hasSystemPrompt: !!systemPrompt,
    isLoading: isLoading || isResolving,
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