import crypto from 'crypto';

/**
 * Deterministic question shuffling using sha256 seeding and mulberry32 PRNG.
 * 
 * **SECURITY WARNING: This function MUST only be used server-side.**
 * Never expose RANDOMIZATION_SECRET to the client.
 * 
 * @param memberId - The team member UUID
 * @param questions - Array of questions with question_order field
 * @returns Shuffled copy of questions array
 * @throws Error if RANDOMIZATION_SECRET is not configured
 */
export function generateShuffledQuestions<T extends { question_order: number }>(
  memberId: string,
  questions: T[]
): T[] {
  // Validate RANDOMIZATION_SECRET exists
  const secret = process.env.RANDOMIZATION_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('RANDOMIZATION_SECRET environment variable is required for question shuffling');
  }

  // 1. Generate seed: sha256(memberId:RANDOMIZATION_SECRET)
  const seedString = `${memberId}:${secret}`;
  const hash = crypto.createHash('sha256').update(seedString).digest('hex');
  
  // 2. Extract first 8 hex characters and parse as unsigned 32-bit integer
  const seedHex = hash.substring(0, 8);
  const seed = parseInt(seedHex, 16) >>> 0; // Force unsigned 32-bit

  // 3. Shuffle using mulberry32 PRNG and Fisher-Yates
  return shuffleWithSeed(questions, seed);
}

/**
 * mulberry32 PRNG implementation (canonical from PRD).
 * Returns a function that generates pseudo-random numbers in [0, 1).
 * 
 * @param seed - 32-bit unsigned integer seed
 * @returns Random number generator function
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using seeded PRNG.
 * 
 * @param array - Array to shuffle
 * @param seed - 32-bit unsigned integer seed
 * @returns Shuffled copy of the array
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

