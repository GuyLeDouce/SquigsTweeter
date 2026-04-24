import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!prisma) {
      return NextResponse.json({ items: [] });
    }

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
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load history.",
        items: []
      },
      { status: 500 }
    );
  }
}
