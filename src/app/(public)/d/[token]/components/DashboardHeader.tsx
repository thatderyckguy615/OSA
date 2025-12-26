"use client";

/**
 * Dashboard Header with Operating Strengths Dashboard title
 */

interface DashboardHeaderProps {
  firmName: string;
  isConnected: boolean;
}

export function DashboardHeader({ firmName }: DashboardHeaderProps) {
  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          {/* Operating Strengths Dashboard - centered, red H1 like homepage */}
          <h1 className="text-3xl font-extrabold text-primary md:text-4xl">Operating Strengths Dashboard</h1>
        </div>
      </div>
    </header>
  );
}

