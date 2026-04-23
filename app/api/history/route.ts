import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.generatedTweet.findMany({
    where: {
      discarded: false
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return NextResponse.json({ items });
}
