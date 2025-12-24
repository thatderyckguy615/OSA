"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ReportActions({ reportUrl }: { reportUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in some browsers/contexts — show fallback modal.
      setOpen(true);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-3 no-print">
      <Button onClick={handleCopy} className="gap-2">
        {copied ? "Copied ✓" : "Copy Report Link"}
      </Button>

      <Button variant="outline" onClick={handlePrint} className="gap-2">
        Print / Save as PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy this link</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Your browser wouldn’t allow automatic copy. Click the field below, then press ⌘C (Mac) or Ctrl+C (Windows).
          </p>
          <Input readOnly value={reportUrl} onFocus={(e) => e.currentTarget.select()} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
