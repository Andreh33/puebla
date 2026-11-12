import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { posts } from '../data/editorial/2026-11-12-ciudades.mjs';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const slugs = posts.map(p => p.slug);
if (posts.length !== 4 || new Set(slugs).size !== 4) throw Error('Expected four unique posts');
for (const p of posts) {
  if (p.contentMd.split(/\s+/).length < 400 || /^# /m.test(p.contentMd)) throw Error(`Invalid content: ${p.slug}`);
  if (!p.contentMd.includes('Puebla de la Calzada') || !p.title.includes('online')) throw Error('Missing online location disclosure');
}
try {
  const all = await db.blogPost.findMany({ orderBy: { id: 'asc' } });
  console.log(JSON.stringify({ mode: process.argv.includes('--publish') ? 'publish' : 'check', existing: all.length, collisions: all.filter(p=>slugs.includes(p.slug)).map(p=>p.slug), articles: posts.map(p=>({slug:p.slug,words:p.contentMd.split(/\s+/).length})) }));
  if (!process.argv.includes('--publish')) process.exitCode = 0;
  else {
    if (process.env.VERCEL_ENV !== 'production') throw Error('Production env required');
    const outcome = await db.$transaction(async tx => {
      const old = await tx.blogPost.findMany({where:{slug:{notIn:slugs}},orderBy:{id:'asc'}});
      let created=0;
      for (const p of posts) {
        const current=await tx.blogPost.findUnique({where:{slug:p.slug}});
        if(current){if(current.contentMd!==p.contentMd||current.title!==p.title)throw Error('Existing slug differs');continue;}
        await tx.blogPost.create({data:{...p,author:'Equipo Zona Sport',status:'PUBLISHED',publishedAt:new Date()}});
        created++;
      }
      const after=await tx.blogPost.findMany({where:{slug:{notIn:slugs}},orderBy:{id:'asc'}});
      if(digest(old)!==digest(after))throw Error('Pre-existing articles changed');
      return {created,preserved:old.length,preservedHash:digest(old)};
    },{timeout:30000});
    console.log(JSON.stringify(outcome));
    const response=await fetch('https://zonasportpuebla.com/api/revalidate',{method:'POST',headers:{authorization:`Bearer ${process.env.CRON_SECRET}`,'content-type':'application/json'},body:JSON.stringify({path:['/blog',...slugs.map(s=>'/blog/'+s)],tag:['sitemap']})});
    console.log(JSON.stringify({revalidateStatus:response.status,result:await response.json()}));
    if (!process.env.VERCEL) await writeFile('H:/Proyectos/_organizacion/ZonaSport-publicacion-ciudades-20261112.json',JSON.stringify({date:new Date().toISOString(),...outcome,slugs,revalidateStatus:response.status},null,2));
  }
} finally { await db.$disconnect(); }
