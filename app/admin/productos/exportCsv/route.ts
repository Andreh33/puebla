import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts, type ProductListFilters } from "@/lib/products/queries";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }
  const url = new URL(request.url);

  const filters: ProductListFilters = {
    q: url.searchParams.get("q") ?? undefined,
    source: parseList(url.searchParams.get("source")) as ProductListFilters["source"],
    brandIds: parseList(url.searchParams.get("brand")),
    categoryIds: parseList(url.searchParams.get("category")),
    genders: parseList(url.searchParams.get("gender")) as ProductListFilters["genders"],
    statuses: parseList(url.searchParams.get("status")) as ProductListFilters["statuses"],
    tags: parseList(url.searchParams.get("tag")),
    noImage: url.searchParams.get("noImage") === "1",
    minPrice: url.searchParams.get("minPrice")
      ? Number(url.searchParams.get("minPrice"))
      : undefined,
    maxPrice: url.searchParams.get("maxPrice")
      ? Number(url.searchParams.get("maxPrice"))
      : undefined,
    pageSize: 500,
    page: 1,
  };

  const headers = [
    "id",
    "slug",
    "name",
    "shortName",
    "brand",
    "category",
    "source",
    "externalId",
    "modelCode",
    "colorName",
    "gender",
    "status",
    "retailPrice",
    "salePrice",
    "stock",
    "tags",
    "mainImageUrl",
    "createdAt",
  ];

  // Streaming
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(headers.join(",") + "\n"));

      let page = 1;
      const pageSize = 500;
      let total = 0;
      do {
        filters.page = page;
        filters.pageSize = pageSize;
        const data = await listProducts(filters);
        total = data.total;
        for (const r of data.rows) {
          const line = [
            r.id,
            r.slug,
            r.name,
            r.shortName ?? "",
            r.brand.name,
            r.category.name,
            r.source,
            "", // externalId not in list result; could query if needed
            "",
            r.colorName,
            r.gender,
            r.status,
            r.retailPrice,
            r.salePrice ?? "",
            r.stock,
            r.tags.join("|"),
            r.mainImageUrl ?? "",
            r.createdAt.toISOString(),
          ].map(csvEscape).join(",");
          controller.enqueue(encoder.encode(line + "\n"));
        }
        if (data.rows.length < pageSize) break;
        page += 1;
        if (page > 200) break; // hard cap
      } while ((page - 1) * pageSize < total);

      controller.close();
    },
  });

  // Touch db import to avoid unused-warning (we may want to enrich rows later)
  void db;

  const filename = `productos-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
