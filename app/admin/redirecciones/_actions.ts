"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateRedirectCache } from "@/lib/redirects";

const RuleSchema = z.object({
  from: z
    .string()
    .min(1, "Ruta origen requerida")
    .startsWith("/", "Debe empezar con /")
    .max(500),
  to: z.string().min(1, "Destino requerido").max(2000),
  type: z.coerce.number().int().refine((n) => n === 301 || n === 302, {
    message: "El tipo debe ser 301 o 302",
  }),
  isActive: z.coerce.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export type RuleInput = z.infer<typeof RuleSchema>;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session.user;
}

function bust() {
  // Invalida tanto la cache de unstable_cache como la local del edge.
  revalidateTag("redirects");
  invalidateRedirectCache();
}

export async function createRedirect(input: RuleInput) {
  await requireAdmin();
  const data = RuleSchema.parse(input);
  const exists = await db.redirectRule.findUnique({ where: { from: data.from } });
  if (exists) throw new Error(`Ya existe una regla para ${data.from}`);
  await db.redirectRule.create({ data });
  bust();
  return { ok: true };
}

export async function updateRedirect(id: string, input: RuleInput) {
  await requireAdmin();
  const data = RuleSchema.parse(input);
  await db.redirectRule.update({ where: { id }, data });
  bust();
  return { ok: true };
}

export async function deleteRedirect(id: string) {
  await requireAdmin();
  await db.redirectRule.delete({ where: { id } });
  bust();
  return { ok: true };
}

export async function toggleRedirect(id: string, isActive: boolean) {
  await requireAdmin();
  await db.redirectRule.update({ where: { id }, data: { isActive } });
  bust();
  return { ok: true };
}

/**
 * Importa un CSV simple con cabeceras: from,to,type,isActive,notes
 * Filas vacías o inválidas se ignoran y se reportan en `skipped`.
 */
export async function importRedirectsCsv(csv: string) {
  await requireAdmin();
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { created: 0, skipped: 0, errors: ["CSV vacío"] };
  const headerLine = lines[0]!;
  const header = headerLine.split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iFrom = idx("from");
  const iTo = idx("to");
  const iType = idx("type");
  const iActive = idx("isactive");
  const iNotes = idx("notes");
  if (iFrom === -1 || iTo === -1) {
    return { created: 0, skipped: 0, errors: ["Faltan columnas obligatorias from,to"] };
  }
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const cols = line.split(",").map((c) => c.trim());
    try {
      const parsed = RuleSchema.parse({
        from: cols[iFrom],
        to: cols[iTo],
        type: iType >= 0 ? cols[iType] || 301 : 301,
        isActive: iActive >= 0 ? (cols[iActive] ?? "true") !== "false" : true,
        notes: iNotes >= 0 ? cols[iNotes] || null : null,
      });
      await db.redirectRule.upsert({
        where: { from: parsed.from },
        create: parsed,
        update: parsed,
      });
      created++;
    } catch (err) {
      skipped++;
      errors.push(`Línea ${i + 1}: ${(err as Error).message}`);
    }
  }
  bust();
  return { created, skipped, errors: errors.slice(0, 20) };
}
