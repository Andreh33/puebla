import { Info } from "lucide-react";

export function AmazonDisclosure() {
  return (
    <aside
      role="note"
      className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">Producto disponible vía Amazon</p>
        <p>
          Como afiliados de Amazon, podemos obtener una pequeña comisión por las
          compras que cumplan los requisitos, sin coste adicional para ti. Esto nos
          ayuda a mantener Zona Sport. Los precios y disponibilidad mostrados pueden
          cambiar; el precio definitivo es el que aparece en Amazon al momento de la
          compra.
        </p>
      </div>
    </aside>
  );
}
