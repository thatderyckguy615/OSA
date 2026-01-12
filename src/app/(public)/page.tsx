"use client";

/**
 * Create Team / Assessment Setup Page
 * (Homepage)
 */
import { useState, useMemo, useCallback, type FormEvent } from "react";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, X } from "@phosphor-icons/react";

// Email validation schema
const emailSchema = z.string().email();

interface ParsedEmail {
  email: string;
  isValid: boolean;
  isDuplicate: boolean;
}

/**
 * Parse raw email input into structured list.
 * Supports comma, semicolon, newline, tab, or space as separators.
 * Performs case-insensitive deduplication.
 */
function parseEmails(input: string, leaderEmail: string): ParsedEmail[] {
  if (!input.trim()) return [];

  // Split on comma, semicolon, newline, tab, or whitespace
  const tokens = input.split(/[,;\n\t\s]+/).filter((t) => t.trim().length > 0);

  const seen = new Set<string>();
  const leaderNormalized = leaderEmail.toLowerCase().trim();

  // If leader email is valid, add it to seen set first
  if (leaderNormalized && emailSchema.safeParse(leaderNormalized).success) {
    seen.add(leaderNormalized);
  }

  const results: ParsedEmail[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    const isValid = emailSchema.safeParse(trimmed).success;
    const isDuplicate = seen.has(normalized);

    if (!isDuplicate) {
      seen.add(normalized);
    }

    results.push({
      email: trimmed,
      isValid,
      isDuplicate,
    });
  }

  return results;
}

export const dynamic = "force-dynamic";

