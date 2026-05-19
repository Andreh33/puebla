import "server-only";

import { db } from "@/lib/db";
import type { ImportSource, ImportStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ProductCounts = {
  total: number;
  active: number;
  draft: number;
  inactive: number;
  outOfStock: number;
  withoutImage: number;
  byBrand: Array<{ brandId: string; brandName: string; count: number }>;
  bySource: Array<{ source: "LOCAL" | "MIRAVIA" | "AMAZON"; count: number }>;
};

export type RecentLeads = {
  count: number;
  items: Array<{
    id: string;
    name: string;
    email: string;
    sourcePage: string | null;
    status: "NEW" | "CONTACTED" | "CLOSED" | "SPAM";
    createdAt: Date;
  }>;
  dailyChart: Array<{ date: string; count: number }>;
};

export type RecentImport = {
  id: string;
  source: ImportSource;
  status: ImportStatus;
  fileName: string | null;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  errorRows: number;
  createdAt: Date;
  finishedAt: Date | null;
};

export type BlogStats = {
  published: number;
  draft: number;
  recent: Array<{
    id: string;
    title: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: Date | null;
    updatedAt: Date;
  }>;
};

export type SettingsAlert = {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  href?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export async function getProductCounts(): Promise<ProductCounts> {
  try {
    const [total, active, draft, inactive, outOfStock, withoutImage, brandsAgg, sourceAgg] =
      await Promise.all([
        db.product.count(),
        db.product.count({ where: { status: "ACTIVE" } }),
        db.product.count({ where: { status: "DRAFT" } }),
        db.product.count({ where: { status: "INACTIVE" } }),
        db.product.count({ where: { status: "OUT_OF_STOCK" } }),
        db.product.count({ where: { mainImageUrl: null } }),
        db.product.groupBy({
          by: ["brandId"],
          _count: { _all: true },
          orderBy: { _count: { brandId: "desc" } },
          take: 5,
        }),
        db.product.groupBy({
          by: ["source"],
          _count: { _all: true },
        }),
      ]);

    const brandIds = brandsAgg.map((b) => b.brandId);
    const brands = brandIds.length
      ? await db.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true },
        })
      : [];
    const brandMap = new Map(brands.map((b) => [b.id, b.name]));

    return {
      total,
      active,
      draft,
      inactive,
      outOfStock,
      withoutImage,
      byBrand: brandsAgg.map((b) => ({
        brandId: b.brandId,
        brandName: brandMap.get(b.brandId) ?? "â€”",
        count: b._count._all,
      })),
      bySource: sourceAgg.map((s) => ({
        source: s.source,
        count: s._count._all,
      })),
    };
  } catch {
    return {
      total: 0,
      active: 0,
      draft: 0,
      inactive: 0,
      outOfStock: 0,
      withoutImage: 0,
      byBrand: [],
      bySource: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function getRecentLeads(days = 7): Promise<RecentLeads> {
  try {
    const since = daysAgo(days - 1);
    const [count, items, daily] = await Promise.all([
      db.lead.count({ where: { createdAt: { gte: since } } }),
      db.lead.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          sourcePage: true,
          status: true,
          createdAt: true,
        },
      }),
      db.lead.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    // Construye serie diaria continua (rellena días sin leads con 0)
    const bucket = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      bucket.set(isoDay(d), 0);
    }
    for (const l of daily) {
      const k = isoDay(l.createdAt);
      bucket.set(k, (bucket.get(k) ?? 0) + 1);
    }
    const dailyChart = Array.from(bucket.entries()).map(([date, c]) => ({
      date,
      count: c,
    }));

    return { count, items, dailyChart };
  } catch {
    return { count: 0, items: [], dailyChart: [] };
  }
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

export async function getRecentImports(limit = 5): Promise<RecentImport[]> {
  try {
    const rows = await db.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        source: true,
        status: true,
        fileName: true,
        totalRows: true,
        createdRows: true,
        updatedRows: true,
        errorRows: true,
        createdAt: true,
        finishedAt: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export async function getBlogStats(): Promise<BlogStats> {
  try {
    const [published, draft, recent] = await Promise.all([
      db.blogPost.count({ where: { status: "PUBLISHED" } }),
      db.blogPost.count({ where: { status: "DRAFT" } }),
      db.blogPost.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
    ]);
    return { published, draft, recent };
  } catch {
    return { published: 0, draft: 0, recent: [] };
  }
}

// ---------------------------------------------------------------------------
// Alertas de configuración
// ---------------------------------------------------------------------------

type NapValue = {
  legalName?: string;
  cif?: string;
  phone?: string;
  email?: string;
  streetAddress?: string;
  postalCode?: string;
  locality?: string;
};

export async function getSettingsAlerts(): Promise<SettingsAlert[]> {
  const alerts: SettingsAlert[] = [];
  try {
    const [productsNoMeta, productsNoImage, brandsNoLogo, nap] = await Promise.all([
      db.product.count({
        where: {
          status: "ACTIVE",
          OR: [{ metaDescription: null }, { metaDescription: "" }],
        },
      }),
      db.product.count({ where: { mainImageUrl: null } }),
      db.brand.count({ where: { OR: [{ logoUrl: null }, { logoUrl: "" }] } }),
      db.setting.findUnique({ where: { key: "store.nap" } }),
    ]);

    if (productsNoImage > 0) {
      alerts.push({
        id: "products-no-image",
        severity: productsNoImage > 50 ? "warning" : "info",
        title: `${productsNoImage} productos sin imagen principal`,
        description:
          "Los productos sin imagen no pueden publicarse. Sube imágenes desde la ficha o usa el emparejado por código.",
        href: "/admin/productos?noImage=1",
      });
    }
    if (productsNoMeta > 0) {
      alerts.push({
        id: "products-no-meta",
        severity: "info",
        title: `${productsNoMeta} productos activos sin meta description`,
        description:
          "Los productos sin meta description pierden CTR en buscadores. Revísalos en el listado.",
        href: "/admin/productos?status=ACTIVE",
      });
    }
    if (brandsNoLogo > 0) {
      alerts.push({
        id: "brands-no-logo",
        severity: "info",
        title: `${brandsNoLogo} marcas sin logo`,
        description: "Sube el logo de marca para que aparezca en cabecera, fichas y SEO.",
        href: "/admin/marcas",
      });
    }

    const napValue = (nap?.value ?? null) as NapValue | null;
    if (
      !napValue ||
      !napValue.cif ||
      !napValue.phone ||
      !napValue.email ||
      !napValue.streetAddress
    ) {
      alerts.push({
        id: "nap-incomplete",
        severity: "warning",
        title: "Configuración de empresa (NAP) incompleta",
        description:
          "Completa CIF, teléfono, email y dirección en Ajustes para cumplir RGPD y mejorar el SEO local.",
        href: "/admin/ajustes",
      });
    }
  } catch {
    // si la DB no está disponible, no devolver alertas (no romper dashboard)
  }
  return alerts;
}
