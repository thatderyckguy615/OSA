/**
 * Scoring Engine for Operating Strengths Assessment
 * Implements the canonical scoring algorithm from PRD Section 7
 */

export type Dimension = 'alignment' | 'execution' | 'accountability';
export type Subscale = 'pd' | 'cs' | 'ob';

export interface DimensionResult {
  pd: number;        // 0-100 integer
  cs: number;        // 0-100 integer
  ob: number;        // 0-100 integer
  composite: number; // 0-100 float
  strength: number;  // 1.0-10.0, 1 decimal
}

export interface Question {
  question_id: number;
  dimension: Dimension;
  subscale: Subscale;
  is_reversed: boolean;
}

/**
 * Score a single response, applying reverse coding if needed.
 * PRD Section 7.2
 * 
 * @param responseValue - Raw response value (1-5)
 * @param isReversed - Whether the question is reverse-coded
 * @returns Scored value (1-5)
 */
export function scoreResponse(responseValue: number, isReversed: boolean): number {
  return isReversed ? (6 - responseValue) : responseValue;
}

/**
 * Calculate subscale score from 4 scored responses.
 * PRD Section 7.3
 * 
 * @param scored - Array of 4 scored response values
 * @returns Subscale score (0-100 integer)
 */
export function calculateSubscale(scored: number[]): number {
  const mean = scored.reduce((a, b) => a + b, 0) / 4;
  const score0to100 = ((mean - 1) / 4) * 100;
  return Math.round(score0to100);
}

/**
 * Calculate dimension composite score from subscale scores.
 * PRD Section 7.4
 * Weights: OB 55%, CS 28%, PD 17%
 * 
 * @param pd - Personal Discipline subscale (0-100)
 * @param cs - Collective Systems subscale (0-100)
 * @param ob - Observable Behaviors subscale (0-100)
 * @returns Composite score (0-100 float)
 */
export function calculateDimensionComposite(pd: number, cs: number, ob: number): number {
  return (0.55 * ob) + (0.28 * cs) + (0.17 * pd);
}

/**
 * Calculate dimension strength from composite score.
 * PRD Section 7.5
 * 
 * @param composite - Composite score (0-100)
 * @returns Strength score (1.0-10.0, 1 decimal place)
 */
export function calculateStrength(composite: number): number {
  const strength = 1 + (composite / 100) * 9;
  return Math.round(strength * 10) / 10;
}

/**
 * Calculate all dimension scores from responses.
 * PRD Section 7.6
 * 
 * @param responses - Map of question_id to response value (1-5)
 * @param questions - Array of question metadata
 * @returns Scores for all three dimensions
 * @throws Error if validation fails
 */
export function calculateAllScores(
  responses: Record<number, number>,
  questions: Question[]
): Record<Dimension, DimensionResult> {
  // Validation: exactly 36 responses
  const responseKeys = Object.keys(responses);
  if (responseKeys.length !== 36) {
    throw new Error(`Expected exactly 36 responses, got ${responseKeys.length}`);
  }

  // Validation: all response values are 1-5
  for (const [qId, value] of Object.entries(responses)) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`Response value for question ${qId} must be an integer between 1 and 5, got ${value}`);
    }
  }

  // Validation: all question_ids in responses match questions array
  const questionIds = new Set(questions.map(q => q.question_id));
  for (const qIdStr of responseKeys) {
    const qId = parseInt(qIdStr, 10);
    if (!questionIds.has(qId)) {
      throw new Error(`Response contains invalid question_id: ${qId}`);
    }
  }

  // Group scored responses by dimension and subscale
  const grouped: Record<Dimension, Record<Subscale, number[]>> = {
    alignment: { pd: [], cs: [], ob: [] },
    execution: { pd: [], cs: [], ob: [] },
    accountability: { pd: [], cs: [], ob: [] }
  };

  for (const q of questions) {
    const raw = responses[q.question_id];
    if (raw === undefined) {
      throw new Error(`Missing response for question_id ${q.question_id}`);
    }
    const scored = scoreResponse(raw, q.is_reversed);
    grouped[q.dimension][q.subscale].push(scored);
  }

  // Calculate results for each dimension
  const result: Record<Dimension, DimensionResult> = {} as any;
  for (const dim of ['alignment', 'execution', 'accountability'] as Dimension[]) {
    const pd = calculateSubscale(grouped[dim].pd);
    const cs = calculateSubscale(grouped[dim].cs);
    const ob = calculateSubscale(grouped[dim].ob);
    const composite = calculateDimensionComposite(pd, cs, ob);
    const strength = calculateStrength(composite);
    result[dim] = { pd, cs, ob, composite, strength };
  }

  return result;
}

