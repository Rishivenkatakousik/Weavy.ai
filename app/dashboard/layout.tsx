import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  await ensureUser(userId);
  return <>{children}</>;
}
