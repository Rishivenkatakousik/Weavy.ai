import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="12" r="2.5" />
      <circle cx="15" cy="12" r="2.5" />
      <path d="M11.5 12h1M13.5 12h1" />
    </svg>
  );
}

const DUMMY_FILES = [
  { id: "1", title: "Untitled Workflow", lastEdited: "Just now" },
  { id: "2", title: "Product Listing Generator", lastEdited: "1 days ago" },
];

export default async function DashboardPage() {
  const user = await currentUser();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "My";

  return (
    <div className="flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-100">
          {displayName}&apos;s Workspace
        </h1>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-2 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New File
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-400">
          My files
        </h2>
        <div className="flex flex-wrap gap-4">
          {DUMMY_FILES.map((file) => (
            <Link
              key={file.id}
              href="#"
              className="flex w-56 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-sm transition-colors hover:border-neutral-600 hover:shadow"
            >
              <WorkflowIcon className="h-12 w-12 text-neutral-500" />
              <div className="text-center">
                <p className="font-medium text-neutral-100">
                  {file.title}
                </p>
                <p className="text-xs text-neutral-400">
                  Last edited {file.lastEdited}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
