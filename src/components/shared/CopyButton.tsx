"use client";

/**
 * CopyButton Component
 * 
 * Attempts to copy text using Clipboard API on secure contexts.
 * Falls back to a modal dialog with pre-selected text if Clipboard API
 * is unavailable or fails.
 * 
 * Per PRD Section 6.3.3 and 12.4 (Clipboard API fallback requirement)
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "@phosphor-icons/react";

interface CopyButtonProps {
  /**
   * Text to copy to clipboard
   */
  text: string;
  /**
   * Button label text
   */
  label?: string;
  /**
   * Button variant (defaults to "outline")
   */
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  /**
   * Button size (defaults to "default")
   */
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  /**
   * Additional className for the button
   */
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  size = "default",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select text when fallback dialog opens
  useEffect(() => {
    if (showFallback && inputRef.current) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        inputRef.current?.select();
        inputRef.current?.setSelectionRange(0, 99999); // For mobile devices
      }, 100);
    }
  }, [showFallback]);

  const handleCopy = useCallback(async () => {
    // Try Clipboard API first (only on secure contexts)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (error) {
        // Clipboard API failed, fall through to fallback modal
        console.error("Clipboard API failed:", error);
      }
    }

    // Fallback: Show modal with pre-selected text
    setShowFallback(true);
  }, [text]);

  const handleCloseFallback = useCallback(() => {
    setShowFallback(false);
  }, []);

  // Detect if user presses Ctrl+C / Cmd+C while input is focused
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        // Text is already selected, copy will happen automatically
        // Show success feedback
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setShowFallback(false);
        }, 2000);
      }
    },
    []
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleCopy}
        className={className}
        disabled={copied}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" weight="bold" />
            <span>Copied ✓</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>{label}</span>
          </>
        )}
      </Button>

      {/* Fallback Dialog */}
      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Link</DialogTitle>
            <DialogDescription>
              Press Ctrl+C (or Cmd+C on Mac) to copy:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={inputRef}
              type="text"
              value={text}
              readOnly
              onKeyDown={handleInputKeyDown}
              onClick={(e) => {
                // Select all text on click
                (e.target as HTMLInputElement).select();
              }}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFallback}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

