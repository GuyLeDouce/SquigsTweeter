import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  favorite: z.boolean().optional(),
  discarded: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!prisma) {
      return NextResponse.json(
        {
          error: "History storage is unavailable because DATABASE_URL is not configured."
        },
        { status: 503 }
      );
    }

    const body = patchSchema.parse(await request.json());
    const item = await prisma.generatedTweet.update({
      where: {
        id: params.id
      },
      data: body
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update history item."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!prisma) {
      return NextResponse.json(
        {
          error: "History storage is unavailable because DATABASE_URL is not configured."
        },
        { status: 503 }
      );
    }

    await prisma.generatedTweet.update({
      where: {
        id: params.id
      },
      data: {
        discarded: true
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to discard history item."
      },
      { status: 400 }
    );
  }
}
