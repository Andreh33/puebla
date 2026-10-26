import Image from "next/image";
import { GOOGLE_REVIEW_AUTHORS, GOOGLE_REVIEW_SOURCE, REVIEW_COPY, type ReviewLocale } from "@/data/google-reviews";

function Stars({ value }: { value: number }) {
 return <span className="inline-flex gap-0.5 text-amber-500" aria-hidden="true">{Array.from({length:5},(_,i)=><svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i < value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.38 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.54l6.22-.91L12 3Z"/></svg>)}</span>;
}

/** Server-rendered, no review SDK, no carousel JS and no first-screen network dependency. */
export function GoogleReviews({ locale = "es", compact = false }: { locale?: ReviewLocale; compact?: boolean }) {
 const copy=REVIEW_COPY[locale];
 const score=new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(GOOGLE_REVIEW_SOURCE.rating);
 const reviews=compact ? GOOGLE_REVIEW_AUTHORS.slice(0,1) : GOOGLE_REVIEW_AUTHORS;
 return <section data-google-reviews={compact ? "compact" : "full"} aria-labelledby={`google-reviews-${compact ? "compact" : "full"}-${locale}`} className={`bg-white ${compact ? "border-t border-zs-blue-950/10 py-8" : "py-16 sm:py-20"}`}>
  {!compact && <style>{'body:has([data-google-reviews="full"]) [data-google-reviews="compact"]{display:none}'}</style>}
  <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
   <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
    <div><h2 id={`google-reviews-${compact ? "compact" : "full"}-${locale}`} className={`font-display font-bold tracking-tight text-zs-blue-950 ${compact ? "text-xl" : "text-3xl sm:text-4xl"}`}>{copy.title}</h2>{!compact && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zs-muted">{copy.subtitle}</p>}<p className="mt-3 flex items-center gap-3 text-sm text-zs-blue-950"><strong className="text-lg">{score} / 5</strong><Stars value={5}/><span>Google · {GOOGLE_REVIEW_SOURCE.count}</span></p></div>
    <div className="flex flex-wrap gap-3 text-sm"><a href={GOOGLE_REVIEW_SOURCE.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-zs-blue-950/20 px-5 py-2.5 font-semibold text-zs-blue-950 transition-colors hover:bg-zs-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{copy.all}</a><a href={GOOGLE_REVIEW_SOURCE.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full bg-zs-blue-950 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-zs-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{copy.write}</a></div>
   </div>
   <div className={`mt-6 grid gap-4 ${compact ? "max-w-2xl" : "md:grid-cols-3"}`}>{reviews.map((review,index)=><figure key={review.name} className={`rounded-2xl border border-zs-blue-950/10 bg-zs-surface ${compact ? "p-4" : "p-6"}`}><figcaption className="flex items-center gap-3"><Image unoptimized src={review.photo} alt={`${copy.photo} ${review.name}`} width={36} height={36} loading="lazy" className="size-9 rounded-full"/><div><p className="text-sm font-semibold text-zs-blue-950">{review.name}</p><span className="sr-only">{review.stars} / 5</span><Stars value={review.stars}/></div></figcaption><blockquote className="mt-4 text-sm leading-relaxed text-zs-blue-950">“{copy.quotes[index]}”</blockquote><p className="mt-3 text-xs text-zs-muted">{copy.excerpt}</p></figure>)}</div>
   <p className="mt-4 text-xs leading-relaxed text-zs-muted">{copy.checked}</p>
  </div>
 </section>;
}
