/**
 * Crea (o actualiza) un usuario administrador SIN tocar los existentes.
 *
 * Idempotente: hace `upsert` por email, así que se puede ejecutar las veces
 * que haga falta sin duplicar. Si el email ya existe, **sólo** actualiza la
 * contraseña (deja intactos name, role, isActive, etc.). Si no existe, lo crea
 * con los datos por defecto.
 *
 * Valores por defecto (el técnico que pidió el cliente):
 *   email:    tecnico@admin.com
 *   password: handres1            (hasheada con bcrypt, coste 12 — igual que el seed)
 *   role:     OWNER
 *   name:     Técnico
 *
 * Se pueden sobreescribir por entorno sin tocar el código:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE (OWNER|EDITOR)
 *
 * Ejecutar:  npm run create:admin
 *   (usa tsx --env-file=.env.local, necesita un DATABASE_URL accesible)
 *
 * ⚠️ En este proyecto DATABASE_URL es Sensitive en Vercel y no se pulla a
 * local, así que para crear el usuario en PRODUCCIÓN hay dos opciones:
 *   a) poner un DATABASE_URL válido (p.ej. una rama de Neon) en .env.local y
 *      lanzar este script;
 *   b) ejecutarlo dentro de un entorno con la env var ya descifrada.
 * Nunca borra ni modifica el admin actual.
 */

import { PrismaClient, type AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const EMAIL = (process.env.ADMIN_EMAIL || "tecnico@admin.com").toLowerCase().trim();
const PASSWORD = process.env.ADMIN_PASSWORD || "handres1";
const NAME = process.env.ADMIN_NAME || "Técnico";
const ROLE = (process.env.ADMIN_ROLE || "OWNER") as AdminRole;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "\x1b[31m✗ DATABASE_URL no está configurada.\x1b[0m\n" +
        "  Pon un DATABASE_URL válido en .env.local (p.ej. una rama de Neon) y reintenta.",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const existing = await db.adminUser.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  });

  await db.adminUser.upsert({
    where: { email: EMAIL },
    // Email ya existe → SÓLO se actualiza la contraseña (no tocamos name/role/
    // isActive para no pisar cambios hechos a mano en el panel).
    update: { passwordHash },
    create: {
      email: EMAIL,
      passwordHash,
      name: NAME,
      role: ROLE,
      isActive: true,
    },
  });

  if (existing) {
    console.log(`✓ Admin existente '${EMAIL}': contraseña actualizada (resto de campos intactos).`);
  } else {
    console.log(`✓ Admin creado: ${EMAIL} · role ${ROLE} · name "${NAME}".`);
  }

  const total = await db.adminUser.count();
  console.log(`  Total de administradores en la BD: ${total} (ninguno fue borrado).`);
}

main()
  .catch((e) => {
    console.error("\x1b[31m✗ create-admin falló:\x1b[0m", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
