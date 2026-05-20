/**
 * Bloque 3 paso h: actualiza 2 RedirectRule existentes para que apunten a
 * URL con filtro de tipo de calzado (creadas en Bloque 2):
 *   /running  → /hombre/calzado?tipo=running   (antes: /hombre/calzado)
 *   /montana  → /hombre/calzado?tipo=trail     (antes: /hombre/calzado)
 *
 * Idempotente: ejecuta varias veces sin duplicar. Solo escribe si el destino
 * actual difiere del esperado. NO toca otras RedirectRule.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/update-redirects-footwear.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/update-redirects-footwear.ts
 */
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

const UPDATES = [
  { from: "/running", to: "/hombre/calzado?tipo=running" },
  { from: "/montana", to: "/hombre/calzado?tipo=trail" },
] as const;

async function main() {
  // Guard de host
  const dbUrl = process.env.DATABASE_URL ?? "";
  const host = dbUrl.match(/@([^/]+)\//)?.[1] ?? "";
  if (!host.includes("still-voice-al8sapxi")) {
    console.error(`STOP — host is NOT dev (${host})`);
    process.exit(1);
  }
  console.log(`OK dev branch (${host})`);

  const p = new PrismaClient();

  console.log(`Modo: ${DRY_RUN ? "DRY-RUN (no escribe)" : "REAL"}`);
  console.log("");

  for (const u of UPDATES) {
    const existing = await p.redirectRule.findUnique({ where: { from: u.from } });
    if (!existing) {
      console.log(`  ⚠  ${u.from} → NO existe RedirectRule (saltado).`);
      continue;
    }
    if (existing.to === u.to) {
      console.log(`  ⤳  ${u.from}: ya apunta a ${u.to} (sin cambio).`);
      continue;
    }
    console.log(`  →  ${u.from}: ${existing.to}  ⟶  ${u.to}`);
    if (!DRY_RUN) {
      await p.redirectRule.update({
        where: { from: u.from },
        data: { to: u.to },
      });
    }
  }

  console.log("");
  console.log(DRY_RUN ? "Dry-run terminado. Para aplicar: ejecuta sin --dry-run." : "Done.");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
