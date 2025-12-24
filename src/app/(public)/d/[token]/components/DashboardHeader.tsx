"use client";

/**
 * Dashboard Header with Firm Name and Live Indicator
 */

interface DashboardHeaderProps {
  firmName: string;
  isConnected: boolean;
}

export function DashboardHeader({ firmName, isConnected }: DashboardHeaderProps) {
  // Get first letter for the firm initial
  const firmInitial = firmName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Firm branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-lg">
              {firmInitial}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{firmName}</h1>
          </div>

          {/* Live indicator */}
          <div
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              ${isConnected ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}
            `}
          >
            <span
              className={`
                w-2 h-2 rounded-full
                ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}
              `}
            />
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>
      </div>
    </header>
  );
}