export default function CreateTeamPage() {
  // Form state
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [firmName, setFirmName] = useState("");
  const [participantEmailsRaw, setParticipantEmailsRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state
  const [successData, setSuccessData] = useState<{
    leaderAssessmentUrl: string;
    participantCount: number;
  } | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Parse and validate emails
  const parsedEmails = useMemo(
    () => parseEmails(participantEmailsRaw, leaderEmail),
    [participantEmailsRaw, leaderEmail]
  );

  // Calculate counts and validation state
  const validationState = useMemo(() => {
    const leaderEmailValid = emailSchema.safeParse(leaderEmail).success;
    const leaderNameValid = leaderName.trim().length >= 2;
    const firmNameValid = firmName.trim().length >= 2;

    // Unique valid emails (not duplicates)
    const uniqueValidEmails = parsedEmails.filter(
      (e) => e.isValid && !e.isDuplicate
    );
    const invalidEmails = parsedEmails.filter((e) => !e.isValid);
    const duplicateEmails = parsedEmails.filter((e) => e.isDuplicate);

    // Total participants = leader + unique valid participant emails
    const totalParticipants = (leaderEmailValid ? 1 : 0) + uniqueValidEmails.length;

    // At least 1 non-leader participant required
    const hasNonLeaderParticipant = uniqueValidEmails.length >= 1;

    // All emails must be valid (no invalid entries)
    const allEmailsValid = invalidEmails.length === 0;

    // Max 100 total
    const withinLimit = totalParticipants <= 100;

    // Can submit only if all conditions met
    const canSubmit =
      leaderNameValid &&
      leaderEmailValid &&
      firmNameValid &&
      hasNonLeaderParticipant &&
      allEmailsValid &&
      withinLimit;

    return {
      leaderEmailValid,
      leaderNameValid,
      firmNameValid,
      uniqueValidEmails,
      invalidEmails,
      duplicateEmails,
      totalParticipants,
      hasNonLeaderParticipant,
      allEmailsValid,
      withinLimit,
      canSubmit,
    };
  }, [leaderName, leaderEmail, firmName, parsedEmails]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validationState.canSubmit || isSubmitting) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaderName: leaderName.trim(),
            leaderEmail: leaderEmail.toLowerCase().trim(),
            firmName: firmName.trim(),
            participantEmails: validationState.uniqueValidEmails.map((e) =>
              e.email.toLowerCase().trim()
            ),
          }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setSuccessData({
            leaderAssessmentUrl: result.data.leaderAssessmentUrl,
            participantCount: result.data.participantCount,
          });
        } else {
          setError(
            result.error?.message || "Failed to create assessment. Please try again."
          );
        }
      } catch (err) {
        console.error("Submit error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [validationState, isSubmitting, leaderName, leaderEmail, firmName]
  );

  // Count display for participant emails
  const participantCount = validationState.uniqueValidEmails.length;

  // Show success card if assessment was created
  if (successData) {
    return (
      <div className="min-h-screen bg-secondary py-12 px-4">
        <div className="mx-auto max-w-2xl">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
              Operating Strengths Assessment
            </h1>
          </div>

          {/* Success Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                ✅ Assessment Created!
              </CardTitle>
              <CardDescription>
                You&apos;ve invited {successData.participantCount} team member
                {successData.participantCount !== 1 ? "s" : ""}. Check your email for your dashboard link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <a href={successData.leaderAssessmentUrl}>Start Your Assessment</a>
              </Button>
            </CardFooter>
          </Card>

          {/* Logo at bottom */}
          <div className="mt-12 text-center">
            <img 
              src="/addictive-leadership-logo.png" 
              alt="Addictive Leadership" 
              className="mx-auto max-w-[150px] w-full h-auto"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
            Operating Strengths Assessment
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Measure your firm&apos;s ability to turn strategy, people, and skills into <em>results</em>.
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Assessment Details</CardTitle>
            <CardDescription>
              Enter your details to generate the assessment links.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Leader Name and Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leader-name">Leader Name</Label>
                  <Input
                    id="leader-name"
                    type="text"
                    placeholder="e.g. Jack Henderson"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    aria-invalid={leaderName.length > 0 && !validationState.leaderNameValid}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leader-email">Leader Email</Label>
                  <Input
                    id="leader-email"
                    type="email"
                    placeholder="jack@firm.com"
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    aria-invalid={leaderEmail.length > 0 && !validationState.leaderEmailValid}
                  />
                </div>
              </div>

              {/* Firm Name */}
              <div className="space-y-2">
                <Label htmlFor="firm-name">Firm Name</Label>
                <Input
                  id="firm-name"
                  type="text"
                  placeholder="e.g. Caldwell Henderson & Co."
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  aria-invalid={firmName.length > 0 && !validationState.firmNameValid}
                />
              </div>

              {/* Participant Emails */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="participant-emails">Participant Emails</Label>
                  <span className="text-sm text-muted-foreground">
                    {participantCount} valid participant{participantCount !== 1 ? "s" : ""} (Limit: 100)
                  </span>
                </div>
                <Textarea
                  id="participant-emails"
                  placeholder="Paste emails here (separated by commas, spaces, or new lines)..."
                  value={participantEmailsRaw}
                  onChange={(e) => setParticipantEmailsRaw(e.target.value)}
                  className="min-h-[120px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Bulk paste supported. You are automatically included.
                </p>
              </div>

              {/* Parsed Email List */}
              {parsedEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Verified Emails</Label>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-secondary p-3">
                    <ul className="space-y-1">
                      {parsedEmails.map((parsed, idx) => (
                        <li
                          key={`${parsed.email}-${idx}`}
                          className={`flex items-center gap-2 text-sm ${
                            parsed.isDuplicate
                              ? "text-muted-foreground line-through"
                              : parsed.isValid
                              ? "text-foreground"
                              : "text-red-600"
                          }`}
                        >
                          {parsed.isDuplicate ? (
                            <span className="text-muted-foreground">—</span>
                          ) : parsed.isValid ? (
                            <Check className="h-4 w-4 text-green-600" weight="bold" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" weight="bold" />
                          )}
                          <span className="break-all">{parsed.email}</span>
                          {parsed.isDuplicate && (
                            <span className="text-xs text-muted-foreground">(duplicate)</span>
                          )}
                          {!parsed.isValid && !parsed.isDuplicate && (
                            <span className="text-xs text-red-500">(invalid)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Validation Messages */}
              {participantEmailsRaw.length > 0 && (
                <div className="space-y-1 text-sm">
                  {!validationState.allEmailsValid && (
                    <p className="text-red-600">
                      {validationState.invalidEmails.length} invalid email
                      {validationState.invalidEmails.length !== 1 ? "s" : ""} — please fix or remove
                    </p>
                  )}
                  {!validationState.hasNonLeaderParticipant && validationState.allEmailsValid && (
                    <p className="text-amber-600">
                      ✗ At least 1 participant (besides yourself) is required
                    </p>
                  )}
                  {!validationState.withinLimit && (
                    <p className="text-red-600">
                      ✗ Maximum 100 participants allowed (currently {validationState.totalParticipants})
                    </p>
                  )}
                  {validationState.duplicateEmails.length > 0 && (
                    <p className="text-muted-foreground">
                      {validationState.duplicateEmails.length} duplicate
                      {validationState.duplicateEmails.length !== 1 ? "s" : ""} removed
                    </p>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-6">
              {/* Error Message */}
              {error && (
                <div className="w-full rounded-md bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex w-full justify-center">
                <Button
                  type="submit"
                  disabled={!validationState.canSubmit || isSubmitting}
                  className=""
                >
                  {isSubmitting ? "Creating..." : "Send Invites & Start Assessment"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Logo at bottom */}
        <div className="mt-12 text-center">
          <img 
            src="/addictive-leadership-logo.png" 
            alt="Addictive Leadership" 
            className="mx-auto max-w-[150px] w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
