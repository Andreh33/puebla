import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { getRequestLocale } from "@/lib/i18n/request";
const COPY={
 es:{title:"Aquí no hay nada deportivo",body:"La página que buscas no existe o fue movida. Prueba a buscar lo que necesitas o vuelve a la portada.",home:"Volver al inicio",contact:"Contactar con la tienda"},
 pt:{title:"Esta página não está disponível",body:"A página que procura não existe ou foi movida. Procure o que precisa ou volte à página inicial.",home:"Voltar ao início",contact:"Contactar a loja"},
 it:{title:"Questa pagina non è disponibile",body:"La pagina che cerchi non esiste o è stata spostata. Cerca ciò che ti serve oppure torna alla pagina iniziale.",home:"Torna alla pagina iniziale",contact:"Contatta il negozio"},
 fr:{title:"Cette page n’est pas disponible",body:"La page recherchée n’existe pas ou a été déplacée. Recherchez ce dont vous avez besoin ou revenez à l’accueil.",home:"Retour à l’accueil",contact:"Contacter le magasin"},
 de:{title:"Diese Seite ist nicht verfügbar",body:"Die gesuchte Seite existiert nicht oder wurde verschoben. Suche nach dem gewünschten Inhalt oder gehe zur Startseite zurück.",home:"Zur Startseite",contact:"Geschäft kontaktieren"},
} as const;
export default function NotFound(){
 const copy=COPY[getRequestLocale()];
 return <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
  <p className="text-sm font-semibold uppercase tracking-wide text-zs-red-600">404</p>
  <h1 className="mt-3 text-4xl font-bold tracking-tight text-zs-blue-900 sm:text-5xl">{copy.title}</h1>
  <p className="mt-4 max-w-xl text-balance text-base text-zs-muted">{copy.body}</p>
  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
   <Link href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800">{copy.home}</Link>
   <Link href="/contacto" className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-ink hover:bg-zs-surface">{copy.contact}</Link>
  </div>
 </main>;
}
