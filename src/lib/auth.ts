import { prisma } from "@/lib/prisma";

export async function ensureUser(userId: string): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existing) {
    await prisma.user.create({
      data: { id: userId },
    });
  }
}
