"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

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

export default function DashboardSidebar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Account";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setDropdownOpen(false);
    signOut({ redirectUrl: "/" });
    router.push("/");
  };

  return (
    <aside className="flex w-64 flex-col border-r border-neutral-800 bg-neutral-950">
      {/* Profile + dropdown */}
      <div className="relative p-4" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-800"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-medium text-white">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt=""
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <span className="min-w-0 flex-1 truncate font-medium text-neutral-100">
            {displayName}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute left-4 right-4 top-full z-10 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-lg">
            <Link
              href="#"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-1 flex-col gap-1 px-3 pb-4">
        <Link
          href="/dashboard/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 font-medium text-neutral-900 transition-colors hover:bg-amber-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New File
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          <WorkflowIcon className="h-5 w-5 text-neutral-400" />
          My Files
        </Link>
      </div>
    </aside>
  );
}
