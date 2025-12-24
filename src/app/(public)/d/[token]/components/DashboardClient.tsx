"use client";

/**
 * Dashboard Client Component
 * Handles real-time updates and client-side state
 */
import { useState, useCallback } from "react";
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

export function DashboardClient({
  token,
  dashboardUrl,
  teamId,
  firmName,
  leaderName,
  initialMembers,
}: DashboardClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  // Handle real-time member updates
  const handleMemberUpdate = useCallback((updatedMember: Member) => {
    setMembers((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === updatedMember.id);
      
      if (existingIndex >= 0) {
        // Update existing member
        const newMembers = [...prev];
        newMembers[existingIndex] = updatedMember;
        return newMembers;
      } else {
        // Add new member
        return [...prev, updatedMember];
      }
    });
  }, []);

  // Setup Realtime connection
  const { isConnected, error } = useRealtime({
    adminToken: token,
    teamId,
    onMemberUpdate: handleMemberUpdate,
  });

  // Calculate stats
  const completedMembers = members.filter((m) => m.completed);
  const pendingMembers = members.filter((m) => !m.completed);
  const totalMembers = members.length;
  const completedCount = completedMembers.length;
  const completionPercent =
    totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;

  return (
    <>
      {/* Header with Live indicator */}
      <DashboardHeader firmName={firmName} isConnected={isConnected} />

      {/* Disconnect Banner */}
      {error && <DisconnectBanner message={error} />}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Card */}
        <DashboardCard
          token={token}
          dashboardUrl={dashboardUrl}
          completedCount={completedCount}
          totalMembers={totalMembers}
          completionPercent={completionPercent}
        />

        {/* Member Lists */}
        <MemberLists
          token={token}
          completedMembers={completedMembers}
          pendingMembers={pendingMembers}
          leaderName={leaderName}
          firmName={firmName}
        />
      </main>
    </>
  );
}

