"use client";

/**
 * Main Dashboard Card
 * Contains Generate Report button, progress, and primary dashboard actions
 *
 * Per PRD: Add Member is handled in the Pending section (contextual),
 * so we intentionally do NOT duplicate it here to avoid confusion.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const canGenerateReport = completedCount >= 1;

  const handleGenerateReport = async () => {
    if (!canGenerateReport || isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/dashboard/${token}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error?.message || "Failed to generate report");
        return;
      }

      // Success
      setReportUrl(data.data.reportUrl);
      toast.success("Report generated successfully!");
      router.refresh(); // Refresh to update any server-side data
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Operating Strengths Dashboard</CardTitle>
            <CardDescription className="mt-1">
              Manage your assessments and view results.
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

        {/* Report Actions (shown after generation) */}
        {reportUrl && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900">
              ✓ Report ready
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  // Store dashboard URL in sessionStorage before opening report
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('osa_dashboard_url', dashboardUrl);
                  }
                  window.open(reportUrl, "_blank");
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                Open Report
              </Button>
              <CopyLinkButton url={reportUrl} label="Copy Report Link" />
            </div>
          </div>
        )}

        {/* Primary Action */}
        <div className="flex flex-wrap gap-3">
          <CopyLinkButton url={dashboardUrl} label="Copy Dashboard Link" />
        </div>
      </CardContent>
    </Card>
  );
}
