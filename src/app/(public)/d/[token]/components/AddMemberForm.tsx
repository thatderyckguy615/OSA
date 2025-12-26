"use client";

/**
 * Add Member Form Component
 * Allows leaders to add new participants to their team
 * Per PRD Section 6.2.2
 */
import { useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddMemberFormProps {
  token: string;
  onSuccess?: () => void;
}

export function AddMemberForm({ token, onSuccess }: AddMemberFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/dashboard/${token}/add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific error codes
        if (data.error?.code === "DUPLICATE_EMAIL") {
          setError("This email is already a member of your team");
        } else if (data.error?.code === "TEAM_FULL") {
          setError("Your team is full (maximum 100 members)");
        } else {
          setError(data.error?.message || "Failed to add member");
        }
        return;
      }

      // Success!
      setSuccess(true);
      setEmail("");
      
      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error("Failed to add member:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setEmail("");
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new participant to your team. They&apos;ll receive an email with their assessment link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || success}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-600">
                  ✓ Member added successfully! They&apos;ll receive an email shortly.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || success || !email.trim()}>
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

