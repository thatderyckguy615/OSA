"use client";

/**
 * Supabase Realtime Hook for Dashboard Updates
 * Per PRD Section 6.3.2 and Architecture Section 5.4
 *
 * Features:
 * - JWT authentication for Realtime (1-hour expiry)
 * - Auto-refresh JWT 5 minutes before expiry
 * - Subscribe to team_members changes (UPDATE/INSERT)
 * - Connection status tracking
 * - Cleanup on unmount
 *
 * Key fixes:
 * - Use ONE Supabase client instance for the lifetime of the hook (setAuth + channel must share it)
 * - Do NOT re-subscribe just because the onMemberUpdate callback identity changes (store in ref)
 * - Remove channel cleanly on unmount
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

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
  team_id?: string; // may be present in payload.new depending on DB select list / replication
}

interface UseRealtimeOptions {
  adminToken: string;
  teamId: string;
  onMemberUpdate: (member: Member) => void;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  error: string | null;
}

export function useRealtime({
  adminToken,
  teamId,
  onMemberUpdate,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable reference to the callback so we don't constantly tear down/recreate subscriptions
  const onMemberUpdateRef = useRef(onMemberUpdate);
  useEffect(() => {
    onMemberUpdateRef.current = onMemberUpdate;
  }, [onMemberUpdate]);

  // Keep ONE Supabase client instance for this hook
  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseClient();
  }

  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch Realtime JWT token
  const fetchRealtimeToken = useCallback(async () => {
    const response = await fetch("/api/dashboard/realtime-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success || !data?.data?.token) {
      const message =
        data?.error?.message || "Failed to get realtime token (server error)";
      throw new Error(message);
    }

    return {
      token: data.data.token as string,
      expiresIn: data.data.expiresIn as number,
    };
  }, [adminToken]);

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback(
    (expiresIn: number) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      const refreshTime = expiresIn * 1000 - REFRESH_BUFFER_MS;
      if (refreshTime <= 0) return;

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const { token, expiresIn: newExpiresIn } = await fetchRealtimeToken();
          const supabase = supabaseRef.current!;
          // Update auth on the SAME client used for the channel
          supabase.realtime.setAuth(token);
          scheduleTokenRefresh(newExpiresIn);
        } catch (err) {
          console.error("Failed to refresh realtime token:", err);
          setIsConnected(false);
          setError("⚠️ Live updates paused. Refresh your browser.");
        }
      }, refreshTime);
    },
    [fetchRealtimeToken]
  );

  useEffect(() => {
    let mounted = true;

    async function setupRealtime() {
      try {
        setError(null);
        setIsConnected(false);

        const supabase = supabaseRef.current!;
        const { token, expiresIn } = await fetchRealtimeToken();
        if (!mounted) return;

        // Set realtime auth BEFORE subscribing
        supabase.realtime.setAuth(token);

        // Remove any existing channel before creating a new one (e.g., teamId changed)
        if (channelRef.current) {
          try {
            await channelRef.current.unsubscribe();
          } catch {
            // best effort
          }
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channel = supabase
          .channel(`team-${teamId}-updates`)
          .on(
            "postgres_changes",
            {
              event: "*", // includes UPDATE which is what completion triggers
              schema: "public",
              table: "team_members",
              filter: `team_id=eq.${teamId}`,
            },
            (payload) => {
              if (!mounted) return;

              if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                const newMember = payload.new as Member | null;
                if (newMember?.id) {
                  onMemberUpdateRef.current(newMember);
                }
              }
            }
          )
          .subscribe((status) => {
            if (!mounted) return;

            if (status === "SUBSCRIBED") {
              setIsConnected(true);
              setError(null);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setIsConnected(false);
              setError("⚠️ Live updates paused. Refresh your browser.");
            } else if (status === "CLOSED") {
              setIsConnected(false);
            }
          });

        channelRef.current = channel;

        // Schedule token refresh
        scheduleTokenRefresh(expiresIn);
      } catch (err) {
        if (!mounted) return;
        console.error("Realtime setup error:", err);
        setIsConnected(false);
        setError("⚠️ Live updates paused. Refresh your browser.");
      }
    }

    // Guard: if we don't have the required identifiers, don't attempt to connect
    if (!adminToken || !teamId) {
      setIsConnected(false);
      setError(null);
      return;
    }

    setupRealtime();

    return () => {
      mounted = false;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      const supabase = supabaseRef.current!;
      const ch = channelRef.current;
      channelRef.current = null;

      if (ch) {
        // Best-effort cleanup
        ch.unsubscribe().catch(() => undefined);
        supabase.removeChannel(ch);
      }
    };
  }, [adminToken, teamId, fetchRealtimeToken, scheduleTokenRefresh]);

  return { isConnected, error };
}
