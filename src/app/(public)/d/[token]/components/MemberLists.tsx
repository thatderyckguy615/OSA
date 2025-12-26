"use client";

/**
 * Member Lists - Completed and Pending
 * Per PRD Section 6.3
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddMemberForm } from "./AddMemberForm";

interface Member {
  id: string;
  email: string;
  display_name: string | null;
  is_leader: boolean;
  completed: boolean;
  completed_at: string | null;
  alignment_score: number | null;
  execution_score: number | null;
  accountability_score: number | null;
}

interface MemberListsProps {
  token: string;
  completedMembers: Member[];
  pendingMembers: Member[];
  leaderName: string;
  firmName: string;
}

export function MemberLists({
  token,
  completedMembers,
  pendingMembers,
  leaderName,
  firmName,
}: MemberListsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Completed List */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <CardTitle className="text-lg">Completed</CardTitle>
            </div>
            <Badge variant="secondary" className="text-sm">
              {completedMembers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {completedMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No completed assessments yet
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {completedMembers.map((member) => (
                <CompletedMemberRow key={member.id} member={member} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending List */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-orange-500"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <CardTitle className="text-lg">Pending</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {pendingMembers.length}
              </Badge>
              <AddMemberForm token={token} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {pendingMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              All members have completed!
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingMembers.map((member) => (
                <PendingMemberRow
                  key={member.id}
                  member={member}
                  token={token}
                  leaderName={leaderName}
                  firmName={firmName}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompletedMemberRow({ member }: { member: Member }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const displayName = member.display_name || "(Name pending)";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap ml-4">
        {formatDate(member.completed_at)}
      </div>
    </div>
  );
}

function PendingMemberRow({
  member,
  token,
  leaderName,
  firmName,
}: {
  member: Member;
  token: string;
  leaderName: string;
  firmName: string;
}) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error" | "throttled">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setResendStatus("idle");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/dashboard/${token}/members/${member.id}/resend`,
        { method: "POST" }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResendStatus("sent");
        setTimeout(() => setResendStatus("idle"), 3000);
      } else if (response.status === 429) {
        // Throttled
        setResendStatus("throttled");
        const retrySeconds = data.data?.retryAfterSeconds || 300;
        setErrorMessage(`Please wait ${Math.ceil(retrySeconds / 60)} minutes`);
        setTimeout(() => {
          setResendStatus("idle");
          setErrorMessage(null);
        }, 5000);
      } else {
        setResendStatus("error");
        setErrorMessage(data.error?.message || "Failed to resend");
        setTimeout(() => {
          setResendStatus("idle");
          setErrorMessage(null);
        }, 3000);
      }
    } catch (err) {
      console.error("Resend error:", err);
      setResendStatus("error");
      setErrorMessage("Network error");
      setTimeout(() => {
        setResendStatus("idle");
        setErrorMessage(null);
      }, 3000);
    } finally {
      setIsResending(false);
    }
  };

  const getButtonText = () => {
    if (resendStatus === "sent") return "Sent ✓";
    if (resendStatus === "throttled") return "Too Soon";
    if (resendStatus === "error") return "Failed";
    if (isResending) return "Sending...";
    return "Resend";
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{member.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isResending || resendStatus === "sent" || resendStatus === "throttled"}
          className="ml-4 text-muted-foreground hover:text-foreground"
        >
          {getButtonText()}
        </Button>
      </div>
      {errorMessage && (
        <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}

