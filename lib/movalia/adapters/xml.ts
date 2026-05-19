/**
 * Adaptador XML para Movalia — esqueleto.
 *
 * TODO: instalar `fast-xml-parser` y rellenar `fetchCatalog` cuando recibamos
 * el primer feed real del proveedor. Mientras tanto este provider lanza
 * `MovaliaNotConfiguredError` para evitar imports rotos.
 *
 * Estructura esperada (a confirmar con Movalia):
 *   <catalog>
 *     <product id="...">
 *       <name>...</name>
 *       <brand>...</brand>
 *       <category>...</category>
 *       <color name="..." hex="..."/>
 *       <prices retail="29.95" cost="14.50"/>
 *       <sizes>
 *         <size value="M" ean="..." stock="3"/>
 *         ...
 *       </sizes>
 *       <images>
 *         <image url="..."/>
 *       </images>
 *     </product>
 *   </catalog>
 */

import type { MovaliaItem, MovaliaProvider } from "../provider";
import { MovaliaNotConfiguredError } from "../provider";

export interface MovaliaXmlOptions {
  source: string; // path o URL
}

export function createMovaliaXmlProvider(_opts: MovaliaXmlOptions): MovaliaProvider {
  return {
    name: `movalia-xml:${_opts.source}`,
    async *fetchCatalog(): AsyncIterable<MovaliaItem> {
      throw new MovaliaNotConfiguredError(
        "Adaptador XML no implementado. Instala `fast-xml-parser` y completa lib/movalia/adapters/xml.ts.",
      );
      // Marca como generator sin emitir items (unreachable después del throw).
      yield* [] as MovaliaItem[];
    },
  };
}
