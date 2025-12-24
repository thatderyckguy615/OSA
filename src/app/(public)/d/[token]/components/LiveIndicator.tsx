"use client";

/**
 * Live Indicator Component
 * Shows connection status for real-time updates
 * Per PRD Section 6.3.2
 *
 * NOTE: This is a placeholder. Full Supabase Realtime integration
 * will be implemented separately with JWT authentication.
 */

export function LiveIndicator() {
  // Placeholder: Always show "Live" for now
  // TODO: Connect to Supabase Realtime subscription status
  const isConnected = true;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
        ${isConnected ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}
      `}
    >
      <span
        className={`
          w-2 h-2 rounded-full
          ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}
        `}
      />
      {isConnected ? "Live" : "Connecting..."}
    </div>
  );
}

