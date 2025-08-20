/**
 * Parse prompt content to extract variable references
 * Variables are in the format {{promptName}}
 */
export function extractPromptVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim();
    if (varName) {
      variables.add(varName);
    }
  }
  
  return Array.from(variables);
}

/**
 * Resolve prompt variables in content by replacing them with actual prompt content
 * @param content The content with variables
 * @param promptsMap Map of prompt names/slugs to their content
 * @param maxDepth Maximum recursion depth to prevent infinite loops
 * @param visited Set of already visited prompts to detect circular references
 */
export async function resolvePromptVariables(
  content: string,
  getPromptContent: (nameOrSlug: string) => Promise<string | null>,
  maxDepth: number = 10,
  visited: Set<string> = new Set()
): Promise<string> {
  if (maxDepth <= 0) {
    console.warn('Maximum prompt variable resolution depth reached');
    return content;
  }
  
  const variables = extractPromptVariables(content);
  
  if (variables.length === 0) {
    return content;
  }
  
  let resolvedContent = content;
  
  for (const variable of variables) {
    // Check for circular references
    if (visited.has(variable)) {
      console.warn(`Circular reference detected for prompt variable: ${variable}`);
      continue;
    }
    
    const promptContent = await getPromptContent(variable);
    
    if (promptContent) {
      // Recursively resolve variables in the imported prompt
      const newVisited = new Set(visited);
      newVisited.add(variable);
      
      const resolvedPromptContent = await resolvePromptVariables(
        promptContent,
        getPromptContent,
        maxDepth - 1,
        newVisited
      );
      
      // Replace all occurrences of this variable
      const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(variable)}\\s*\\}\\}`, 'g');
      resolvedContent = resolvedContent.replace(regex, resolvedPromptContent);
    } else {
      console.warn(`Prompt variable not found: ${variable}`);
    }
  }
  
  return resolvedContent;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that prompt variables don't create circular dependencies
 */
export async function validatePromptVariables(
  promptName: string,
  content: string,
  getPromptContent: (nameOrSlug: string) => Promise<string | null>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const visited = new Set<string>([promptName]);
  
  async function checkVariables(content: string, currentPath: string[]): Promise<void> {
    const variables = extractPromptVariables(content);
    
    for (const variable of variables) {
      if (currentPath.includes(variable)) {
        errors.push(`Circular dependency detected: ${[...currentPath, variable].join(' -> ')}`);
        continue;
      }
      
      const promptContent = await getPromptContent(variable);
      if (!promptContent) {
        errors.push(`Prompt variable not found: ${variable}`);
        continue;
      }
      
      await checkVariables(promptContent, [...currentPath, variable]);
    }
  }
  
  await checkVariables(content, [promptName]);
  
  return {
    valid: errors.length === 0,
    errors
  };
}