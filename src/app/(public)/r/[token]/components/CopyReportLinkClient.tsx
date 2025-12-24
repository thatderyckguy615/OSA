"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CopyReportLinkClientProps {
  reportUrl: string;
}

export function CopyReportLinkClient({ reportUrl }: CopyReportLinkClientProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(reportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: show dialog with selectable text
    setShowFallback(true);
  };

  const handleFallbackSelect = () => {
    if (inputRef.current) {
      inputRef.current.select();
      inputRef.current.setSelectionRange(0, reportUrl.length);
    }
  };

  return (
    <>
      <Button
        onClick={handleCopy}
        className="bg-rose-500 hover:bg-rose-600 text-white"
      >
        {copied ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-2"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-2"
            >
              <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
              <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
            </svg>
            Copy Report Link
          </>
        )}
      </Button>

      {/* Fallback Dialog for browsers without Clipboard API */}
      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Report Link</DialogTitle>
            <DialogDescription>
              Select and copy the link below (Ctrl+C or Cmd+C)
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={reportUrl}
              readOnly
              onClick={handleFallbackSelect}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 select-all"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click the link above to select it, then press Ctrl+C (Windows) or Cmd+C (Mac)
            to copy.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

