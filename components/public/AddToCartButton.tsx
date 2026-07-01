"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/lib/cart/use-cart";
import { itemKey } from "@/lib/cart/store";
import { cn } from "@/lib/utils";

export type AddToCartProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  colorName: string;
  price: number;
  /** SKU/referencia del producto — viaja al mensaje de WhatsApp de reserva. */
  sku?: string | null;
};

type Props = {
  product: AddToCartProduct;
  selectedSize: string | null;
  /** Si true, no aceptamos null como talla — bloqueamos hasta que elija. */
  requiresSize: boolean;
  /**
   * Stock disponible de la talla seleccionada. Si ya está en el carrito al
   * máximo, no dejamos añadir más (evita que el checkout rechace luego).
   * `null`/`undefined` = desconocido → sin tope.
   */
  maxStock?: number | null;
  className?: string;
  /** Texto a mostrar (por defecto "Añadir al carrito"). */
  label?: string;
};

export function AddToCartButton({
  product,
  selectedSize,
  requiresSize,
  maxStock,
  className,
  label = "Añadir al carrito",
}: Props) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const blocked = requiresSize && !selectedSize;

  const handleAdd = () => {
    if (blocked) {
      toast.info("Selecciona una talla para continuar.");
      return;
    }
    // Tope de stock: si ya tenemos en el carrito todas las unidades que hay de
    // esta talla, avisamos en vez de añadir (el checkout lo rechazaría igual).
    if (maxStock != null) {
      const inCart =
        items.find(
          (i) => itemKey(i.productId, i.size) === itemKey(product.id, selectedSize),
        )?.qty ?? 0;
      if (inCart >= maxStock) {
        toast.error(
          maxStock === 1
            ? "Solo queda 1 unidad de esta talla y ya la tienes en el carrito."
            : `Solo quedan ${maxStock} unidades de esta talla y ya las tienes en el carrito.`,
        );
        return;
      }
    }
    const item: CartItem = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      colorName: product.colorName,
      size: selectedSize,
      price: product.price,
      sku: product.sku ?? undefined,
      maxStock: maxStock ?? undefined,
      qty: 1,
      addedAt: Date.now(),
    };
    addItem(item);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);

    const sizeLabel =
      selectedSize && selectedSize.toUpperCase() !== "ÚNICA"
        ? ` (talla ${selectedSize})`
        : "";
    toast.success(`${product.name}${sizeLabel} añadido al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => {
          window.location.href = "/carrito";
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-disabled={blocked}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
        blocked
          ? "cursor-not-allowed bg-zs-blue-900/40 text-white"
          : justAdded
            ? "bg-emerald-600 text-white"
            : "bg-zs-blue-900 text-white hover:bg-zs-blue-800 active:scale-[0.98]",
        className,
      )}
    >
      {justAdded ? (
        <>
          <Check className="h-5 w-5" /> Añadido
        </>
      ) : (
        <>
          <ShoppingBag className="h-5 w-5" /> {label}
        </>
      )}
    </button>
  );
}
