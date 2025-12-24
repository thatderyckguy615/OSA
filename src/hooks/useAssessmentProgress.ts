"use client";

/**
 * Assessment Progress Hook
 * Per PRD Section 6.2.6 - Session Recovery
 *
 * Uses sessionStorage to persist progress within the same browser tab session.
 * - Survives page refresh
 * - Cleared on tab close (expected behavior)
 * - Keyed by memberId to avoid collisions across assessments
 *
 * IMPORTANT: memberId + questions often arrive async.
 * This hook must NOT read sessionStorage in the initial useState initializer
 * because memberId/questions may be empty on first render after refresh.
 */
import { useState, useEffect, useCallback, useMemo } from "react";

export interface Question {
  id: number; // question_order (canonical 1-36)
  text: string;
  dimension: string;
  position: number; // display order (1-36)
}

interface AssessmentState {
  responses: Record<number, number>; // questionId -> response value (1-5)
  currentIndex: number;
}

const STORAGE_KEY_PREFIX = "osa_responses:";

function getStorageKey(memberId: string): string {
  return `${STORAGE_KEY_PREFIX}${memberId}`;
}

function safeParseState(raw: string): AssessmentState | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.responses &&
      typeof parsed.responses === "object" &&
      typeof parsed.currentIndex === "number"
    ) {
      return {
        responses: parsed.responses as Record<number, number>,
        currentIndex: parsed.currentIndex as number,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearAssessmentStorage(memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(getStorageKey(memberId));
  } catch (error) {
    console.error("Failed to clear assessment progress:", error);
  }
}

export function useAssessmentProgress(memberId: string, questions: Question[]) {
  const questionCount = questions.length;

  // Important: do NOT load from sessionStorage here (memberId/questions may be empty initially)
  const [state, setState] = useState<AssessmentState>({
    responses: {},
    currentIndex: 0,
  });

  // Only create a storage key when we have a real memberId
  const storageKey = useMemo(() => {
    const trimmed = (memberId || "").trim();
    return trimmed ? getStorageKey(trimmed) : null;
  }, [memberId]);

  // Load from sessionStorage once memberId is available (and when memberId changes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storageKey) return;

    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;

    const saved = safeParseState(raw);
    if (!saved) return;

    setState((prev) => {
      // Merge: saved state wins, but clamp to current question list length (if loaded)
      const maxIndex = Math.max(0, questionCount - 1);
      const clampedIndex =
        questionCount > 0
          ? Math.min(Math.max(0, saved.currentIndex), maxIndex)
          : 0;

      // Avoid unnecessary state churn
      const sameIndex = prev.currentIndex === clampedIndex;
      const sameResponses =
        JSON.stringify(prev.responses) === JSON.stringify(saved.responses);

      if (sameIndex && sameResponses) return prev;

      return {
        responses: saved.responses ?? {},
        currentIndex: clampedIndex,
      };
    });
    // We intentionally include questionCount so we can clamp as soon as questions load
  }, [storageKey, questionCount]);

  // Persist to sessionStorage whenever state changes (after memberId exists)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storageKey) return;

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save assessment progress:", error);
    }
  }, [storageKey, state]);

  // Clamp currentIndex any time questions change (e.g., after fetch on refresh)
  useEffect(() => {
    if (questionCount <= 0) return;

    setState((prev) => {
      const maxIndex = questionCount - 1;
      const clamped = Math.min(Math.max(0, prev.currentIndex), maxIndex);
      if (clamped === prev.currentIndex) return prev;
      return { ...prev, currentIndex: clamped };
    });
  }, [questionCount]);

  // Set response
  const setResponse = useCallback((questionId: number, value: number) => {
    setState((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value,
      },
    }));
  }, []);

  // Navigate to next question
  const goToNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, Math.max(0, questionCount - 1)),
    }));
  }, [questionCount]);

  // Navigate to previous question
  const goToPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);

  // Go to specific index
  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0) return;
      if (questionCount <= 0) {
        setState((prev) => ({ ...prev, currentIndex: 0 }));
        return;
      }
      if (index >= questionCount) return;

      setState((prev) => ({
        ...prev,
        currentIndex: index,
      }));
    },
    [questionCount]
  );

  // Clear progress
  const clearProgress = useCallback(() => {
    setState({ responses: {}, currentIndex: 0 });
    if (storageKey) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.error("Failed to clear assessment progress:", error);
      }
    }
  }, [storageKey]);

  // Derived values
  const currentQuestion = questions[state.currentIndex] || null;
  const currentResponse = currentQuestion
    ? state.responses[currentQuestion.id]
    : undefined;

  const answeredCount = Object.keys(state.responses).length;
  const isComplete = questionCount > 0 && answeredCount === questionCount;

  const canGoNext =
    currentResponse !== undefined && state.currentIndex < questionCount - 1;
  const canGoPrevious = state.currentIndex > 0;

  const isLastQuestion = questionCount > 0 && state.currentIndex === questionCount - 1;
  const canSubmit = isComplete && isLastQuestion;

  return {
    // State
    responses: state.responses,
    currentIndex: state.currentIndex,
    currentQuestion,
    currentResponse,

    // Counts
    totalQuestions: questionCount,
    answeredCount,

    // Flags
    isComplete,
    canGoNext,
    canGoPrevious,
    isLastQuestion,
    canSubmit,

    // Actions
    setResponse,
    goToNext,
    goToPrevious,
    goToIndex,
    clearProgress,
  };
}
