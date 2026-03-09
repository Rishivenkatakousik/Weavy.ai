"use client";

interface LoadingProps {
  /** Optional wrapper class (e.g. flex-1 min-h-0 to fill main area without full viewport height) */
  className?: string;
  /** Optional message below the spinner */
  message?: string;
}

export default function Loading({
  className = "",
  message,
}: LoadingProps) {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-black ${className}`}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"
        aria-hidden
      />
      {message ? (
        <p className="mt-4 text-sm text-neutral-400">{message}</p>
      ) : null}
    </div>
  );
}
