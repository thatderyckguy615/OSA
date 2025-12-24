"use client";

/**
 * Main Dashboard Card
 * Contains Generate Report button, progress, and action buttons
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "./CopyLinkButton";

interface DashboardCardProps {
  token: string;
  dashboardUrl: string;
  completedCount: number;
  totalMembers: number;
  completionPercent: number;
}

export function DashboardCard({
  token,
  dashboardUrl,
  completedCount,
  totalMembers,
  completionPercent,
}: DashboardCardProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerateReport = completedCount >= 1;

  const handleGenerateReport = async () => {
    if (!canGenerateReport || isGenerating) return;
    setIsGenerating(true);

    // TODO: Call generate report API and redirect to report page
    // For now, just simulate and refresh
    setTimeout(() => {
      setIsGenerating(false);
      router.refresh();
    }, 1000);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Dashboard</CardTitle>
            <CardDescription className="mt-1">
              Manage your assessment and view real-time progress.
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={!canGenerateReport || isGenerating}
            className="bg-rose-500 hover:bg-rose-600 text-white gap-2 whitespace-nowrap"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completion Progress</span>
            <span className="text-gray-900 font-medium">
              {completedCount} of {totalMembers} completed ({completionPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <CopyLinkButton url={dashboardUrl} label="Copy Dashboard Link" />
          <Button variant="outline" className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Member
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

