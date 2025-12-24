import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateShuffledQuestions } from '@/lib/randomization/shuffle';

interface TestQuestion {
  question_order: number;
  question_text: string;
}

describe('Deterministic question shuffling', () => {
  const originalEnv = process.env.RANDOMIZATION_SECRET;

  beforeEach(() => {
    // Set test secret to avoid requiring real .env.local
    process.env.RANDOMIZATION_SECRET = 'test-randomization-secret-for-unit-tests';
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.RANDOMIZATION_SECRET = originalEnv;
    } else {
      delete process.env.RANDOMIZATION_SECRET;
    }
  });

  const createTestQuestions = (count: number): TestQuestion[] => {
    return Array.from({ length: count }, (_, i) => ({
      question_order: i + 1,
      question_text: `Question ${i + 1}`,
    }));
  };

  describe('Deterministic shuffling', () => {
    it('should generate the same order for the same memberId', () => {
      const questions = createTestQuestions(36);
      const memberId = 'member-123';
      
      const shuffled1 = generateShuffledQuestions(memberId, questions);
      const shuffled2 = generateShuffledQuestions(memberId, questions);
      
      // Should be identical
      expect(shuffled1).toEqual(shuffled2);
      
      // Verify each question matches position by position
      for (let i = 0; i < shuffled1.length; i++) {
        expect(shuffled1[i].question_order).toBe(shuffled2[i].question_order);
        expect(shuffled1[i].question_text).toBe(shuffled2[i].question_text);
      }
    });

    it('should generate different orders for different memberIds', () => {
      const questions = createTestQuestions(36);
      
      const shuffled1 = generateShuffledQuestions('member-123', questions);
      const shuffled2 = generateShuffledQuestions('member-456', questions);
      
      // Should be different (extremely unlikely to be the same by chance)
      expect(shuffled1).not.toEqual(shuffled2);
      
      // Verify they actually differ
      let differenceCount = 0;
      for (let i = 0; i < shuffled1.length; i++) {
        if (shuffled1[i].question_order !== shuffled2[i].question_order) {
          differenceCount++;
        }
      }
      
      // Should have significant differences (at least a few positions differ)
      expect(differenceCount).toBeGreaterThan(5);
    });

    it('should preserve all questions (no duplicates or missing)', () => {
      const questions = createTestQuestions(36);
      const memberId = 'member-test';
      
      const shuffled = generateShuffledQuestions(memberId, questions);
      
      // Should have same length
      expect(shuffled.length).toBe(questions.length);
      
      // Should contain all question_orders exactly once
      const originalOrders = questions.map(q => q.question_order).sort((a, b) => a - b);
      const shuffledOrders = shuffled.map(q => q.question_order).sort((a, b) => a - b);
      
      expect(shuffledOrders).toEqual(originalOrders);
    });

    it('should actually shuffle (not return original order)', () => {
      const questions = createTestQuestions(36);
      const memberId = 'member-abc';
      
      const shuffled = generateShuffledQuestions(memberId, questions);
      
      // Check if order changed
      let samePositionCount = 0;
      for (let i = 0; i < shuffled.length; i++) {
        if (shuffled[i].question_order === questions[i].question_order) {
          samePositionCount++;
        }
      }
      
      // Should have some positions changed (statistically very unlikely all stay the same)
      // With 36 items, expect most positions to change
      expect(samePositionCount).toBeLessThan(shuffled.length);
    });

    it('should work with different array sizes', () => {
      const memberId = 'member-test';
      
      // Test with 10 questions
      const questions10 = createTestQuestions(10);
      const shuffled10 = generateShuffledQuestions(memberId, questions10);
      expect(shuffled10.length).toBe(10);
      expect(shuffled10.map(q => q.question_order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      
      // Test with 50 questions
      const questions50 = createTestQuestions(50);
      const shuffled50 = generateShuffledQuestions(memberId, questions50);
      expect(shuffled50.length).toBe(50);
    });

    it('should be deterministic across multiple calls', () => {
      const questions = createTestQuestions(36);
      const memberId = 'member-deterministic-test';
      
      // Generate 5 times
      const results = Array.from({ length: 5 }, () =>
        generateShuffledQuestions(memberId, questions)
      );
      
      // All should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });

  describe('Secret dependency', () => {
    it('should throw error when RANDOMIZATION_SECRET is missing', () => {
      delete process.env.RANDOMIZATION_SECRET;
      
      const questions = createTestQuestions(36);
      
      expect(() => {
        generateShuffledQuestions('member-123', questions);
      }).toThrow(/RANDOMIZATION_SECRET/);
    });

    it('should throw error when RANDOMIZATION_SECRET is empty', () => {
      process.env.RANDOMIZATION_SECRET = '';
      
      const questions = createTestQuestions(36);
      
      expect(() => {
        generateShuffledQuestions('member-123', questions);
      }).toThrow(/RANDOMIZATION_SECRET/);
    });

    it('should throw error when RANDOMIZATION_SECRET is only whitespace', () => {
      process.env.RANDOMIZATION_SECRET = '   ';
      
      const questions = createTestQuestions(36);
      
      expect(() => {
        generateShuffledQuestions('member-123', questions);
      }).toThrow(/RANDOMIZATION_SECRET/);
    });

    it('should generate different shuffles with different secrets', () => {
      const questions = createTestQuestions(36);
      const memberId = 'member-123';
      
      process.env.RANDOMIZATION_SECRET = 'secret-A';
      const shuffledA = generateShuffledQuestions(memberId, questions);
      
      process.env.RANDOMIZATION_SECRET = 'secret-B';
      const shuffledB = generateShuffledQuestions(memberId, questions);
      
      // Different secrets should produce different shuffles for same memberId
      expect(shuffledA).not.toEqual(shuffledB);
    });
  });

  describe('Edge cases', () => {
    it('should handle single question', () => {
      const questions = createTestQuestions(1);
      const memberId = 'member-single';
      
      const shuffled = generateShuffledQuestions(memberId, questions);
      
      expect(shuffled.length).toBe(1);
      expect(shuffled[0].question_order).toBe(1);
    });

    it('should handle two questions', () => {
      const questions = createTestQuestions(2);
      const memberId = 'member-two';
      
      const shuffled = generateShuffledQuestions(memberId, questions);
      
      expect(shuffled.length).toBe(2);
      const orders = shuffled.map(q => q.question_order).sort();
      expect(orders).toEqual([1, 2]);
    });

    it('should handle empty memberId string (edge case)', () => {
      const questions = createTestQuestions(10);
      const memberId = '';
      
      // Should not throw, just produce deterministic result
      const shuffled1 = generateShuffledQuestions(memberId, questions);
      const shuffled2 = generateShuffledQuestions(memberId, questions);
      
      expect(shuffled1).toEqual(shuffled2);
    });

    it('should handle UUID-format memberIds', () => {
      const questions = createTestQuestions(36);
      const memberId = '550e8400-e29b-41d4-a716-446655440000';
      
      const shuffled = generateShuffledQuestions(memberId, questions);
      
      expect(shuffled.length).toBe(36);
      // Should be deterministic
      const shuffled2 = generateShuffledQuestions(memberId, questions);
      expect(shuffled).toEqual(shuffled2);
    });
  });

  describe('Statistical properties', () => {
    it('should produce different shuffles for sequential memberIds', () => {
      const questions = createTestQuestions(36);
      
      // Generate shuffles for 5 sequential member IDs
      const shuffles = [
        generateShuffledQuestions('member-1', questions),
        generateShuffledQuestions('member-2', questions),
        generateShuffledQuestions('member-3', questions),
        generateShuffledQuestions('member-4', questions),
        generateShuffledQuestions('member-5', questions),
      ];
      
      // Each should be unique
      for (let i = 0; i < shuffles.length; i++) {
        for (let j = i + 1; j < shuffles.length; j++) {
          expect(shuffles[i]).not.toEqual(shuffles[j]);
        }
      }
    });

    it('should distribute questions across positions', () => {
      const questions = createTestQuestions(36);
      
      // Generate multiple shuffles for different members
      const shuffles = Array.from({ length: 10 }, (_, i) =>
        generateShuffledQuestions(`member-${i}`, questions)
      );
      
      // Track where question 1 appears across shuffles
      const question1Positions = shuffles.map(s =>
        s.findIndex(q => q.question_order === 1)
      );
      
      // Should not always be in the same position
      const uniquePositions = new Set(question1Positions);
      expect(uniquePositions.size).toBeGreaterThan(3);
    });
  });

  describe('Integration scenario', () => {
    it('should simulate real assessment workflow', () => {
      // Simulate 36 questions like in the real app
      const questions = createTestQuestions(36);
      
      // Three team members
      const member1Id = '123e4567-e89b-12d3-a456-426614174000';
      const member2Id = '223e4567-e89b-12d3-a456-426614174001';
      const member3Id = '323e4567-e89b-12d3-a456-426614174002';
      
      // Each gets their own deterministic shuffle
      const shuffle1 = generateShuffledQuestions(member1Id, questions);
      const shuffle2 = generateShuffledQuestions(member2Id, questions);
      const shuffle3 = generateShuffledQuestions(member3Id, questions);
      
      // Each shuffle is different
      expect(shuffle1).not.toEqual(shuffle2);
      expect(shuffle1).not.toEqual(shuffle3);
      expect(shuffle2).not.toEqual(shuffle3);
      
      // But each member gets the same shuffle every time
      expect(generateShuffledQuestions(member1Id, questions)).toEqual(shuffle1);
      expect(generateShuffledQuestions(member2Id, questions)).toEqual(shuffle2);
      expect(generateShuffledQuestions(member3Id, questions)).toEqual(shuffle3);
      
      // All members get all 36 questions
      expect(shuffle1.length).toBe(36);
      expect(shuffle2.length).toBe(36);
      expect(shuffle3.length).toBe(36);
    });
  });
});

