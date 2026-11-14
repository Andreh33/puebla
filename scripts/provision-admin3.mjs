import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const passwordHash = process.env.ZS_ADMIN3_INITIAL_HASH;
if (passwordHash) {
  if (process.env.VERCEL_ENV !== 'production' || !/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    throw new Error('Invalid admin provisioning context');
  }
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  try {
    const result = await db.$transaction(async tx => {
      const before = await tx.adminUser.findMany({ orderBy: { id: 'asc' } });
      if (before.some(user => user.email === 'admin3')) throw new Error('admin3 already exists; no account changed');
      const created = await tx.adminUser.create({ data: {
        email: 'admin3', name: 'admin3', passwordHash, role: 'OWNER', isActive: true,
      } });
      const after = await tx.adminUser.findMany({ where: { id: { not: created.id } }, orderBy: { id: 'asc' } });
      if (digest(before) !== digest(after)) throw new Error('Existing accounts changed; rolling back');
      return { created: true, username: created.email, role: created.role, preservedAccounts: before.length };
    }, { timeout: 30000, isolationLevel: 'Serializable' });
    console.log('[admin3-provision]', JSON.stringify(result));
  } finally { await db.$disconnect(); }
}
