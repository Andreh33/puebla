import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSlugAvailable } from "@/lib/products/queries";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  const excludeId = url.searchParams.get("excludeId") ?? undefined;

  if (!slug) {
    return NextResponse.json({ available: false, reason: "Slug vacío" }, { status: 200 });
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { available: false, reason: "Formato inválido" },
      { status: 200 },
    );
  }

  const available = await isSlugAvailable(slug, excludeId);
  return NextResponse.json({ available });
}
