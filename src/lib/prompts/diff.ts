import { createTwoFilesPatch } from 'diff';

export interface DiffResult {
  patch: string;
  additions: number;
  deletions: number;
  hasChanges: boolean;
}

/**
 * Calculate the diff between two prompt versions
 */
export function calculateDiff(
  oldContent: string,
  newContent: string,
  oldVersion: string = 'v1',
  newVersion: string = 'v2'
): DiffResult {
  // Create a unified diff patch
  const patch = createTwoFilesPatch(
    `prompt-${oldVersion}`,
    `prompt-${newVersion}`,
    oldContent,
    newContent,
    'Old Version',
    'New Version',
    { context: 3 }
  );

  // Count additions and deletions
  let additions = 0;
  let deletions = 0;
  
  const lines = patch.split('\n');
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return {
    patch,
    additions,
    deletions,
    hasChanges: additions > 0 || deletions > 0
  };
}

/**
 * Format a diff for display with color coding
 */
export function formatDiffForDisplay(patch: string): string {
  const lines = patch.split('\n');
  const formatted = lines.map(line => {
    if (line.startsWith('+++') || line.startsWith('---')) {
      return `<span class="font-bold">${escapeHtml(line)}</span>`;
    } else if (line.startsWith('+')) {
      return `<span class="text-green-600 bg-green-50">${escapeHtml(line)}</span>`;
    } else if (line.startsWith('-')) {
      return `<span class="text-red-600 bg-red-50">${escapeHtml(line)}</span>`;
    } else if (line.startsWith('@@')) {
      return `<span class="text-blue-600 font-medium">${escapeHtml(line)}</span>`;
    }
    return escapeHtml(line);
  });
  
  return formatted.join('\n');
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}