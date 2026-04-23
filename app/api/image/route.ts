import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");
    const filename = searchParams.get("filename") ?? "squig-image";

    if (!target) {
      return NextResponse.json({ error: "Missing image URL." }, { status: 400 });
    }

    const response = await fetch(target, {
      next: {
        revalidate: 0
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to fetch image." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to proxy image."
      },
      { status: 500 }
    );
  }
}
