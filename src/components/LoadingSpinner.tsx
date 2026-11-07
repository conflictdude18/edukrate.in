
"use client";

export default function LoadingSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-[55vh] flex-col items-center justify-center gap-4"
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid var(--border)",
          borderTop: "4px solid #3b82f6",
          borderRadius: "50%",
          animation: "edukrate-spinner 0.8s linear infinite",
        }}
      />

      <p className="text-sm font-medium text-[var(--muted)]">
        Loading...
      </p>

      <style jsx>{`
        @keyframes edukrate-spinner {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
