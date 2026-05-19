/**
 * Adaptador XML para Miravia â€” esqueleto.
 *
 * TODO: instalar `fast-xml-parser` y rellenar `fetchCatalog` cuando recibamos
 * el primer feed real del proveedor. Mientras tanto este provider lanza
 * `MiraviaNotConfiguredError` para evitar imports rotos.
 *
 * Estructura esperada (a confirmar con Miravia):
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

import type { MiraviaItem, MiraviaProvider } from "../provider";
import { MiraviaNotConfiguredError } from "../provider";

export interface MiraviaXmlOptions {
  source: string; // path o URL
}

export function createMiraviaXmlProvider(_opts: MiraviaXmlOptions): MiraviaProvider {
  return {
    name: `miravia-xml:${_opts.source}`,
    async *fetchCatalog(): AsyncIterable<MiraviaItem> {
      throw new MiraviaNotConfiguredError(
        "Adaptador XML no implementado. Instala `fast-xml-parser` y completa lib/miravia/adapters/xml.ts.",
      );
      // Marca como generator sin emitir items (unreachable despuÃ©s del throw).
      yield* [] as MiraviaItem[];
    },
  };
}
