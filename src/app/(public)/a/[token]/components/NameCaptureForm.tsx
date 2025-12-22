"use client";

/**
 * Name Capture Form
 * Per PRD Section 6.2.2
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    setError(null);

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/assessment/${token}/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Failed to save name");
        setIsSubmitting(false);
        return;
      }

      // Success - refresh page to show intro
      router.refresh();
    } catch (err) {
      console.error("Name save error:", err);
      setError("Connection error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>What is your name?</CardTitle>
        <CardDescription>
          Your leader will see your overall dimension scores and team averages,
          not your individual answers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
              minLength={2}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

