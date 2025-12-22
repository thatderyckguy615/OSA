/**
 * Unit tests for scoring engine
 * Tests all required cases from PRD Section 7.8
 */
import { describe, it, expect } from 'vitest';
import {
  scoreResponse,
  calculateSubscale,
  calculateDimensionComposite,
  calculateStrength,
  calculateAllScores,
  type Question,
  type Dimension,
  type Subscale,
} from '@/lib/scoring/engine';

/**
 * Helper: Create 36 mock questions matching canonical structure
 * 3 dimensions × 3 subscales × 4 questions each = 36 total
 */
function createMockQuestions(reversePattern?: Record<number, boolean>): Question[] {
  const questions: Question[] = [];
  const dimensions: Dimension[] = ['alignment', 'execution', 'accountability'];
  const subscales: Subscale[] = ['pd', 'cs', 'ob'];
  
  let questionId = 1;
  
  for (const dimension of dimensions) {
    for (const subscale of subscales) {
      for (let i = 0; i < 4; i++) {
        questions.push({
          question_id: questionId,
          dimension,
          subscale,
          is_reversed: reversePattern?.[questionId] ?? false,
        });
        questionId++;
      }
    }
  }
  
  return questions;
}

/**
 * Helper: Create responses object with all same value
 */
function createAllSameResponses(value: number): Record<number, number> {
  const responses: Record<number, number> = {};
  for (let i = 1; i <= 36; i++) {
    responses[i] = value;
  }
  return responses;
}

