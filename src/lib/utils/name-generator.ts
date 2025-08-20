// Random word lists for generating database names
const adjectives = [
  'swift', 'bright', 'calm', 'eager', 'fancy', 'gentle', 'happy', 'jolly',
  'kind', 'lively', 'merry', 'nice', 'proud', 'quick', 'smart', 'warm',
  'brave', 'clever', 'eager', 'fresh', 'grand', 'noble', 'quiet', 'rapid',
  'sharp', 'smooth', 'solid', 'steady', 'sunny', 'super', 'sweet', 'tough'
];

const colors = [
  'blue', 'green', 'red', 'yellow', 'purple', 'orange', 'pink', 'gray',
  'black', 'white', 'brown', 'cyan', 'gold', 'silver', 'violet', 'indigo',
  'coral', 'jade', 'ruby', 'amber', 'olive', 'navy', 'teal', 'beige',
  'cream', 'mint', 'sage', 'rose', 'pearl', 'azure', 'bronze', 'copper'
];

const nouns = [
  'river', 'mountain', 'cloud', 'ocean', 'forest', 'desert', 'valley', 'meadow',
  'star', 'moon', 'sun', 'comet', 'planet', 'galaxy', 'nebula', 'cosmos',
  'eagle', 'falcon', 'hawk', 'owl', 'raven', 'swan', 'phoenix', 'dragon',
  'wolf', 'tiger', 'lion', 'bear', 'fox', 'deer', 'whale', 'dolphin',
  'tree', 'flower', 'garden', 'bridge', 'tower', 'castle', 'temple', 'shrine'
];

/**
 * Generates a random three-word database name
 * Format: adjective-color-noun (e.g., "swift-blue-river")
 */
export function generateDatabaseName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}-${color}-${noun}`;
}

/**
 * Generates a unique database name with timestamp suffix if needed
 * This ensures uniqueness even if the same random combination is generated
 */
export function generateUniqueDatabaseName(): string {
  const baseName = generateDatabaseName();
  const timestamp = Date.now().toString(36).slice(-4); // Last 4 chars of base36 timestamp
  return `${baseName}-${timestamp}`;
}