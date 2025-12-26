"use client";

/**
 * Name Capture Form for participants
 * Displays when a team member needs to enter their display name
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NameCaptureFormProps {
  token: string;
  isLeader: boolean;
}

export function NameCaptureForm({ token, isLeader }: NameCaptureFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your name (at least 2 characters)");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Name must be 100 characters or less");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/assessment/${token}/name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || "Failed to save name. Please try again.");
        return;
      }

      // Refresh the page to proceed to the assessment intro
      router.refresh();
    } catch (err) {
      console.error("Error submitting name:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground">Welcome!</CardTitle>
        <CardDescription className="text-base">
          {isLeader
            ? "Please confirm your name to continue with the assessment."
            : "Please enter your name to begin the assessment."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display-name">Your Name</Label>
            <Input
              id="display-name"
              type="text"
              placeholder="e.g. Jane Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || displayName.trim().length < 2}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

