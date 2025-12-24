"use client";

/**
 * Disconnect Banner
 * Shows when Realtime connection is lost
 * Per PRD Section 6.3.2
 */

interface DisconnectBannerProps {
  message: string;
}

export function DisconnectBanner({ message }: DisconnectBannerProps) {
  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 text-yellow-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 flex-shrink-0"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
}

