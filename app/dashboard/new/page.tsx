import Link from "next/link";

export default function NewFilePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <p className="text-neutral-400">
        Create new file / workflow — coming soon.
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-amber-400 hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
