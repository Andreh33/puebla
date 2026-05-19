/**
 * GET /api/blob/list?cursor=&q=&filter=orphans|product|blog|brand|category
 *
 * Lista blobs paginados (50/pag) con info de referencias.
 * Requiere sesión admin.
 *
 * DELETE /api/blob/list  body: { urls: string[] }
 *   Borra los blobs especificados (varias variantes a la vez si se incluyen).
 */
import { NextResponse, type NextRequest } from "next/server";
import { list, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { loadReferencedUrls } from "@/lib/blob/garbage-collect";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 50;

function token(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const t = token();
  if (!t) {
    return NextResponse.json(
      { error: "Vercel Blob no configurado — añade BLOB_READ_WRITE_TOKEN" },
      { status: 503 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor") ?? undefined;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const filter = (sp.get("filter") ?? "") as
    | ""
    | "orphans"
    | "product"
    | "blog"
    | "brand"
    | "category";

  try {
    const result = await list({ token: t, cursor, limit: PAGE_SIZE });
    const referenced = await loadReferencedUrls();

    // Información de referencia por URL — qué entidad la usa.
    const refMap = await buildReferenceMap();

    const items = result.blobs
      .map((b) => {
        const stripped = stripQuery(b.url);
        const refs = refMap.get(stripped) ?? [];
        return {
          url: b.url,
          pathname: b.pathname,
          uploadedAt: b.uploadedAt,
          size: b.size,
          isReferenced: referenced.has(stripped),
          references: refs,
          folder: b.pathname.split("/")[0] ?? "",
        };
      })
      .filter((i) => {
        if (q && !i.pathname.toLowerCase().includes(q)) return false;
        if (filter === "orphans" && i.isReferenced) return false;
        if (filter === "product" && !i.pathname.startsWith("products/")) return false;
        if (filter === "blog" && !i.pathname.startsWith("blog/")) return false;
        if (filter === "brand" && !i.pathname.startsWith("brands/")) return false;
        if (filter === "category" && !i.pathname.startsWith("categories/")) return false;
        return true;
      });

    return NextResponse.json({
      items,
      cursor: result.cursor ?? null,
      hasMore: Boolean(result.hasMore),
    });
  } catch (err) {
    console.error("[api/blob/list] error", err);
    return NextResponse.json({ error: "Error listando blobs" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Sólo OWNER puede borrar de forma masiva
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Sólo OWNER puede borrar" }, { status: 403 });
  }
  const t = token();
  if (!t) {
    return NextResponse.json({ error: "Blob no configurado" }, { status: 503 });
  }

  let body: { urls?: string[] };
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const urls = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string") : [];
  if (urls.length === 0) {
    return NextResponse.json({ error: "urls requerido" }, { status: 400 });
  }
  if (urls.length > 200) {
    return NextResponse.json({ error: "Máximo 200 por petición" }, { status: 400 });
  }

  // Comprobar referencias — si alguna URL está referenciada, abortamos por
  // defecto. El cliente puede pasar { force: true } para forzar.
  const referenced = await loadReferencedUrls();
  const stillReferenced = urls.filter((u) => referenced.has(stripQuery(u)));
  if (stillReferenced.length > 0) {
    return NextResponse.json(
      {
        error: "Algunas imágenes están referenciadas. Desasocia primero.",
        referenced: stillReferenced,
      },
      { status: 409 },
    );
  }

  try {
    await del(urls, { token: t });
    return NextResponse.json({ ok: true, deleted: urls.length });
  } catch (err) {
    console.error("[api/blob/list] DELETE error", err);
    return NextResponse.json({ error: "Error al borrar" }, { status: 500 });
  }
}

function stripQuery(url: string): string {
  const ix = url.indexOf("?");
  return ix < 0 ? url : url.slice(0, ix);
}

type Reference = {
  type: "product" | "blog" | "brand" | "category";
  id: string;
  label: string;
  field: string;
};

async function buildReferenceMap(): Promise<Map<string, Reference[]>> {
  const map = new Map<string, Reference[]>();
  const add = (url: string | null | undefined, ref: Reference) => {
    if (!url) return;
    const key = stripQuery(url);
    const arr = map.get(key) ?? [];
    arr.push(ref);
    map.set(key, arr);
  };

  const [imgs, posts, brands, cats, prods] = await Promise.all([
    db.productImage.findMany({
      select: {
        id: true,
        productId: true,
        url: true,
        urlMedium: true,
        urlThumb: true,
        product: { select: { name: true } },
      },
    }),
    db.blogPost.findMany({
      select: { id: true, title: true, coverImageUrl: true, ogImageUrl: true },
    }),
    db.brand.findMany({ select: { id: true, name: true, logoUrl: true } }),
    db.category.findMany({ select: { id: true, name: true, imageUrl: true } }),
    db.product.findMany({ select: { id: true, name: true, mainImageUrl: true } }),
  ]);

  for (const i of imgs) {
    const label = i.product?.name ?? i.productId;
    add(i.url, { type: "product", id: i.productId, label, field: "url" });
    add(i.urlMedium, { type: "product", id: i.productId, label, field: "urlMedium" });
    add(i.urlThumb, { type: "product", id: i.productId, label, field: "urlThumb" });
  }
  for (const p of posts) {
    add(p.coverImageUrl, { type: "blog", id: p.id, label: p.title, field: "coverImageUrl" });
    add(p.ogImageUrl, { type: "blog", id: p.id, label: p.title, field: "ogImageUrl" });
  }
  for (const b of brands) {
    add(b.logoUrl, { type: "brand", id: b.id, label: b.name, field: "logoUrl" });
  }
  for (const c of cats) {
    add(c.imageUrl, { type: "category", id: c.id, label: c.name, field: "imageUrl" });
  }
  for (const p of prods) {
    add(p.mainImageUrl, { type: "product", id: p.id, label: p.name, field: "mainImageUrl" });
  }
  return map;
}
