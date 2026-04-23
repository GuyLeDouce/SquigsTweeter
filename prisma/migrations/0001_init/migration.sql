CREATE TABLE "GeneratedTweet" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "nftName" TEXT,
    "imageUrl" TEXT NOT NULL,
    "campaignMode" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "lengthMode" TEXT NOT NULL,
    "ctaMode" TEXT NOT NULL,
    "hashtagEnabled" BOOLEAN NOT NULL,
    "humanized" BOOLEAN NOT NULL,
    "mainTweet" VARCHAR(280) NOT NULL,
    "altTweet1" VARCHAR(280) NOT NULL,
    "altTweet2" VARCHAR(280) NOT NULL,
    "firstReply" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "discarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GeneratedTweet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsedToken" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UsedToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsedToken_tokenId_key" ON "UsedToken"("tokenId");
