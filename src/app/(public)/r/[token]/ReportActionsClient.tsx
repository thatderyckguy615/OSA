"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportActionsClient({ reportUrl }: { reportUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    setCopied(false);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      }
    } catch {
      // fall through to fallback
    }

    // Fallback copy (older browsers)
    const input = document.createElement("input");
    input.value = reportUrl;
    input.setAttribute("readonly", "true");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } finally {
      document.body.removeChild(input);
    }
  }, [reportUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="no-print flex flex-col sm:flex-row gap-2">
      <Button onClick={handleCopy} className="bg-rose-500 hover:bg-rose-600 text-white">
        {copied ? "Copied!" : "Copy Report Link"}
      </Button>
      <Button variant="outline" onClick={handlePrint}>
        Print / Save as PDF
      </Button>
    </div>
  );
}
