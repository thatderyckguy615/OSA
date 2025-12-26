"use client";

/**
 * Copy Link Button with Clipboard API fallback
 * Per PRD Section 6.3.3
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface CopyLinkButtonProps {
  url: string;
  label: string;
}

export function CopyLinkButton({ url, label }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const handleCopy = useCallback(async () => {
    // Try Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: Show modal with pre-selected text
    setShowFallback(true);
  }, [url]);

  const handleFallbackCopy = useCallback(() => {
    const input = document.getElementById("copy-fallback-input") as HTMLInputElement;
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999); // For mobile
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowFallback(false);
      }, 2000);
    }
  }, []);

  return (
    <>
      <Button variant="outline" onClick={handleCopy} className="gap-2">
        {copied ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-green-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-green-600">Copied ✓</span>
          </>
        ) : (
          <>
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
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {label}
          </>
        )}
      </Button>

      {/* Fallback Modal */}
      {showFallback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Copy Link</h3>
            <p className="text-sm text-muted-foreground">
              Press Ctrl+C (or Cmd+C on Mac) to copy the link:
            </p>
            <input
              id="copy-fallback-input"
              type="text"
              value={url}
              readOnly
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowFallback(false)}>
                Cancel
              </Button>
              <Button onClick={handleFallbackCopy}>
                {copied ? "Copied ✓" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

