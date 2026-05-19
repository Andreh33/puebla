import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const categories = await db.category.findMany({
    orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, position: true },
  });
  return NextResponse.json({ categories });
}