describe('Scoring Engine', () => {
  describe('scoreResponse', () => {
    it('should return original value for normal questions', () => {
      expect(scoreResponse(1, false)).toBe(1);
      expect(scoreResponse(3, false)).toBe(3);
      expect(scoreResponse(5, false)).toBe(5);
    });

    it('should reverse score for reversed questions', () => {
      expect(scoreResponse(1, true)).toBe(5); // 6 - 1 = 5
      expect(scoreResponse(2, true)).toBe(4); // 6 - 2 = 4
      expect(scoreResponse(3, true)).toBe(3); // 6 - 3 = 3
      expect(scoreResponse(4, true)).toBe(2); // 6 - 4 = 2
      expect(scoreResponse(5, true)).toBe(1); // 6 - 5 = 1
    });
  });

  describe('calculateSubscale', () => {
    it('should return 0 for all 1s', () => {
      // mean = 1, score = ((1 - 1) / 4) * 100 = 0
      expect(calculateSubscale([1, 1, 1, 1])).toBe(0);
    });

    it('should return 100 for all 5s', () => {
      // mean = 5, score = ((5 - 1) / 4) * 100 = 100
      expect(calculateSubscale([5, 5, 5, 5])).toBe(100);
    });

    it('should return 50 for all 3s', () => {
      // mean = 3, score = ((3 - 1) / 4) * 100 = 50
      expect(calculateSubscale([3, 3, 3, 3])).toBe(50);
    });

    it('should round to nearest integer', () => {
      // mean = 2.75, score = ((2.75 - 1) / 4) * 100 = 43.75 → 44
      expect(calculateSubscale([2, 3, 3, 3])).toBe(44);
    });
  });

  describe('calculateDimensionComposite', () => {
    it('should apply correct weights: OB 55%, CS 28%, PD 17%', () => {
      // Test with distinct values to verify weights
      const result = calculateDimensionComposite(100, 50, 0);
      // (0.55 * 0) + (0.28 * 50) + (0.17 * 100) = 0 + 14 + 17 = 31
      expect(result).toBe(31);
    });

    it('should return 0 for all subscales at 0', () => {
      expect(calculateDimensionComposite(0, 0, 0)).toBe(0);
    });

    it('should return 100 for all subscales at 100', () => {
      expect(calculateDimensionComposite(100, 100, 100)).toBeCloseTo(100, 10);
    });

    it('should return 50 for all subscales at 50', () => {
      // (0.55 * 50) + (0.28 * 50) + (0.17 * 50) = 27.5 + 14 + 8.5 = 50
      expect(calculateDimensionComposite(50, 50, 50)).toBeCloseTo(50, 10);
    });
  });

  describe('calculateStrength', () => {
    it('should return 1.0 for composite 0', () => {
      // 1 + (0 / 100) * 9 = 1.0
      expect(calculateStrength(0)).toBe(1.0);
    });

    it('should return 10.0 for composite 100', () => {
      // 1 + (100 / 100) * 9 = 10.0
      expect(calculateStrength(100)).toBe(10.0);
    });

    it('should return 5.5 for composite 50', () => {
      // 1 + (50 / 100) * 9 = 1 + 4.5 = 5.5
      expect(calculateStrength(50)).toBe(5.5);
    });

    it('should round to 1 decimal place', () => {
      // composite 31 → 1 + (31 / 100) * 9 = 1 + 2.79 = 3.79 → 3.8
      expect(calculateStrength(31)).toBe(3.8);
    });
  });

  describe('calculateAllScores - Required Test Cases (PRD 7.8)', () => {
    it('Test Case 1: All 1s (normal items) → strength ≈ 1.0', () => {
      const questions = createMockQuestions(); // All is_reversed = false
      const responses = createAllSameResponses(1);
      
      const result = calculateAllScores(responses, questions);
      
      // All responses are 1 → subscales are 0 → composite is 0 → strength is 1.0
      expect(result.alignment.strength).toBe(1.0);
      expect(result.execution.strength).toBe(1.0);
      expect(result.accountability.strength).toBe(1.0);
      
      // Verify subscales
      expect(result.alignment.pd).toBe(0);
      expect(result.alignment.cs).toBe(0);
      expect(result.alignment.ob).toBe(0);
    });

    it('Test Case 2: All 5s (normal items) → strength = 10.0', () => {
      const questions = createMockQuestions(); // All is_reversed = false
      const responses = createAllSameResponses(5);
      
      const result = calculateAllScores(responses, questions);
      
      // All responses are 5 → subscales are 100 → composite is 100 → strength is 10.0
      expect(result.alignment.strength).toBe(10.0);
      expect(result.execution.strength).toBe(10.0);
      expect(result.accountability.strength).toBe(10.0);
      
      // Verify subscales
      expect(result.alignment.pd).toBe(100);
      expect(result.alignment.cs).toBe(100);
      expect(result.alignment.ob).toBe(100);
    });

    it('Test Case 3: All 3s → strength = 5.5', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      const result = calculateAllScores(responses, questions);
      
      // All responses are 3 → subscales are 50 → composite is 50 → strength is 5.5
      expect(result.alignment.strength).toBe(5.5);
      expect(result.execution.strength).toBe(5.5);
      expect(result.accountability.strength).toBe(5.5);
      
      // Verify subscales
      expect(result.alignment.pd).toBe(50);
      expect(result.alignment.cs).toBe(50);
      expect(result.alignment.ob).toBe(50);
    });

    it('Test Case 4: Mixed reverse-coded pattern → correct inversion', () => {
      // Create pattern with some reversed questions
      // Let's reverse questions 3, 6, 10, 14, 15, 19, 23, 26, 28, 31, 34
      const reversePattern: Record<number, boolean> = {
        3: true, 6: true, 10: true, 14: true, 15: true, 19: true,
        23: true, 26: true, 28: true, 31: true, 34: true,
      };
      
      const questions = createMockQuestions(reversePattern);
      
      // Give all responses value of 5
      const responses = createAllSameResponses(5);
      
      const result = calculateAllScores(responses, questions);
      
      // For reversed questions: response 5 → scored as 1
      // For normal questions: response 5 → scored as 5
      // This creates a mix, so subscales will vary
      
      // Verify that scoring occurred (strength should not be 10.0 due to reversals)
      expect(result.alignment.strength).not.toBe(10.0);
      expect(result.execution.strength).not.toBe(10.0);
      expect(result.accountability.strength).not.toBe(10.0);
      
      // Verify specific calculation for alignment dimension
      // Alignment questions 1-12:
      // - Q3 is reversed (subscale pd, position 3)
      // - Q6 is reversed (subscale cs, position 2)
      // - Q10 is reversed (subscale ob, position 2)
      // 
      // PD (Q1-4): [5, 5, 1, 5] → mean 4, subscale 75
      // CS (Q5-8): [5, 1, 5, 5] → mean 4, subscale 75
      // OB (Q9-12): [5, 1, 5, 5] → mean 4, subscale 75
      expect(result.alignment.pd).toBe(75);
      expect(result.alignment.cs).toBe(75);
      expect(result.alignment.ob).toBe(75);
      expect(result.alignment.composite).toBe(75);
      expect(result.alignment.strength).toBe(7.8);
    });

    it('Test Case 5: Validation - missing question (35 responses) → throws error', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      // Remove one response
      delete responses[36];
      
      expect(() => {
        calculateAllScores(responses, questions);
      }).toThrow('Expected exactly 36 responses, got 35');
    });

    it('Test Case 6a: Validation - out-of-range value (0) → throws error', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      // Set one response to 0 (out of range)
      responses[1] = 0;
      
      expect(() => {
        calculateAllScores(responses, questions);
      }).toThrow('Response value for question 1 must be an integer between 1 and 5');
    });

    it('Test Case 6b: Validation - out-of-range value (6) → throws error', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      // Set one response to 6 (out of range)
      responses[20] = 6;
      
      expect(() => {
        calculateAllScores(responses, questions);
      }).toThrow('Response value for question 20 must be an integer between 1 and 5');
    });

    it('should validate that all question_ids in responses match questions array', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      // Add invalid question_id
      responses[99] = 3;
      
      expect(() => {
        calculateAllScores(responses, questions);
      }).toThrow('Expected exactly 36 responses, got 37');
    });

    it('should throw error if response is missing for a question', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(3);
      
      // Remove a specific question's response and replace with different id
      delete responses[10];
      responses[50] = 3;
      
      expect(() => {
        calculateAllScores(responses, questions);
      }).toThrow('Response contains invalid question_id: 50');
    });
  });

  describe('calculateAllScores - Integration', () => {
    it('should correctly calculate all dimension results', () => {
      const questions = createMockQuestions();
      const responses = createAllSameResponses(4);
      
      const result = calculateAllScores(responses, questions);
      
      // All responses are 4 → mean 4 → subscale 75 → composite 75 → strength 7.8
      expect(result.alignment.pd).toBe(75);
      expect(result.alignment.cs).toBe(75);
      expect(result.alignment.ob).toBe(75);
      expect(result.alignment.composite).toBe(75);
      expect(result.alignment.strength).toBe(7.8);
      
      expect(result.execution.pd).toBe(75);
      expect(result.execution.cs).toBe(75);
      expect(result.execution.ob).toBe(75);
      expect(result.execution.composite).toBe(75);
      expect(result.execution.strength).toBe(7.8);
      
      expect(result.accountability.pd).toBe(75);
      expect(result.accountability.cs).toBe(75);
      expect(result.accountability.ob).toBe(75);
      expect(result.accountability.composite).toBe(75);
      expect(result.accountability.strength).toBe(7.8);
    });
  });
});

