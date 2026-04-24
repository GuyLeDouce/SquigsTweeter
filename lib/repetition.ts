import { prisma } from "@/lib/prisma";

export async function getRecentGenerations(limit = 12) {
  if (!prisma) {
    return [];
  }

  return prisma.generatedTweet.findMany({
    where: {
      discarded: false
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit,
    select: {
      tokenId: true,
      mainTweet: true,
      ctaMode: true,
      campaignMode: true
    }
  });
}

export async function getRecentTokenIds(limit = 24) {
  if (!prisma) {
    return new Set<string>();
  }

  const used = await prisma.usedToken.findMany({
    orderBy: {
      lastUsedAt: "desc"
    },
    take: limit,
    select: {
      tokenId: true
    }
  });

  return new Set(used.map((item) => item.tokenId));
}

export async function markTokenUsed(tokenId: string) {
  if (!prisma) {
    return;
  }

  await prisma.usedToken.upsert({
    where: {
      tokenId
    },
    create: {
      tokenId,
      useCount: 1
    },
    update: {
      lastUsedAt: new Date(),
      useCount: {
        increment: 1
      }
    }
  });
}
