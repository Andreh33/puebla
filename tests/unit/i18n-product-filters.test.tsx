import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({push: vi.fn()}), usePathname: () => "/fr/catalogo", useSearchParams: () => new URLSearchParams("talla=M") }));
vi.mock("@/components/ui/sheet", () => ({ Sheet: ({children}: any) => children, SheetContent: ({children}: any) => children, SheetHeader: ({children}: any) => children, SheetTitle: ({children}: any) => children, SheetTrigger: ({children}: any) => children }));
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { ProductFilters } from "@/components/public/ProductFilters";
it("renders French gender, garment, size chip, apply count and accessible group labels", () => {
 vi.stubGlobal("React", React);
 const dictionary = new Proxy({ "Hombre": "Homme", "Camisetas": "T-shirts", "Aplicar ({0})": "Appliquer ({0})", "Talla {0}": "Taille {0}", "Contraer filtro {0}": "Réduire le filtre {0}" } as Record<string,string>, {get: (target,key: string) => target[key] ?? `FR ${key}`});
 const html = renderToStaticMarkup(<LocaleProvider locale="fr" dictionary={dictionary}><ProductFilters resultsCount={17} showGarmentFilter data={{brands:[],genders:[{value:"HOMBRE",label:"Hombre",count:1}],colors:[],sizes:[{value:"M",label:"M",count:1}],garmentTypes:[{value:"camiseta",label:"Camisetas",count:1}],priceMin:0,priceMax:100}} /></LocaleProvider>);
 expect(html).toContain("Homme"); expect(html).toContain("T-shirts"); expect(html).toContain("Appliquer (17)"); expect(html).toContain("Taille M"); expect(html).toContain("Réduire le filtre"); expect(html).not.toContain("Aplicar (17)");
 vi.unstubAllGlobals();
});
