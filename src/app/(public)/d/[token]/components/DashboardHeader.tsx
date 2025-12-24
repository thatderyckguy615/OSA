"use client";

/**
 * Dashboard Header with Firm Name
 */

interface DashboardHeaderProps {
  firmName: string;
}

export function DashboardHeader({ firmName }: DashboardHeaderProps) {
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
        </div>
      </div>
    </header>
  );
}

