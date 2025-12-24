"use client";

/**
 * Dashboard Client Component
 * Handles real-time updates and client-side state
 *
 * Fixes:
 * - Ensure INSERT/UPDATE payloads merge safely into existing member rows
 * - Keep list ordering consistent after realtime updates (completed first, then name/email)
 * - Avoid losing existing fields if realtime payload is partial
 */
import { useMemo, useState, useCallback } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardCard } from "./DashboardCard";
import { MemberLists } from "./MemberLists";
import { DisconnectBanner } from "./DisconnectBanner";

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

interface DashboardClientProps {
  token: string;
  dashboardUrl: string;
  teamId: string;
  firmName: string;
  leaderName: string;
  initialMembers: Member[];
}

function sortMembers(a: Member, b: Member) {
  // Completed members first
  if (a.completed !== b.completed) return a.completed ? -1 : 1;

  // Then by display name (fallback to email)
  const aKey = (a.display_name || a.email || "").toLowerCase();
  const bKey = (b.display_name || b.email || "").toLowerCase();
  return aKey.localeCompare(bKey);
}

export function DashboardClient({
  token,
  dashboardUrl,
  teamId,
  firmName,
  leaderName,
  initialMembers,
}: DashboardClientProps) {
  const [members, setMembers] = useState<Member[]>(
    [...initialMembers].sort(sortMembers)
  );

  // Handle real-time member updates (INSERT/UPDATE)
  const handleMemberUpdate = useCallback((incoming: Member) => {
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);

      if (idx >= 0) {
        // Merge to avoid losing any fields if realtime payload is partial
        const merged: Member = { ...prev[idx], ...incoming };
        const next = [...prev];
        next[idx] = merged;
        return next.sort(sortMembers);
      }

      // New member added (INSERT)
      return [...prev, incoming].sort(sortMembers);
    });
  }, []);

  // Setup Realtime connection
  const { isConnected, error } = useRealtime({
    adminToken: token,
    teamId,
    onMemberUpdate: handleMemberUpdate,
  });

  // Derived stats (memoized)
  const { completedMembers, pendingMembers, totalMembers, completedCount, completionPercent } =
    useMemo(() => {
      const completed = members.filter((m) => m.completed);
      const pending = members.filter((m) => !m.completed);
      const total = members.length;
      const completedCt = completed.length;
      const percent = total > 0 ? Math.round((completedCt / total) * 100) : 0;

      return {
        completedMembers: completed,
        pendingMembers: pending,
        totalMembers: total,
        completedCount: completedCt,
        completionPercent: percent,
      };
    }, [members]);

  return (
    <>
      {/* Header */}
      <DashboardHeader firmName={firmName} isConnected={isConnected} />

      {/* Disconnect Banner */}
      {error && <DisconnectBanner message={error} />}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <DashboardCard
          token={token}
          dashboardUrl={dashboardUrl}
          completedCount={completedCount}
          totalMembers={totalMembers}
          completionPercent={completionPercent}
        />

        <MemberLists
          token={token}
          completedMembers={completedMembers}
          pendingMembers={pendingMembers}
          leaderName={leaderName}
          firmName={firmName}
        />

        {/* Logo at bottom */}
        <div className="mt-12 pb-6 text-center">
          <img 
            src="/addictive-leadership-logo.png" 
            alt="Addictive Leadership" 
            className="mx-auto max-w-[150px] w-full h-auto"
          />
        </div>
      </main>
    </>
  );
}
