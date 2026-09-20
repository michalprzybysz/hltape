"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0f14",
          color: "#e8edf2",
          fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#1a1f28",
              marginBottom: 16,
              fontSize: 20,
              color: "#6b7280",
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
            An unexpected error occurred. Please try again.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 10px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #1f2937",
                backgroundColor: "transparent",
                color: "#e8edf2",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={async () => {
                const form = await Sentry.getFeedback()?.createForm();
                form?.appendToDom();
                form?.open();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 10px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #1f2937",
                backgroundColor: "transparent",
                color: "#e8edf2",
                cursor: "pointer",
              }}
            >
              Report a Problem
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
