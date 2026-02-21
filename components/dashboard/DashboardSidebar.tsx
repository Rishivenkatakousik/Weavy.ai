"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

function DocumentsIcon({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ImageGenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l4-4 3 3 4-4 3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
    </svg>
  );
}

export default function DashboardSidebar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Account";

  const isMyFilesActive = pathname === "/dashboard";

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
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-neutral-800 mb-3"
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

      {/* Create New File - light yellow / lime */}
      <div className="px-3">
        <Link
          href="/dashboard/new"
          className="flex items-center justify-center gap-2 rounded-sm bg-[#FAFFC7] px-4 py-1 mb-4 font-medium text-neutral-900 transition-colors hover:bg-[#FAFFC7]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New File
        </Link>
      </div>

      {/* Navigation */}
      <div className="mt-2 flex flex-1 flex-col gap-0.5 px-3 pb-4">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isMyFilesActive
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          <DocumentsIcon
            className={`h-5 w-5 shrink-0 ${isMyFilesActive ? "text-neutral-200" : "text-neutral-400"}`}
          />
          <span className="min-w-0 flex-1">My Files</span>
          <Link
            href="/dashboard/new"
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 hover:bg-neutral-700 hover:text-white"
            aria-label="Create new file"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </Link>
        <Link
          href="/dashboard/new?template=image-gen"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          <ImageGenIcon className="h-5 w-5 shrink-0 text-neutral-400" />
          Sample: Image from inputs
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
        >
          <PeopleIcon className="h-5 w-5 shrink-0 text-neutral-500" />
          Shared with me
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-800"
        >
          <PlayIcon className="h-5 w-5 shrink-0 text-neutral-400" />
          Apps
        </Link>
      </div>
    </aside>
  );
}
