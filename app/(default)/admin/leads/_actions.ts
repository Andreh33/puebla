"use server";

/**
 * Server actions del CRM de leads.
 *
 * Todas requieren sesión admin y revalidan /admin/leads tras la mutación.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LeadStatus } from "@prisma/client";

type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

const StatusSchema = z.enum(["NEW", "CONTACTED", "CLOSED", "SPAM"]);

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<ActionResult> {
  try {
    await requireSession();
    if (!StatusSchema.safeParse(status).success) {
      return { ok: false, error: "Estado inválido" };
    }
    await db.lead.update({ where: { id }, data: { status } });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export async function updateLeadNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  try {
    await requireSession();
    await db.lead.update({
      where: { id },
      data: { notes: notes.slice(0, 5000) },
    });
    revalidatePath(`/admin/leads/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export async function markLeadAsSpam(id: string): Promise<ActionResult> {
  return updateLeadStatus(id, "SPAM");
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    await requireSession();
    await db.lead.delete({ where: { id } });
    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Anonimización RGPD: sustituye name/email/phone por placeholders y cierra el lead.
 * Mantiene el lead para conservar contabilidad pero elimina los PII.
 */
export async function anonymizeLead(id: string): Promise<ActionResult> {
  try {
    await requireSession();
    await db.lead.update({
      where: { id },
      data: {
        name: "<anonimizado>",
        email: `anon-${id}@anonimizado.invalid`,
        phone: null,
        ipAddress: null,
        userAgent: null,
        status: "CLOSED",
        notes: "Lead anonimizado bajo petición RGPD.",
      },
    });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Exporta leads filtrados a CSV. Devuelve string crudo para que el cliente
 * lo descargue con `Blob`/`a[download]`.
 */
export interface ExportFilters {
  q?: string;
  status?: LeadStatus | "ALL";
  from?: string; // ISO date
  to?: string;
}

export async function exportLeadsCsv(filters: ExportFilters = {}): Promise<
  ActionResult<{ filename: string; csv: string }>
> {
  try {
    await requireSession();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q } },
        { message: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const rows = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        sourcePage: true,
        status: true,
        createdAt: true,
      },
    });

    const header = [
      "id",
      "fecha",
      "estado",
      "nombre",
      "email",
      "telefono",
      "origen",
      "mensaje",
    ];

    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.createdAt.toISOString(),
          r.status,
          r.name,
          r.email,
          r.phone ?? "",
          r.sourcePage ?? "",
          r.message.replace(/\r?\n/g, " "),
        ]
          .map(esc)
          .join(","),
      );
    }
    const csv = lines.join("\n");
    const filename = `zonasport-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    return { ok: true, data: { filename, csv } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}
