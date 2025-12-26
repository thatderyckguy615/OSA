"use client";

/**
 * Dashboard Header with Firm Name
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
          {/* Firm name - centered, same style as homepage H1 but not red */}
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{firmName}</h1>
        </div>
      </div>
    </header>
  );
}

