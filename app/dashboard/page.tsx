import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="flex min-h-screen flex-col p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="pt-8">
        <section className="rounded-lg border bg-neutral-50 p-6 dark:bg-neutral-900">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">
            My credentials
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {user?.imageUrl && (
              <Image
                src={user.imageUrl}
                alt="Profile"
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div className="grid gap-1 text-sm">
              <p>
                <span className="font-medium text-neutral-500">Name:</span>{" "}
                {user?.firstName} {user?.lastName}
                {!user?.firstName && !user?.lastName && (
                  <span className="text-neutral-400">—</span>
                )}
              </p>
              <p>
                <span className="font-medium text-neutral-500">Email:</span>{" "}
                {user?.primaryEmailAddress?.emailAddress ?? (
                  <span className="text-neutral-400">—</span>
                )}
              </p>
              <p>
                <span className="font-medium text-neutral-500">User ID:</span>{" "}
                <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs dark:bg-neutral-700">
                  {user?.id ?? "—"}
                </code>
              </p>
            </div>
          </div>
        </section>
        <p className="mt-6 text-neutral-500">
          Workflows will be added here later.
        </p>
      </main>
    </div>
  );
}
