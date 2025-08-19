import { useMemo } from "react";
import { db } from "@/lib/instant/client";
import { calculateDiff } from "@/lib/prompts/diff";

// Safe query wrapper using db.useQuery
function useSafeQuery(query: any) {
  const result = db.useQuery(query);
  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export const usePromptDiff = (versionId1?: string, versionId2?: string) => {
  const { data, isLoading, error } = useSafeQuery(
    versionId1 && versionId2
      ? {
          promptVersions: {
            $: {
              where: {
                id: { in: [versionId1, versionId2] },
              },
            },
          },
        }
      : null
  );

  const diff = useMemo(() => {
    if (!data?.promptVersions || data.promptVersions.length < 2) {
      return null;
    }

    const v1 = data.promptVersions.find((v: any) => v.id === versionId1);
    const v2 = data.promptVersions.find((v: any) => v.id === versionId2);

    if (!v1 || !v2) return null;

    return calculateDiff(
      v1.content || "",
      v2.content || "",
      `v${v1.version}`,
      `v${v2.version}`
    );
  }, [data, versionId1, versionId2]);

  return {
    diff,
    isLoading,
    error,
    version1: data?.promptVersions?.find((v: any) => v.id === versionId1),
    version2: data?.promptVersions?.find((v: any) => v.id === versionId2),
  };
};