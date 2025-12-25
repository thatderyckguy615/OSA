"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ReportHeaderActionsProps {
  reportUrl: string;
}

export function ReportHeaderActions({ reportUrl }: ReportHeaderActionsProps) {
  const [copied, setCopied] = useState(false);
  const [dashboardUrlFromSession, setDashboardUrlFromSession] = useState<string | null>(null);

  // Check sessionStorage for dashboard URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedUrl = sessionStorage.getItem('osa_dashboard_url');
      
      if (!storedUrl) {
        setDashboardUrlFromSession(null);
        return;
      }

      // Validate the URL - must be a dashboard path
      const isRelativeDashboard = storedUrl.startsWith('/d/');
      const isSameOriginDashboard = storedUrl.startsWith(window.location.origin + '/d/');

      if (isRelativeDashboard || isSameOriginDashboard) {
        setDashboardUrlFromSession(storedUrl);
      } else {
        // Invalid URL, don't use it
        setDashboardUrlFromSession(null);
      }
    } catch (err) {
      console.error('Failed to read dashboard URL from sessionStorage:', err);
      setDashboardUrlFromSession(null);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    setCopied(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // ignore
    }
    // Fallback not critical for this specific interaction in MVP, 
    // but good to have if needed. For now sticking to clipboard API.
  }, [reportUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <header className="no-print mb-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Back to Dashboard (only if opened from dashboard) */}
        {dashboardUrlFromSession ? (
          <a
            href={dashboardUrlFromSession}
            className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 group-hover:border-gray-300 shadow-sm transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </a>
        ) : (
          <div></div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="hidden sm:flex"
          >
            {copied ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              "Copy Report Link"
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / Save PDF
          </Button>
        </div>
      </div>
    </header>
  );
}
