"use client";

/**
 * Assessment Questions Page
 * Per PRD Section 6.2.4 - Mobile-first question UI
 *
 * Features:
 * - Full viewport mobile-first layout
 * - Large touch targets (>=44px)
 * - 5-point scale with green selected state
 * - sessionStorage progress recovery
 * - Accessible radiogroup semantics
 */
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  useAssessmentProgress,
  clearAssessmentStorage,
  type Question,
} from "@/hooks/useAssessmentProgress";

// ============================================================================
// Scale Labels (PRD Section 6.2.4)
// ============================================================================

const SCALE_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
] as const;

// ============================================================================
// Types
// ============================================================================

interface QuestionsApiResponse {
  success: boolean;
  data?: {
    questions: Question[];
    memberId: string;
    memberName: string | null;
    isCompleted: boolean;
  };
  error?: {
    message: string;
    code?: string;
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default function AssessmentQuestionsPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Data from API
  const [questions, setQuestions] = useState<Question[]>([]);
  const [memberId, setMemberId] = useState<string>("");
  const [memberName, setMemberName] = useState<string | null>(null);

  // Fetch questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/assessment/${token}/questions`);
        const data: QuestionsApiResponse = await response.json();

        if (!response.ok || !data.success || !data.data) {
          setError(data.error?.message || "Failed to load questions");
          setIsLoading(false);
          return;
        }

        // Check if already completed
        if (data.data.isCompleted) {
          // Redirect to intro page (which shows completion state)
          router.replace(`/a/${token}`);
          return;
        }

        setQuestions(data.data.questions);
        setMemberId(data.data.memberId);
        setMemberName(data.data.memberName);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setError("Connection error. Please try again.");
        setIsLoading(false);
      }
    }

    if (token) {
      fetchQuestions();
    }
  }, [token, router]);

  // Assessment progress hook (only active when we have questions and memberId)
  const progress = useAssessmentProgress(memberId || "temp", questions);

  // Handle submit
  const handleSubmit = async () => {
    if (!progress.canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/assessment/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: progress.responses }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error?.message || "Failed to submit assessment");
        setIsSubmitting(false);
        return;
      }

      // Clear sessionStorage on successful submit
      clearAssessmentStorage(memberId);

      // Redirect to intro page (which shows completion state with scores)
      router.replace(`/a/${token}`);
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError("Connection error. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Assessment
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push(`/a/${token}`)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // No questions or no current question
  if (!progress.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No questions available.</p>
      </div>
    );
  }

  const { currentQuestion, currentResponse, currentIndex, totalQuestions } =
    progress;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-gray-500">
              {progress.answeredCount} answered
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      {/* Question Content */}
      <main className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full overflow-y-auto">
        {/* Question Text */}
        <div className="flex-shrink-0 mb-8">
          <h2 className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Scale Options - Centered Container */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div
            className="w-full max-w-md space-y-3"
            role="radiogroup"
            aria-label={`Response options for question ${currentIndex + 1}`}
          >
            {SCALE_OPTIONS.map((option) => {
              const isSelected = currentResponse === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    progress.setResponse(currentQuestion.id, option.value)
                  }
                  className={`
                    w-full min-h-[48px] px-4 py-3 rounded-lg border-2 
                    text-left transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                    ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-white hover:border-gray-400 active:bg-gray-50"
                    }
                  `}
                >
                  <div className="flex items-center">
                    {/* Radio Circle */}
                    <div
                      className={`
                        w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0
                        transition-colors duration-150
                        ${isSelected ? "border-green-500 bg-green-500" : "border-gray-400"}
                      `}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={`text-base ${isSelected ? "font-medium text-gray-900" : "text-gray-700"}`}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="flex-shrink-0 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {submitError}
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* Previous Button */}
          <Button
            variant="outline"
            onClick={progress.goToPrevious}
            disabled={!progress.canGoPrevious}
            className="flex-1"
          >
            Previous
          </Button>

          {/* Next or Submit Button */}
          {progress.isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!progress.canSubmit || isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          ) : (
            <Button
              onClick={progress.goToNext}
              disabled={!progress.canGoNext}
              className="flex-1"
            >
              Next
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

