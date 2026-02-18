import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="pt-8">
        <p className="text-neutral-500">Welcome. Workflows will be added here later.</p>
      </main>
    </div>
  );
}
